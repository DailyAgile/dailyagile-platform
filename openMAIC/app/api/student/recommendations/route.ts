/**
 * GET /api/student/recommendations?limit=5
 *
 * Get personalized quiz recommendations (spaced repetition + weak areas).
 * Returns: { recommendations: [...] }
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { getRecommendations } from '@/lib/student/spaced-rep-utils';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import type { RecommendationsResponse } from '@/lib/student/types';

const log = createLogger('API:Recommendations');

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const supabase = getSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '5', 10),
      20
    );

    const recommendations = await getRecommendations(
      studentId,
      limit,
      supabase
    );

    const response: RecommendationsResponse = {
      recommendations: recommendations.map((r) => ({
        quizId: r.quizId,
        quizTitle: r.quizTitle,
        reason: r.reason,
        nextRetryDate: r.nextRetryDate,
        daysUntilRetry: r.daysUntilRetry,
      })),
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Recommendations error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get recommendations');
  }
}
