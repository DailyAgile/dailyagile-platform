/**
 * POST /api/student/quiz/[quizId]/answer
 *
 * Submit a single answer for a question.
 * Returns: { questionId, saved: true }
 * Input validated: Zod schema (prevents large payloads, XSS)
 *
 * Validation:
 * - Submission must exist and be in-progress
 * - No grading yet (batch grade on submit)
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { submitAnswerSchema } from '@/lib/server/validation-schemas';
import type { SubmitAnswerResponse } from '@/lib/student/types';

const log = createLogger('API:SubmitAnswer');

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

    const body = await req.json();

    // Validate request body with Zod (prevents large payloads, XSS)
    const validation = submitAnswerSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      log.warn('Answer validation error:', errors.fieldErrors);
      return apiError(
        'VALIDATION_ERROR',
        400,
        'Invalid answer',
        JSON.stringify(errors.fieldErrors)
      );
    }

    const { attemptId, questionId, answer: studentAnswer } = validation.data;

    const supabase = getSupabaseClient();

    // Verify submission exists and belongs to student
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .select('id, status')
      .eq('id', attemptId)
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .single();

    if (submissionError || !submission) {
      return apiError('NOT_FOUND', 404, 'Quiz attempt not found');
    }

    if (submission.status !== 'in_progress') {
      return apiError(
        'FORBIDDEN',
        403,
        'Cannot submit answers to a completed quiz'
      );
    }

    // Verify question belongs to quiz
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id')
      .eq('id', questionId)
      .single();

    if (questionError || !question || question.quiz_id !== quizId) {
      return apiError('QUESTION_NOT_FOUND', 404, 'Question not found');
    }

    // Update answer
    const { error: updateError } = await supabase
      .from('quiz_answers')
      .update({
        student_answer: studentAnswer,
        updated_at: new Date().toISOString(),
      })
      .eq('submission_id', attemptId)
      .eq('question_id', questionId);

    if (updateError) {
      log.error('Error saving answer:', updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to save answer');
    }

    const response: SubmitAnswerResponse = {
      questionId,
      saved: true,
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Submit answer error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to save answer');
  }
}
