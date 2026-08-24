/**
 * Points Calculation System
 * Calculates points based on score, time, and quiz attributes
 * Updates leaderboard rankings
 *
 * Point Calculation:
 * - Base: 10 points × (score/100)
 * - Speed bonus: +20 if completed in <5 minutes
 * - Accuracy bonus: +10 if score >=90%
 * - Industry multiplier: 1.5x for healthcare/finance
 *
 * Integration: Called from gamification/index.ts in atomic transaction
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Gamification:Points');

export interface PointsCalculation {
  totalPoints: number;
  basePoints: number;
  speedBonus: number;
  accuracyBonus: number;
  industryMultiplier: number;
}

/**
 * Calculate points awarded for quiz completion
 * Only award points if quiz was passed (score >= 70%)
 *
 * @param score - Percentage score (0-100)
 * @param timeSpent - Time spent in seconds
 * @param industry - Quiz industry category
 * @param passed - Whether quiz was passed
 * @returns Point calculation breakdown
 */
export function calculatePoints(
  score: number,
  timeSpent: number,
  industry: string | null,
  passed: boolean
): PointsCalculation {
  const result: PointsCalculation = {
    totalPoints: 0,
    basePoints: 0,
    speedBonus: 0,
    accuracyBonus: 0,
    industryMultiplier: 1.0,
  };

  // No points for failing
  if (!passed) {
    return result;
  }

  // =========================================================================
  // 1. BASE POINTS: 10 × (score/100)
  // Score 100% = 10 points
  // Score 70% = 7 points
  // Score 50% = 5 points
  // =========================================================================
  result.basePoints = Math.floor(10 * (score / 100));

  // =========================================================================
  // 2. SPEED BONUS: +20 points if completed in <5 minutes (300 seconds)
  // Encourages quick, confident answering
  // =========================================================================
  if (timeSpent < 300) {
    result.speedBonus = 20;
  }

  // =========================================================================
  // 3. ACCURACY BONUS: +10 points if score >=90%
  // Encourages high quality learning
  // =========================================================================
  if (score >= 90) {
    result.accuracyBonus = 10;
  }

  // =========================================================================
  // 4. INDUSTRY MULTIPLIER: 1.5x for high-stakes industries
  // Healthcare and Finance quizzes get 1.5x multiplier
  // These require higher stakes and more careful learning
  // =========================================================================
  if (industry && ['healthcare', 'finance'].includes(industry.toLowerCase())) {
    result.industryMultiplier = 1.5;
  }

  // =========================================================================
  // FINAL CALCULATION
  // Total = (base + speed + accuracy) × industry multiplier
  // =========================================================================
  const subtotal = result.basePoints + result.speedBonus + result.accuracyBonus;
  result.totalPoints = Math.floor(subtotal * result.industryMultiplier);

  return result;
}

/**
 * Award points to student and update leaderboard
 *
 * @param studentId - Student UUID
 * @param quizSessionId - Quiz session UUID
 * @param pointsCalc - Points calculation result
 * @param score - Quiz score percentage
 * @param timeSpent - Time spent in seconds
 * @param industry - Quiz industry
 * @param supabase - Supabase client
 */
export async function updatePoints(
  studentId: string,
  quizSessionId: string,
  pointsCalc: PointsCalculation,
  score: number,
  timeSpent: number,
  industry: string | null,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  if (pointsCalc.totalPoints === 0) {
    return; // No points to award
  }

  const now = new Date();
  const now_iso = now.toISOString();

  // =========================================================================
  // 1. GET OR CREATE STUDENT POINTS RECORD
  // =========================================================================
  const { data: pointsRecord, error: fetchError } = await supabase
    .from('student_points')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    log.error('Failed to fetch student points:', fetchError);
    throw fetchError;
  }

  let currentTotalPoints = (pointsRecord as any)?.total_points || 0;
  let currentMonthlyPoints = (pointsRecord as any)?.points_this_month || 0;
  let currentWeeklyPoints = (pointsRecord as any)?.points_this_week || 0;

  // Reset monthly points if month has changed
  if (pointsRecord) {
    const lastUpdated = new Date((pointsRecord as any).updated_at);
    if (lastUpdated.getMonth() !== now.getMonth() || lastUpdated.getFullYear() !== now.getFullYear()) {
      currentMonthlyPoints = 0;
    }

    // Reset weekly points if week has changed (Sunday = 0)
    const dayOfWeekLast = lastUpdated.getDay();
    const dayOfWeekNow = now.getDay();
    const daysSinceLastUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    // If we've crossed a Sunday boundary, reset weekly
    if (dayOfWeekLast > dayOfWeekNow || daysSinceLastUpdate > 7) {
      currentWeeklyPoints = 0;
    }
  }

  // Update totals
  currentTotalPoints += pointsCalc.totalPoints;
  currentMonthlyPoints += pointsCalc.totalPoints;
  currentWeeklyPoints += pointsCalc.totalPoints;

  // =========================================================================
  // 2. UPSERT STUDENT POINTS
  // =========================================================================
  const { error: upsertError } = await supabase.from('student_points').upsert(
    {
      student_id: studentId,
      total_points: currentTotalPoints,
      points_this_month: currentMonthlyPoints,
      points_this_week: currentWeeklyPoints,
      last_point_awarded_at: now_iso,
      updated_at: now_iso,
    } as any,
    {
      onConflict: 'student_id',
    }
  );

  if (upsertError) {
    log.error('Failed to update student points:', upsertError);
    throw upsertError;
  }

  // =========================================================================
  // 3. LOG POINT AWARD FOR AUDIT TRAIL
  // =========================================================================
  const { error: logError } = await supabase.from('point_awards_log').insert({
    student_id: studentId,
    quiz_session_id: quizSessionId,
    points_awarded: pointsCalc.totalPoints,
    base_points: pointsCalc.basePoints,
    speed_bonus: pointsCalc.speedBonus,
    accuracy_bonus: pointsCalc.accuracyBonus,
    industry_multiplier: pointsCalc.industryMultiplier,
    score_percentage: score,
    time_spent_seconds: timeSpent,
    industry: industry || null,
  } as any);

  if (logError) {
    log.error('Failed to log point award:', logError);
    // Don't throw - logging failure shouldn't break the whole transaction
  }

  // =========================================================================
  // 4. UPDATE LEADERBOARD RANKINGS
  // Note: This is done asynchronously (not in transaction)
  // Rankings update within a few seconds
  // =========================================================================
  updateLeaderboardRankings(studentId, industry, supabase).catch((error) => {
    log.error('Failed to update leaderboard rankings:', error);
  });
}

