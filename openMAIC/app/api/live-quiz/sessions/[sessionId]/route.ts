/**
 * GET /api/live-quiz/sessions/{sessionId}
 * Get session info for instructor host page
 * REQUIRES: Instructor authentication (JWT token)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     sessionId: string (UUID),
 *     joinCode: string (8-char alphanumeric),
 *     quizTitle: string,
 *     totalQuestions: number
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizSessionInfo');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { sessionId } = await params;

    if (!sessionId || typeof sessionId !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'sessionId is required and must be a string');
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Look up session and verify instructor owns it
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, quiz_id, instructor_id, join_code')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found: ${sessionId}`);
      return apiError('NOT_FOUND', 404, 'Session not found');
    }

    // Verify instructor owns this session
    if (session.instructor_id !== authenticatedInstructor.id) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to access session owned by ${session.instructor_id}`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to access this session');
    }

    // Fetch quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('title, total_questions')
      .eq('id', session.quiz_id)
      .eq('is_active', true)
      .single();

    if (quizError || !quiz) {
      log.error(`Quiz not found for session ${sessionId}: ${session.quiz_id}`);
      return apiError('QUIZ_NOT_FOUND', 404, 'Associated quiz not found');
    }

    log.info(`Session info retrieved for: ${sessionId} by ${authenticatedInstructor.email}`);

    return apiSuccess({
      success: true,
      data: {
        sessionId: session.id,
        joinCode: session.join_code,
        quizTitle: quiz.title,
        totalQuestions: quiz.total_questions || 0,
      },
    });
  } catch (error) {
    log.error('Error retrieving session info:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to retrieve session info');
  }
}
