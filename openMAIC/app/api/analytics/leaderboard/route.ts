/**
 * GET /api/analytics/leaderboard
 * Get quiz leaderboard (instructor-only)
 * REQUIRES: Instructor authentication + ownership of quiz
 * Query: quizId, limit (default 10, max 100)
 */

import { NextRequest } from 'next/server';
import { getQuizLeaderboard } from '@/lib/analytics/analytics-service';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { getSupabaseClient } from '@/lib/server/supabase-client';

const log = createLogger('LeaderboardAPI');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    if (!quizId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'quizId is required');
    }

    // 🔒 AUTHORIZATION: Verify quiz belongs to this instructor
    const supabase = getSupabaseClient();
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to view leaderboard for quiz ${quizId} they don't own`
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to view this quiz leaderboard');
    }

    const leaderboard = await getQuizLeaderboard(quizId, limit);

    log.info(
      `Leaderboard fetched for quiz ${quizId} by instructor ${authenticatedInstructor.email} (${leaderboard.length} entries)`
    );

    return apiSuccess({
      success: true,
      data: {
        quizId,
        leaderboard,
        count: leaderboard.length,
      },
    });
  } catch (error) {
    log.error('Error getting leaderboard:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch leaderboard');
  }
}
