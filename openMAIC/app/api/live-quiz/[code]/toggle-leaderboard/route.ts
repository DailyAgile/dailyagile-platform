/**
 * POST /api/live-quiz/[code]/toggle-leaderboard
 * Toggle visibility of leaderboard during live session
 * REQUIRES: Instructor authentication
 *
 * Route param: code (8-char join code)
 * Request body:
 * {
 *   show: boolean (true to show, false to hide)
 * }
 * Response: { success: true }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizToggleLeaderboard');

interface ToggleLeaderboardRequest {
  show: boolean;
}

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

    // Parse request body
    let body: ToggleLeaderboardRequest;
    try {
      body = await req.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, 'Invalid request body');
    }

    const { show } = body;

    if (typeof show !== 'boolean') {
      return apiError('INVALID_REQUEST', 400, 'show must be a boolean');
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Look up session by join_code and verify instructor owns it
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, instructor_id')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found for code: ${code}`);
      return apiError('SESSION_NOT_FOUND', 404, 'Invalid or expired join code');
    }

    // Verify instructor owns this session
    if (session.instructor_id !== authenticatedInstructor.id) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to toggle leaderboard for session owned by ${session.instructor_id}`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to toggle this leaderboard');
    }

    // Update session: set leaderboard visibility
    const { error: updateError } = await supabase
      .from('live_quiz_sessions')
      .update({
        show_leaderboard: show,
      })
      .eq('id', session.id);

    if (updateError) {
      log.error('Failed to update session:', updateError);
      return apiError('SESSION_UPDATE_FAILED', 500, 'Failed to toggle leaderboard');
    }

    log.info(
      `✅ Leaderboard ${show ? 'shown' : 'hidden'} for session ${session.id} by ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
    });
  } catch (error) {
    log.error('Unexpected error in toggle-leaderboard endpoint:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to toggle leaderboard');
  }
}
