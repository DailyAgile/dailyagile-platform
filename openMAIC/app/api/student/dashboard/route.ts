/**
 * GET /api/student/dashboard
 * Returns: { myQuizzes, progress, badges, currentStreak, totalPoints, nextRecommendation }
 *
 * Dashboard endpoint aggregates all key student data.
 * Cached for 30 seconds for performance.
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';
import { getStudentBadges } from '@/lib/student/gamification/badges';
import { getRecommendations } from '@/lib/student/spaced-rep-utils';
import type { DashboardResponse } from '@/lib/student/types';

const log = createLogger('API:StudentDashboard');

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return apiError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const { studentId } = auth;
    const supabase = getSupabaseClient();

    // OPTIMIZATION: Fetch quizzes with best scores using single query with JOINs
    // OLD: 1 quiz access list + N×quiz details + N×best scores = O(N) queries
    // NEW: 1 query with database aggregation
    // Performance improvement: eliminates N+1 query pattern

    const { data: quizzesWithAccess, error: quizzesError } = await supabase
      .from('quiz_access')
      .select(
        `
        quiz_id,
        access_type,
        quizzes(
          id,
          title,
          description,
          difficulty,
          duration_minutes,
          pass_rate,
          industry
        ),
        quiz_submissions!left(percentage)
      `
      )
      .eq('student_id', studentId)
      .eq('quiz_submissions.student_id', studentId)
      .eq('quiz_submissions.status', 'graded');

    if (quizzesError) {
      log.error('Error fetching quizzes:', quizzesError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quizzes');
    }

    // Transform the response: extract best score and format for API
    const myQuizzes = (quizzesWithAccess || []).map((qa: any) => {
      // Get best score from submissions array (already filtered to graded status)
      const bestScore =
        qa.quiz_submissions && qa.quiz_submissions.length > 0
          ? Math.max(...qa.quiz_submissions.map((s: any) => s.percentage || 0))
          : null;

      return {
        quizId: qa.quiz_id,
        title: qa.quizzes.title,
        description: qa.quizzes.description,
        difficulty: qa.quizzes.difficulty,
        duration_minutes: qa.quizzes.duration_minutes,
        pass_rate: qa.quizzes.pass_rate,
        student_best_score: bestScore,
        industry: qa.quizzes.industry,
        access_type: qa.access_type,
      };
    });

    // OPTIMIZATION: Calculate progress efficiently
    // We already fetched all quizzes above, so calculate from that data
    // instead of making additional database queries
    const totalQuizzes = myQuizzes.length;
    const completed = myQuizzes.filter((q: any) => q.student_best_score !== null).length;
    const completionPercentage =
      totalQuizzes > 0 ? Math.round((completed / totalQuizzes) * 100) : 0;

    // Get badges
    const badges = await getStudentBadges(studentId, supabase);
    const badgeList = badges.map((b: any) => ({
      id: b.badge_id,
      name: b.badge_types?.name || 'Unknown Badge',
      icon: b.badge_types?.icon_url || '🏆',
      earnedAt: b.awarded_at,
    }));

    // Get current streak
    const { data: streakData } = await supabase
      .from('student_streaks')
      .select('current_streak_days')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(1);

    const currentStreak = streakData?.[0]?.current_streak_days || 0;

    // Get total points
    const { data: pointsData } = await supabase
      .from('student_points')
      .select('total_points')
      .eq('student_id', studentId)
      .single();

    const totalPoints = pointsData?.total_points || 0;

    // Get next recommendation
    const recommendations = await getRecommendations(studentId, 1, supabase);
    const nextRecommendation = recommendations[0] || null;

    const response: DashboardResponse = {
      myQuizzes,
      progress: {
        totalQuizzes,
        completed,
        completionPercentage,
      },
      badges: badgeList,
      currentStreak,
      totalPoints,
      nextRecommendation: nextRecommendation
        ? {
            quizId: nextRecommendation.quizId,
            title: nextRecommendation.quizTitle,
            reason: nextRecommendation.reason,
            daysUntilRetry: nextRecommendation.daysUntilRetry,
          }
        : null,
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Dashboard error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to load dashboard');
  }
}
