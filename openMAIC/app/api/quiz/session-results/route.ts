/**
 * Student Quiz Results
 * GET /api/quiz/session-results?session_id=X
 * Student views their result for a specific quiz session
 */

import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('SessionResultsRoute');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION
    let user;
    try {
      user = await requireAuth(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'session_id query parameter is required'
      );
    }

    const supabase = getSupabaseClient();

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(
        `
        *,
        quizzes!inner(
          id,
          title,
          pass_threshold,
          total_points
        )
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return apiError(
        'SESSION_NOT_FOUND',
        404,
        'Session not found'
      );
    }

    // 🔍 AUTHORIZATION: Student can only view their own results
    if (session.student_id !== 'guest-session' && session.student_id !== user.id) {
      log.warn(`Unauthorized session access: ${user.id} vs ${session.student_id}`);
      return apiError(
        'FORBIDDEN',
        403,
        'You do not have permission to view this result'
      );
    }

    // Get answers
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_id', { ascending: true });

    if (answersError) {
      log.error('Error fetching answers:', answersError);
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to fetch results'
      );
    }

    log.info(`Student viewing results for session ${sessionId}`);

    // Build detailed answer breakdown
    const answerBreakdown = (answers || []).map((a: any) => ({
      question_id: a.question_id,
      question_text: a.question_text,
      user_answer: a.user_answer,
      correct_answer: a.correct_answer,
      is_correct: a.is_correct,
      points_earned: a.points_earned,
      max_points: a.max_points,
      feedback: a.feedback,
      time_spent_seconds: a.time_spent_seconds,
    }));

    return apiSuccess({
      data: {
        session_id: sessionId,
        quiz_title: session.quizzes[0]?.title,
        status: session.status,
        attempt_number: session.attempt_number,
        started_at: session.started_at,
        completed_at: session.completed_at,
        score: {
          earned: session.total_score,
          max: session.max_score,
          percentage: session.percentage,
          pass_threshold: session.quizzes[0]?.pass_threshold,
          is_passed: session.is_passed,
        },
        answers: answerBreakdown,
        statistics: {
          total_questions: answerBreakdown.length,
          correct_answers: answerBreakdown.filter((a: any) => a.is_correct).length,
          incorrect_answers: answerBreakdown.filter((a: any) => !a.is_correct).length,
          total_time_minutes: Math.round(
            (answerBreakdown.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0)) / 60
          ),
        },
      },
    });
  } catch (error) {
    log.error('Error in GET /api/quiz/session-results:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
