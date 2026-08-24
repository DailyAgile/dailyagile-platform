/**
 * Badge Awarding System
 * Handles detection and awarding of all badge types
 * Supports 10 badge types with automatic detection logic
 *
 * Integration: Called from gamification/index.ts in atomic transaction
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Gamification:Badges');

export interface BadgeAward {
  badgeId: string;
  studentId: string;
  awardedAt: Date;
  reason: string;
  quizSessionId?: string;
}

/**
 * Award badges for a quiz completion
 *
 * @param studentId - Student UUID
 * @param quizId - Quiz UUID
 * @param score - Percentage score (0-100)
 * @param timeSpent - Time spent in seconds
 * @param passed - Whether quiz was passed
 * @param previousBestScore - Best score on this quiz before this attempt
 * @param attemptNumber - Which attempt this is (1st, 2nd, etc.)
 * @param industry - Quiz industry category (e.g., 'healthcare', 'finance')
 * @param quizSessionId - Quiz session UUID
 * @returns Array of awarded badges
 */
export async function awardBadges(
  studentId: string,
  quizId: string,
  score: number,
  timeSpent: number,
  passed: boolean,
  previousBestScore: number | null,
  attemptNumber: number,
  industry: string | null,
  quizSessionId: string,
  supabase: ReturnType<typeof createClient>,
  userTimezone?: string
): Promise<BadgeAward[]> {
  const awards: BadgeAward[] = [];
  const now = new Date();

  // ========================================================================
  // 1. FIRST QUIZ - earned on first ever quiz attempt
  // ========================================================================
  if (attemptNumber === 1) {
    const existingBadge = await supabase
      .from('student_badges')
      .select('id')
      .eq('student_id', studentId)
      .eq('badge_id', 'first_quiz')
      .single();

    if (existingBadge.error) {
      awards.push({
        badgeId: 'first_quiz',
        studentId,
        awardedAt: now,
        reason: 'First quiz attempt ever',
        quizSessionId,
      });
    }
  }

  // ========================================================================
  // 2. SPEED RUNNER - completed in less than 2 minutes (120 seconds)
  // ========================================================================
  if (timeSpent < 120 && passed) {
    awards.push({
      badgeId: 'speed_runner',
      studentId,
      awardedAt: now,
      reason: `Completed in ${timeSpent} seconds`,
      quizSessionId,
    });
  }

  // ========================================================================
  // 3. ACCURACY MASTER - score >= 95%
  // ========================================================================
  if (score >= 95) {
    awards.push({
      badgeId: 'accuracy_master',
      studentId,
      awardedAt: now,
      reason: `Achieved ${score}% accuracy`,
      quizSessionId,
    });
  }

  // ========================================================================
  // 4. PERFECT SCORE - score = 100%
  // ========================================================================
  if (score === 100) {
    awards.push({
      badgeId: 'perfect_score',
      studentId,
      awardedAt: now,
      reason: 'Perfect 100% score',
      quizSessionId,
    });
  }

  // ========================================================================
  // 5. COMEBACK KID - was <50%, now >=90% on same quiz
  // ========================================================================
  if (previousBestScore !== null && previousBestScore < 50 && score >= 90) {
    awards.push({
      badgeId: 'comeback_kid',
      studentId,
      awardedAt: now,
      reason: `Improved from ${previousBestScore}% to ${score}%`,
      quizSessionId,
    });
  }

  // ========================================================================
  // 6. NIGHT OWL - complete quiz between 10 PM (22:00) and 6 AM
  // Timezone-aware: uses user's local time
  // ========================================================================
  try {
    const tz = userTimezone || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);

    if (hour >= 22 || hour < 6) {
      awards.push({
        badgeId: 'night_owl',
        studentId,
        awardedAt: now,
        reason: `Quiz completed at ${hour}:00 in ${tz}`,
        quizSessionId,
      });
    }
  } catch (error) {
    log.warn('Failed to check night owl badge (timezone error):', error);
  }

  // ========================================================================
  // ADDITIONAL BADGE CHECKS (require database queries)
  // ========================================================================

  if (awards.length > 0) {
    // Insert the simple awards first
    const awardRecords = awards.map((award) => ({
      student_id: award.studentId,
      badge_id: award.badgeId,
      awarded_at: award.awardedAt.toISOString(),
      reason: award.reason,
      quiz_session_id: award.quizSessionId,
    }));

    const { error: insertError } = await supabase
      .from('student_badges')
      .insert(awardRecords as any);

    if (insertError && !insertError.message.includes('duplicate')) {
      log.error('Failed to insert badge awards:', insertError);
    }
  }

  // ========================================================================
  // 7. STREAKER - maintain 7-day streak (check after streak update)
  // This is checked separately in updateStreak function
  // ========================================================================

  // ========================================================================
  // 8. CONSISTENT LEARNER - 70%+ on 5 consecutive quizzes
  // ========================================================================
  await checkConsistentLearner(studentId, supabase);

  // ========================================================================
  // 9. EXPERT BADGER - pass quizzes in 3 different industries
  // ========================================================================
  if (industry && passed) {
    await checkExpertBadger(studentId, supabase);
  }

  // ========================================================================
  // 10. WEEK WARRIOR - complete 7+ quizzes in a single week
  // ========================================================================
  await checkWeekWarrior(studentId, supabase);

  return awards;
}

