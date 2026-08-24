/**
 * GET /api/student/leaderboard?scope=global|regional|organization&limit=100
 *
 * Get leaderboard rankings. Respects privacy rules per industry.
 * Returns: { leaderboard, yourRank }
 *
 * Privacy: healthcare/finance = private leaderboard only
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth, getStudentProfile } from '@/lib/student/auth-utils';
import { checkLeaderboardAccess } from '@/lib/student/access-control';
import { getLeaderboardRank } from '@/lib/student/analytics-utils';
import type { LeaderboardResponse } from '@/lib/student/types';

const log = createLogger('API:Leaderboard');

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const supabase = getSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const scope = (searchParams.get('scope') || 'global') as
      | 'global'
      | 'regional'
      | 'organization';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100', 10),
      500
    );

    // Check privacy access
    const access = await checkLeaderboardAccess(studentId, scope, supabase);
    if (!access.canAccess) {
      return apiError(
        'FORBIDDEN',
        403,
        access.message || 'Leaderboard access restricted for your organization'
      );
    }

    // Fetch top leaderboard entries
    let query = supabase
      .from('student_points')
      .select(
        `
        student_id,
        total_points,
        students(id, name, metadata),
        student_badges(badge_id)
      `
      )
      .order('total_points', { ascending: false })
      .limit(limit);

    // Apply regional filter if specified
    if (scope === 'regional') {
      const profile = await getStudentProfile(studentId);
      if (profile?.metadata?.region) {
        query = query.filter('students.metadata->>region', 'eq', profile.metadata.region);
      }
    }

    const { data: rankings, error } = await query;

    if (error) {
      log.error('Error fetching leaderboard:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch leaderboard');
    }

    // Build leaderboard response
    const leaderboard = (rankings || []).map((entry: any, index: number) => ({
      rank: index + 1,
      studentName: entry.students?.name || 'Anonymous',
      score: entry.total_points,
      badges: entry.student_badges?.length || 0,
      region: entry.students?.metadata?.region,
    }));

    // Get student's rank
    const rankInfo = await getLeaderboardRank(studentId, scope, supabase);

    const response: LeaderboardResponse = {
      leaderboard,
      yourRank: rankInfo.rank,
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Leaderboard error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch leaderboard');
  }
}
