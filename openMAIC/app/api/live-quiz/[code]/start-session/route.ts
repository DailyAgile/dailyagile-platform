/**
 * POST /api/live-quiz/[code]/start-session
 * Transition session from pending to live (start accepting answers)
 * REQUIRES: Instructor authentication
 *
 * Route param: code (8-char join code)
 * Response: { success: true }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizStartSession');

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
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

    const { code } = await params;

    if (!code || code.length !== 8) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Invalid join code format (must be 8 characters)',
      );
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Look up session by join_code and verify instructor owns it
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, instructor_id, status')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found for code: ${code}`);
      return apiError('SESSION_NOT_FOUND', 404, 'Invalid or expired join code');
    }

    // Verify instructor owns this session
    if (session.instructor_id !== authenticatedInstructor.id) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to start session owned by ${session.instructor_id}`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to start this session');
    }

    // Verify session is in pending state
    if (session.status !== 'pending') {
      log.warn(`Cannot start session ${session.id}: status is ${session.status}, expected pending`);
      return apiError(
        'INVALID_REQUEST',
        400,
        `Session is already ${session.status}. Cannot start a session that has already been started.`,
      );
    }

    // Update session: set status to 'live' and start timer on first question
    const { error: updateError } = await supabase
      .from('live_quiz_sessions')
      .update({
        status: 'live',
        current_question_index: 0,
        question_started_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      log.error('Failed to update session:', updateError);
      return apiError('SESSION_UPDATE_FAILED', 500, 'Failed to start session');
    }

    log.info(
      `✅ Session ${session.id} started by ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
    });
  } catch (error) {
    log.error('Unexpected error in start-session endpoint:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to start session');
  }
}