/**
 * Update global and industry-specific leaderboard rankings
 * This is a relatively expensive operation, so it's done after the main transaction
 */
async function updateLeaderboardRankings(
  studentId: string,
  industry: string | null,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // =========================================================================
  // GLOBAL RANKING
  // =========================================================================
  const { data: globalRankData, error: globalError } = await supabase
    .from('student_points')
    .select('student_id')
    .order('total_points', { ascending: false });

  if (!globalError && globalRankData) {
    const rank = ((globalRankData as any).findIndex((r: any) => r.student_id === studentId) || 0) + 1;

    await (supabase as any)
      .from('student_points')
      .update({ global_rank: rank })
      .eq('student_id', studentId)
      .catch((e: any) => log.warn('Failed to update global rank:', e));
  }

  // =========================================================================
  // INDUSTRY-SPECIFIC RANKING (if applicable)
  // =========================================================================
  if (industry) {
    const { data: industryQuizzes, error: industryError } = await supabase
      .from('point_awards_log')
      .select('student_id, points_awarded')
      .eq('industry', industry)
      .order('points_awarded', { ascending: false });

    if (!industryError && industryQuizzes) {
      // Group by student_id and sum
      const studentIndustryPoints: Record<string, number> = {};
      industryQuizzes.forEach((q: any) => {
        studentIndustryPoints[q.student_id] =
          (studentIndustryPoints[q.student_id] || 0) + (q.points_awarded || 0);
      });

      // Find rank
      const sortedStudents = Object.entries(studentIndustryPoints)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => id);

      const rank = sortedStudents.indexOf(studentId) + 1;

      if (rank > 0) {
        await (supabase as any)
          .from('student_points')
          .update({ industry_rank: rank })
          .eq('student_id', studentId)
          .catch((e: any) => log.warn('Failed to update industry rank:', e));
      }
    }
  }
}

/**
 * Get student's total points and ranking
 */
export async function getStudentPoints(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{
  totalPoints: number;
  monthlyPoints: number;
  weeklyPoints: number;
  globalRank: number | null;
  industryRank: number | null;
}> {
  const { data, error } = await supabase
    .from('student_points')
    .select('total_points, points_this_month, points_this_week, global_rank, industry_rank')
    .eq('student_id', studentId)
    .single();

  if (error) {
    log.error('Failed to fetch student points:', error);
    return {
      totalPoints: 0,
      monthlyPoints: 0,
      weeklyPoints: 0,
      globalRank: null,
      industryRank: null,
    };
  }

  return {
    totalPoints: (data as any)?.total_points || 0,
    monthlyPoints: (data as any)?.points_this_month || 0,
    weeklyPoints: (data as any)?.points_this_week || 0,
    globalRank: (data as any)?.global_rank || null,
    industryRank: (data as any)?.industry_rank || null,
  };
}

/**
 * Get global leaderboard (top N students)
 */
export async function getGlobalLeaderboard(
  limit: number = 10,
  supabase: ReturnType<typeof createClient>
): Promise<any[]> {
  const { data, error } = await supabase
    .from('student_points')
    .select(
      `
      student_id,
      total_points,
      global_rank,
      students(first_name, last_name, email)
    `
    )
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('Failed to fetch global leaderboard:', error);
    return [];
  }

  return (data as any) || [];
}

/**
 * Get industry-specific leaderboard
 */
export async function getIndustryLeaderboard(
  industry: string,
  limit: number = 10,
  supabase: ReturnType<typeof createClient>
): Promise<any[]> {
  const { data: pointsData, error } = await supabase
    .from('point_awards_log')
    .select('student_id, points_awarded')
    .eq('industry', industry);

  if (error) {
    log.error('Failed to fetch industry leaderboard:', error);
    return [];
  }

  // Group by student_id and sum
  const studentPoints: Record<string, { studentId: string; totalPoints: number }> = {};
  (pointsData || []).forEach((p: any) => {
    if (!studentPoints[p.student_id]) {
      studentPoints[p.student_id] = { studentId: p.student_id, totalPoints: 0 };
    }
    studentPoints[p.student_id].totalPoints += p.points_awarded || 0;
  });

  // Sort and limit
  const leaderboard = Object.values(studentPoints)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);

  return leaderboard;
}
