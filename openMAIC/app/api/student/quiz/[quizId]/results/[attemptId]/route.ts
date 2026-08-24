/**
 * GET /api/student/quiz/[quizId]/results/[attemptId]
 *
 * Fetch detailed quiz results including answers and feedback.
 * Returns: { attemptId, quizId, score, passed, timeSpent, answers, detailedFeedback }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { canAccessSubmission } from '@/lib/student/access-control';
import type { QuizResultsResponse } from '@/lib/student/types';

const log = createLogger('API:QuizResults');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const { quizId, attemptId } = await params;

    if (!quizId || !attemptId) {
      return apiError('MISSING_PARAM', 400, 'quizId and attemptId are required');
    }

    const supabase = getSupabaseClient();

    // Verify access to this submission
    const hasAccess = await canAccessSubmission(studentId, attemptId, supabase);
    if (!hasAccess) {
      return apiError('FORBIDDEN', 403, 'Cannot access this submission');
    }

    // Fetch submission
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('id', attemptId)
      .eq('quiz_id', quizId)
      .single();

    if (submissionError || !submission) {
      return apiError('NOT_FOUND', 404, 'Quiz attempt not found');
    }

    if (submission.status !== 'graded') {
      return apiError('CONFLICT', 409, 'Quiz has not been graded yet');
    }

    // Fetch all answers with question details
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select(
        `
        id,
        question_id,
        question_text,
        student_answer,
        correct_answer,
        is_correct,
        points_earned,
        max_points,
        feedback,
        question_type,
        quizzes_questions:question_id(difficulty, explanation)
      `
      )
      .eq('submission_id', attemptId);

    if (answersError) {
      log.error('Error fetching answers:', answersError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch results');
    }

    const answersList = (answers || []).map((a: any) => ({
      questionId: a.question_id,
      questionText: a.question_text,
      studentAnswer: a.student_answer,
      correctAnswer: a.correct_answer,
      isCorrect: a.is_correct,
      pointsEarned: a.points_earned,
      maxPoints: a.max_points,
      difficulty: a.quizzes_questions?.difficulty || 'medium',
      feedback: a.feedback || 'No feedback available',
    }));

    // Generate detailed feedback for weak areas
    const detailedFeedback = answersList
      .filter((a: any) => !a.isCorrect)
      .map((a: any) => ({
        questionId: a.questionId,
        explanation: a.feedback,
        relatedTopics: [], // Would fetch from database
      }));

    const response: QuizResultsResponse = {
      attemptId,
      quizId,
      score: submission.percentage,
      passed: submission.percentage >= 70,
      timeSpent: submission.time_spent_seconds || 0,
      answers: answersList,
      detailedFeedback,
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Quiz results error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch results');
  }
}
