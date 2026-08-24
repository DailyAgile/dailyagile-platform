/**
 * Student Analytics & Metrics
 * Aggregates quiz performance, trends, and engagement metrics
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Student:Analytics');

export interface StudentAnalytics {
  totalQuizzesTaken: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  improvementTrend: number; // % improvement from first 5 to last 5
  streakDaysActive: number;
  totalBadges: number;
  pointsThisMonth: number;
  pointsLastMonth: number;
}

/**
 * Calculate comprehensive analytics for student dashboard
 */
export async function getStudentAnalytics(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<StudentAnalytics> {
  try {
    // Fetch all completed quiz submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('quiz_submissions')
      .select('percentage, created_at, score')
      .eq('student_id', studentId)
      .eq('status', 'graded')
      .order('created_at', { ascending: true });

    if (submissionsError) {
      throw submissionsError;
    }

    if (!submissions || submissions.length === 0) {
      return {
        totalQuizzesTaken: 0,
        avgScore: 0,
        bestScore: 0,
        worstScore: 0,
        improvementTrend: 0,
        streakDaysActive: 0,
        totalBadges: 0,
        pointsThisMonth: 0,
        pointsLastMonth: 0,
      };
    }

    // Calculate basic stats
    const scores = submissions.map((s: any) => s.percentage || 0);
    const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    // Calculate improvement trend (compare first 5 to last 5)
    const improvementTrend = calculateTrend(scores);

    // Count badges
    const { count: badgeCount } = await supabase
      .from('student_badges')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId);

    // Count points this month and last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const pointsThisMonth = submissions
      .filter((s: any) => new Date(s.created_at) >= thisMonthStart)
      .reduce((sum: number, s: any) => sum + (s.score || 0), 0);

    const pointsLastMonth = submissions
      .filter((s: any) => {
        const date = new Date(s.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum: number, s: any) => sum + (s.score || 0), 0);

    // Get streak
    const { data: streakData } = await supabase
      .from('student_streaks')
      .select('current_streak_days')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(1);

    const streakDaysActive = (streakData as any)?.[0]?.current_streak_days || 0;

    return {
      totalQuizzesTaken: submissions.length,
      avgScore,
      bestScore,
      worstScore,
      improvementTrend,
      streakDaysActive,
      totalBadges: badgeCount || 0,
      pointsThisMonth,
      pointsLastMonth,
    };
  } catch (error) {
    log.error('Error calculating analytics:', error);
    // Return defaults on error
    return {
      totalQuizzesTaken: 0,
      avgScore: 0,
      bestScore: 0,
      worstScore: 0,
      improvementTrend: 0,
      streakDaysActive: 0,
      totalBadges: 0,
      pointsThisMonth: 0,
      pointsLastMonth: 0,
    };
  }
}

/**
 * Calculate improvement trend
 * Compares average of last 5 to average of first 5
 * Returns % improvement (positive = improving, negative = declining)
 */
export function calculateTrend(scores: number[]): number {
  if (scores.length < 10) {
    return 0; // Not enough data
  }

  const first5 = scores.slice(0, 5);
  const last5 = scores.slice(-5);

  const avgFirst = first5.reduce((a: number, b: number) => a + b, 0) / first5.length;
  const avgLast = last5.reduce((a: number, b: number) => a + b, 0) / last5.length;

  if (avgFirst === 0) return 0;
  return Math.round(((avgLast - avgFirst) / avgFirst) * 100);
}

/**
 * Get quiz-by-quiz performance breakdown
 * For analytics charts showing progress on specific quizzes
 */
export async function getQuizPerformanceBreakdown(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<
  Array<{
    quizId: string;
    quizTitle: string;
    attempts: number;
    bestScore: number;
    latestScore: number;
    avgScore: number;
  }>
> {
  try {
    const { data: submissions, error } = await supabase
      .from('quiz_submissions')
      .select(
        `
        quiz_id,
        percentage,
        created_at,
        quizzes(id, title)
      `
      )
      .eq('student_id', studentId)
      .eq('status', 'graded')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!submissions) return [];

    // Group by quiz
    const quizMap = new Map<
      string,
      { attempts: number; scores: number[]; title: string }
    >();

    submissions.forEach((sub: any) => {
      const quizId = sub.quiz_id;
      if (!quizMap.has(quizId)) {
        quizMap.set(quizId, {
          attempts: 0,
          scores: [],
          title: sub.quizzes?.title || 'Unknown',
        });
      }

      const entry = quizMap.get(quizId)!;
      entry.attempts++;
      entry.scores.push(sub.percentage || 0);
    });

    // Calculate stats for each quiz
    return Array.from(quizMap.entries()).map(([quizId, data]) => ({
      quizId,
      quizTitle: data.title,
      attempts: data.attempts,
      bestScore: Math.max(...data.scores),
      latestScore: data.scores[0],
      avgScore: Math.round(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      ),
    }));
  } catch (error) {
    log.error('Error getting quiz breakdown:', error);
    return [];
  }
}

/**
 * Get leaderboard rank for student
 */
export async function getLeaderboardRank(
  studentId: string,
  scope: 'global' | 'regional' | 'organization',
  supabase: ReturnType<typeof createClient>
): Promise<{ rank: number; totalParticipants: number }> {
  try {
    // Get student's total points
    const { data: studentPoints } = await supabase
      .from('student_points')
      .select('total_points')
      .eq('student_id', studentId)
      .single();

    const studentTotal = (studentPoints as any)?.total_points || 0;

    // Count how many students have more points (for rank)
    const { count: higherCount, error } = await supabase
      .from('student_points')
      .select('id', { count: 'exact', head: true })
      .gt('total_points', studentTotal);

    if (error) {
      throw error;
    }

    const rank = (higherCount || 0) + 1;

    // Count total participants
    const { count: totalCount } = await supabase
      .from('student_points')
      .select('id', { count: 'exact', head: true });

    return {
      rank,
      totalParticipants: totalCount || 0,
    };
  } catch (error) {
    log.error('Error getting leaderboard rank:', error);
    return { rank: 0, totalParticipants: 0 };
  }
}

/**
 * Calculate estimated time to complete
 */
export async function getAverageCompletionTime(
  quizId: string,
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  try {
    const { data } = await supabase
      .from('quiz_submissions')
      .select('time_spent_seconds')
      .eq('quiz_id', quizId)
      .gt('time_spent_seconds', 0);

    if (!data || data.length === 0) return 0;

    const sum = (data as any).reduce(
      (acc: number, sub: any) => acc + (sub.time_spent_seconds || 0),
      0
    );
    return Math.round(sum / (data as any).length);
  } catch (error) {
    log.warn('Error calculating average completion time:', error);
    return 0;
  }
}
