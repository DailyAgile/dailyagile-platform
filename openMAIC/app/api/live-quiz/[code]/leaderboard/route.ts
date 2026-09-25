/**
 * GET /api/live-quiz/[code]/leaderboard
 *
 * Returns the leaderboard for a live quiz session.
 * Route parameter: code (8-char join code)
 *
 * Only visible if show_leaderboard = true OR session status = 'ended'
 * No authentication required — clients poll this regularly
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizLeaderboardAPI');

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  score: number;
  questionsAnswered: number;
}

interface LiveQuizLeaderboardResponse {
  sessionId: string;
  isVisible: boolean;
  leaderboard: LeaderboardEntry[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;

    // Validate code format (must be 8 alphanumeric characters)
    if (!code || !/^[a-zA-Z0-9]{8}$/.test(code)) {
      log.warn(`Invalid code format: ${code}`);
      return apiError('INVALID_REQUEST', 400, 'Invalid join code format');
    }

    const supabase = getSupabaseClient();

    // 1. Look up live_quiz_sessions by join_code
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, status, show_leaderboard')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found for code: ${code}`, sessionError);
      return apiError('SESSION_NOT_FOUND', 404, 'Live quiz session not found');
    }

    // 2. Check if leaderboard is visible
    const isVisible = session.show_leaderboard === true || session.status === 'ended';

    // 3. Fetch participants with scores, ordered by score DESC then questions_answered DESC
    const { data: participants, error: participantsError } = await supabase
      .from('live_quiz_participants')
      .select('student_id, current_score, questions_answered')
      .eq('session_id', session.id)
      .order('current_score', { ascending: false })
      .order('questions_answered', { ascending: false });

    if (participantsError) {
      log.warn(`Failed to fetch participants for session ${session.id}:`, participantsError);
      return apiError(
        'RESPONSES_FETCH_FAILED',
        500,
        'Failed to retrieve leaderboard data'
      );
    }

    // 4. Transform to leaderboard format with rankings
    const leaderboard: LeaderboardEntry[] = (participants || []).map((p: any, index: number) => ({
      rank: index + 1,
      studentId: p.student_id,
      score: p.current_score || 0,
      questionsAnswered: p.questions_answered || 0,
    }));

    const responseData: LiveQuizLeaderboardResponse = {
      sessionId: session.id,
      isVisible,
      leaderboard: isVisible ? leaderboard : [],
    };

    log.info(
      `Leaderboard retrieved for session: ${session.id}, code: ${code}, visible: ${isVisible}, entries: ${leaderboard.length}`
    );

    return apiSuccess(responseData);
  } catch (error) {
    log.error('Error retrieving live quiz leaderboard:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to retrieve leaderboard',
      error instanceof Error ? error.message : undefined
    );
  }
}
