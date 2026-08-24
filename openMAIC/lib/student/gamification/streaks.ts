/**
 * Streak Tracking System
 * Handles consecutive quiz completion tracking
 * CRITICAL: Streaks reset at USER'S LOCAL MIDNIGHT, not UTC midnight
 *
 * Integration: Called from gamification/index.ts in atomic transaction
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Gamification:Streaks');

export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  lastQuizDate: Date;
  streakContinued: boolean;
  badge7DayAwarded?: boolean;
}

/**
 * Get user's local date (accounting for timezone)
 * @param date - JavaScript Date object (UTC)
 * @param timezone - IANA timezone string (e.g., 'America/New_York', 'UTC')
 * @returns Local date at midnight in user's timezone
 */
function getLocalDateAtMidnight(date: Date, timezone: string): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const dateObj = {
      year: parseInt(parts.find((p) => p.type === 'year')?.value || '2000'),
      month: parseInt(parts.find((p) => p.type === 'month')?.value || '01'),
      day: parseInt(parts.find((p) => p.type === 'day')?.value || '01'),
    };

    // Create a date at midnight UTC for this local date
    const result = new Date(Date.UTC(dateObj.year, dateObj.month - 1, dateObj.day));
    return result;
  } catch (error) {
    log.warn(`Invalid timezone ${timezone}, falling back to UTC:`, error);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}

/**
 * Check if two dates are the same calendar day (in user's timezone)
 */
function isSameDay(date1: Date, date2: Date, timezone: string): boolean {
  const local1 = getLocalDateAtMidnight(date1, timezone);
  const local2 = getLocalDateAtMidnight(date2, timezone);
  return local1.getTime() === local2.getTime();
}

/**
 * Check if date1 is the day before date2 (in user's timezone)
 */
function isYesterday(date1: Date, date2: Date, timezone: string): boolean {
  const local1 = getLocalDateAtMidnight(date1, timezone);
  const local2 = getLocalDateAtMidnight(date2, timezone);

  const daysBefore = (local2.getTime() - local1.getTime()) / (1000 * 60 * 60 * 24);
  return daysBefore === 1;
}

/**
 * Update streak for a student on quiz completion
 * CRITICAL: Uses database-level locking (SELECT FOR UPDATE) to prevent race conditions
 * Two concurrent quiz submissions will now correctly increment streak values
 * instead of both reading the same initial value and writing the same result.
 *
 * @param studentId - Student UUID
 * @param quizId - Quiz UUID
 * @param userTimezone - IANA timezone string (e.g., 'America/New_York')
 * @param supabase - Supabase client
 * @returns Streak update information
 */
export async function updateStreak(
  studentId: string,
  quizId: string,
  userTimezone: string,
  supabase: ReturnType<typeof createClient>
): Promise<StreakUpdate> {
  const now = new Date();

  // Call atomic database function with FOR UPDATE locking
  // This ensures no race condition: lock → read → calculate → write
  // Unlike before (read → calculate → write) where concurrent calls could both read same value
  const { data, error } = await (supabase as any).rpc('update_streak_atomic', {
    p_student_id: studentId,
    p_quiz_id: quizId,
    p_user_timezone: userTimezone,
    p_now: now.toISOString(),
  });

  if (error) {
    log.error('Failed to update streak (atomic function):', error);
    throw error;
  }

  if (!data || (data as any).length === 0) {
    log.error('Atomic streak update returned no data');
    throw new Error('Streak update failed: no response from database function');
  }

  const result = (data as any)[0];

  // Parse the returned date string
  const lastQuizDate = new Date((result as any).last_quiz_date);

  log.info(
    `Streak updated: student=${studentId}, quiz=${quizId}, ` +
    `current=${(result as any).current_streak}, longest=${(result as any).longest_streak}, ` +
    `continued=${(result as any).streak_continued}`
  );

  return {
    currentStreak: (result as any).current_streak,
    longestStreak: (result as any).longest_streak,
    lastQuizDate,
    streakContinued: (result as any).streak_continued,
    badge7DayAwarded: (result as any).badge_7day_awarded,
  };
}

/**
 * Reset streak manually (e.g., if too many days have passed)
 * Called periodically or when checking if streak is still active
 */
export async function resetStreakIfExpired(
  studentId: string,
  quizId: string,
  userTimezone: string,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  const now = new Date();
  const todayLocal = getLocalDateAtMidnight(now, userTimezone);

  const { data: streakData, error: fetchError } = await supabase
    .from('student_streaks')
    .select('*')
    .eq('student_id', studentId)
    .eq('quiz_id', quizId)
    .single();

  if (fetchError) {
    return false; // No existing streak
  }

  if (!streakData) {
    return false;
  }

  // Parse stored date
  const lastQuizDateParts = (streakData as any).last_quiz_date.split('-');
  const lastQuizDate = new Date(
    parseInt(lastQuizDateParts[0]),
    parseInt(lastQuizDateParts[1]) - 1,
    parseInt(lastQuizDateParts[2])
  );

  // Check if more than 1 day has passed since last quiz
  const daysSinceLastQuiz =
    (todayLocal.getTime() - lastQuizDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastQuiz > 1) {
    // Reset streak
    const { error: resetError } = await (supabase as any)
      .from('student_streaks')
      .update({
        current_streak: 0,
        updated_at: now.toISOString(),
      })
      .eq('student_id', studentId)
      .eq('quiz_id', quizId);

    if (resetError) {
      log.error('Failed to reset expired streak:', resetError);
    } else {
      log.info(`Streak reset for student ${studentId} (${daysSinceLastQuiz.toFixed(1)} days elapsed)`);
      return true;
    }
  }

  return false;
}

/**
 * Get streak information for a student
 */
export async function getStudentStreaks(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<any[]> {
  const { data, error } = await supabase
    .from('student_streaks')
    .select(
      `
      id,
      quiz_id,
      quizzes(title),
      current_streak,
      longest_streak,
      last_quiz_date,
      user_timezone,
      updated_at
    `
    )
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false });

  if (error) {
    log.error('Failed to fetch student streaks:', error);
    return [];
  }

  return data || [];
}

/**
 * Get global streak statistics (across all quizzes)
 */
export async function getGlobalStreak(
  studentId: string,
  userTimezone: string,
  supabase: ReturnType<typeof createClient>
): Promise<{
  totalCurrentStreak: number;
  bestStreak: number;
  quizzesInStreak: number;
}> {
  const { data, error } = await supabase
    .from('student_streaks')
    .select('current_streak, longest_streak')
    .eq('student_id', studentId)
    .gt('current_streak', 0);

  if (error) {
    log.error('Failed to fetch global streak:', error);
    return { totalCurrentStreak: 0, bestStreak: 0, quizzesInStreak: 0 };
  }

  const streaks = (data as any) || [];
  const totalCurrentStreak = streaks.reduce((sum: number, s: any) => sum + (s.current_streak || 0), 0);
  const bestStreak = Math.max(...streaks.map((s: any) => s.longest_streak || 0), 0);
  const quizzesInStreak = streaks.length;

  return {
    totalCurrentStreak,
    bestStreak,
    quizzesInStreak,
  };
}