/**
 * Check if student qualifies for "Consistent Learner" badge
 * Requirements: Score >=70% on 5 consecutive quizzes
 */
async function checkConsistentLearner(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Get student's last 5 quiz attempts
  const { data: attempts, error } = await supabase
    .from('quiz_sessions')
    .select('score_percentage')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(5);

  if (error) {
    log.error('Failed to fetch quiz attempts for consistent learner check:', error);
    return;
  }

  if (!attempts || attempts.length < 5) {
    return; // Not enough attempts yet
  }

  // Check if all 5 are >= 70%
  const allConsistent = attempts.every(
    (a: any) => (a.score_percentage || 0) >= 70
  );

  if (allConsistent) {
    // Check if badge already awarded
    const { data: existing } = await supabase
      .from('student_badges')
      .select('id')
      .eq('student_id', studentId)
      .eq('badge_id', 'consistent_learner')
      .single();

    if (!existing) {
      await supabase.from('student_badges').insert({
        student_id: studentId,
        badge_id: 'consistent_learner',
        awarded_at: new Date().toISOString(),
        reason: 'Scored 70%+ on 5 consecutive quizzes',
      } as any);
    }
  }
}

/**
 * Check if student qualifies for "Expert Badger" badge
 * Requirements: Pass quizzes in 3 different industries
 */
async function checkExpertBadger(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Get unique industries where student passed
  const { data: industries, error } = await supabase
    .from('quiz_sessions')
    .select('quizzes(industry)')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .gte('score_percentage', 70)
    .neq('quizzes.industry', null);

  if (error) {
    log.error('Failed to fetch industries for expert badger check:', error);
    return;
  }

  const uniqueIndustries = new Set(
    (industries || []).map((i: any) => i.quizzes?.industry).filter(Boolean)
  );

  if (uniqueIndustries.size >= 3) {
    // Check if badge already awarded
    const { data: existing } = await supabase
      .from('student_badges')
      .select('id')
      .eq('student_id', studentId)
      .eq('badge_id', 'expert_badger')
      .single();

    if (!existing) {
      await supabase.from('student_badges').insert({
        student_id: studentId,
        badge_id: 'expert_badger',
        awarded_at: new Date().toISOString(),
        reason: `Passed quizzes in 3 industries: ${Array.from(uniqueIndustries).join(', ')}`,
      } as any);
    }
  }
}

/**
 * Check if student qualifies for "Week Warrior" badge
 * Requirements: Complete 7+ quizzes in a single calendar week
 */
async function checkWeekWarrior(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Get the start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 1
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - daysBack);
  weekStart.setHours(0, 0, 0, 0);

  // Count quizzes completed this week
  const { data: weekQuizzes, error } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .gte('submitted_at', weekStart.toISOString());

  if (error) {
    log.error('Failed to fetch week warrior quizzes:', error);
    return;
  }

  if ((weekQuizzes || []).length >= 7) {
    // Check if badge already awarded this week
    const { data: existing } = await supabase
      .from('student_badges')
      .select('id')
      .eq('student_id', studentId)
      .eq('badge_id', 'week_warrior')
      .gte('awarded_at', weekStart.toISOString());

    if (!existing || existing.length === 0) {
      await supabase.from('student_badges').insert({
        student_id: studentId,
        badge_id: 'week_warrior',
        awarded_at: new Date().toISOString(),
        reason: `Completed 7+ quizzes in current week`,
      } as any);
    }
  }
}

/**
 * Get all badges earned by a student
 */
export async function getStudentBadges(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<any[]> {
  const { data, error } = await supabase
    .from('student_badges')
    .select(
      `
      id,
      badge_id,
      badge_types(name, description, icon_url),
      awarded_at,
      reason
    `
    )
    .eq('student_id', studentId)
    .order('awarded_at', { ascending: false });

  if (error) {
    log.error('Failed to fetch student badges:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if student has earned a specific badge
 */
export async function hasEarnedBadge(
  studentId: string,
  badgeId: string,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('student_badges')
    .select('id')
    .eq('student_id', studentId)
    .eq('badge_id', badgeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found
    log.error('Failed to check badge:', error);
  }

  return !!data;
}
