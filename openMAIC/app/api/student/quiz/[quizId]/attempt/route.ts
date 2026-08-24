/**
 * POST /api/student/quiz/[quizId]/attempt
 *
 * Create new quiz attempt for student.
 * Returns: { attemptId, quizId, startedAt }
 *
 * Validation:
 * - Student must have access to quiz
 * - Cannot have multiple in-progress attempts on same quiz
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { checkQuizAccess } from '@/lib/student/access-control';
import type { StartAttemptResponse } from '@/lib/student/types';

const log = createLogger('API:StartAttempt');

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const { quizId } = await params;

    if (!quizId) {
      return apiError('MISSING_PARAM', 400, 'quizId is required');
    }

    const supabase = getSupabaseClient();

    // Verify quiz exists
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return apiError('QUIZ_NOT_FOUND', 404, 'Quiz not found');
    }

    // Check access
    const access = await checkQuizAccess(studentId, quizId, supabase);
    if (!access.hasAccess) {
      return apiError('FORBIDDEN', 403, access.message || 'No access to quiz');
    }

    if (!access.canRetry) {
      return apiError('FORBIDDEN', 403, 'Retry limit reached for this quiz');
    }

    // Check for existing in-progress attempt
    const { data: existing, error: existingError } = await supabase
      .from('quiz_submissions')
      .select('id')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .eq('status', 'in_progress')
      .single();

    if (!existingError && existing) {
      return apiError(
        'CONFLICT',
        409,
        'Already have an in-progress attempt on this quiz'
      );
    }

    // Fetch quiz questions to pre-create answer records
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, points_max')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError || !questions) {
      log.error('Error fetching quiz questions:', questionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to load quiz questions');
    }

    const now = new Date().toISOString();

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .insert({
        student_id: studentId,
        quiz_id: quizId,
        classroom_id: '00000000-0000-0000-0000-000000000000', // Default for self-paced
        status: 'in_progress',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (submissionError || !submission) {
      log.error('Error creating submission:', submissionError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to start quiz');
    }

    // Pre-create answer records (empty, to be filled in)
    const answerRecords = questions.map((q: any) => ({
      submission_id: submission.id,
      question_id: q.id,
      question_text: '', // Will be fetched by frontend
      student_answer: null,
      correct_answer: null,
      is_correct: null,
      points_earned: null,
      max_points: q.points_max,
      feedback: null,
      question_type: 'multiple_choice',
      created_at: now,
    }));

    if (answerRecords.length > 0) {
      const { error: answersError } = await supabase
        .from('quiz_answers')
        .insert(answerRecords);

      if (answersError) {
        log.warn('Error creating answer records:', answersError);
        // Don't fail the entire request
      }
    }

    const response: StartAttemptResponse = {
      attemptId: submission.id,
      quizId,
      startedAt: now,
    };

    log.info(`Student ${studentId} started attempt on quiz ${quizId}`);
    return apiSuccess(response, 201);
  } catch (error) {
    log.error('Start attempt error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to start quiz attempt');
  }
}
