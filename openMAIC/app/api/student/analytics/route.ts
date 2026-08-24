/**
 * GET /api/student/analytics
 *
 * Get comprehensive student analytics.
 * Returns: { totalQuizzesTaken, avgScore, bestScore, worstScore, improvementTrend, streakDaysActive, totalBadges, pointsThisMonth, pointsLastMonth }
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { getStudentAnalytics } from '@/lib/student/analytics-utils';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import type { AnalyticsResponse } from '@/lib/student/types';

const log = createLogger('API:StudentAnalytics');

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const supabase = getSupabaseClient();

    const analytics = await getStudentAnalytics(studentId, supabase);

    const response: AnalyticsResponse = {
      totalQuizzesTaken: analytics.totalQuizzesTaken,
      avgScore: analytics.avgScore,
      bestScore: analytics.bestScore,
      worstScore: analytics.worstScore,
      improvementTrend: analytics.improvementTrend,
      streakDaysActive: analytics.streakDaysActive,
      totalBadges: analytics.totalBadges,
      pointsThisMonth: analytics.pointsThisMonth,
      pointsLastMonth: analytics.pointsLastMonth,
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Analytics error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch analytics');
  }
}
