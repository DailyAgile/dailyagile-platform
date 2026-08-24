/**
 * SM-2 Spaced Repetition Algorithm
 * Implements the proven SuperMemo-2 algorithm for optimal review scheduling
 *
 * Algorithm Formula:
 * I(n) = I(n-1) × EF
 * EF' = max(1.3, EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02)))
 *
 * Where:
 * - I(n) = interval for next repetition (in days)
 * - EF = easiness factor (starts at 2.5, never below 1.3)
 * - q = quality of recall (0-5 scale)
 *
 * Quality Mapping (from percentage score):
 * 0-2: Failed (complete blackout, total recall failure)
 * 3-4: Difficult (struggled, hesitant recall)
 * 5: Perfect (immediate, confident recall)
 *
 * Integration: Called from gamification/index.ts in atomic transaction
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Gamification:SpacedRep');

export interface SpacedRepState {
  interval: number; // Days until next review
  easeFactor: number; // Multiplier (starts 2.5)
  reps: number; // Times reviewed
  nextReviewDate: Date; // Scheduled review date
  status: 'new' | 'learning' | 'review' | 'graduated';
}

export interface SpacedRepHistory {
  quality: number;
  scorePercentage: number;
  intervalBefore: number;
  easeFactorBefore: number;
  repsBefore: number;
  intervalAfter: number;
  easeFactorAfter: number;
  repsAfter: number;
  nextReviewDate: Date;
}

/**
 * Convert percentage score to quality rating (0-5 scale)
 * Based on standard SM-2 quality mapping
 *
 * @param score - Percentage score (0-100)
 * @returns Quality rating (0-5)
 */
export function calculateQuality(score: number): number {
  if (score < 60) return 0; // Complete blackout
  if (score < 70) return 1; // Incorrect response
  if (score < 80) return 2; // Correct but required serious recall effort
  if (score < 90) return 3; // Correct but with hesitation
  if (score < 100) return 4; // Correct with some difficulty
  return 5; // Perfect response
}

/**
 * Apply SM-2 algorithm to get next interval
 *
 * @param quality - Quality of recall (0-5)
 * @param currentState - Current SM-2 state
 * @returns Updated SM-2 state for next review
 */
export function applySmTwoAlgorithm(
  quality: number,
  currentState: SpacedRepState
): SpacedRepState {
  let interval = currentState.interval;
  let easeFactor = currentState.easeFactor;
  let reps = currentState.reps;
  let status = currentState.status;

  // =========================================================================
  // UPDATE EASE FACTOR
  // EF' = max(1.3, EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02)))
  // =========================================================================
  const delta = 5 - quality;
  easeFactor = Math.max(1.3, easeFactor + (0.1 - delta * (0.08 + delta * 0.02)));

  reps += 1;

  // =========================================================================
  // DETERMINE NEXT INTERVAL BASED ON QUALITY AND REPETITION
  // =========================================================================
  if (quality < 3) {
    // Failed or severe difficulty: restart learning phase
    // Reset interval to 1 day and reset reps
    interval = 1;
    reps = 0;
    status = 'learning';
  } else if (reps === 1) {
    // First successful repetition: 1 day
    interval = 1;
    status = 'learning';
  } else if (reps === 2) {
    // Second successful repetition: 3 days
    interval = 3;
    status = 'review';
  } else {
    // Subsequent successful repetitions: apply ease factor
    // I(n) = I(n-1) × EF
    interval = Math.round(interval * easeFactor);
    status = 'review';
  }

  // =========================================================================
  // GRADUATION: Mark as graduated after 30+ day interval
  // Graduated items are reviewed less frequently (optional maintenance only)
  // =========================================================================
  if (interval >= 30) {
    status = 'graduated';
  }

  // =========================================================================
  // CALCULATE NEXT REVIEW DATE
  // =========================================================================
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    interval,
    easeFactor,
    reps,
    nextReviewDate,
    status,
  };
}

/**
 * Schedule next review for a quiz (SM-2 algorithm)
 *
 * @param studentId - Student UUID
 * @param quizId - Quiz UUID
 * @param quizSessionId - Quiz session UUID (current attempt)
 * @param score - Quiz score percentage
 * @param supabase - Supabase client
 * @returns Spaced repetition history entry
 */
export async function scheduleNextReview(
  studentId: string,
  quizId: string,
  quizSessionId: string,
  score: number,
  supabase: ReturnType<typeof createClient>
): Promise<SpacedRepHistory> {
  // =========================================================================
  // 1. CONVERT SCORE TO QUALITY RATING
  // =========================================================================
  const quality = calculateQuality(score);

  // =========================================================================
  // 2. GET CURRENT SM-2 STATE (or initialize as new)
  // =========================================================================
  const { data: currentState, error: fetchError } = await supabase
    .from('spaced_repetition_schedules')
    .select('*')
    .eq('student_id', studentId)
    .eq('quiz_id', quizId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = not found
    log.error('Failed to fetch spaced rep state:', fetchError);
    throw fetchError;
  }

  // Initialize new state if first time
  let stateBefore: SpacedRepState;
  if (currentState) {
    stateBefore = {
      interval: (currentState as any).interval_days || 0,
      easeFactor: (currentState as any).ease_factor || 2.5,
      reps: (currentState as any).reps || 0,
      nextReviewDate: new Date((currentState as any).next_recommended_date),
      status: (currentState as any).status || 'new',
    };
  } else {
    stateBefore = {
      interval: 0,
      easeFactor: 2.5, // Default starting ease factor
      reps: 0,
      nextReviewDate: new Date(),
      status: 'new',
    };
  }

  // =========================================================================
  // 3. APPLY SM-2 ALGORITHM
  // =========================================================================
  const stateAfter = applySmTwoAlgorithm(quality, stateBefore);

  // =========================================================================
  // 4. SAVE UPDATED STATE (ATOMIC TRANSACTION)
  // Use RPC function to ensure atomicity: if any part fails, entire
  // operation rolls back. This prevents SM-2 state inconsistency.
  // =========================================================================
  const nextDateStr = stateAfter.nextReviewDate.toISOString().split('T')[0];

  const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
    'update_sm2_atomic',
    {
      p_student_id: studentId,
      p_quiz_id: quizId,
      p_interval_days: stateAfter.interval,
      p_ease_factor: stateAfter.easeFactor,
      p_reps: stateAfter.reps,
      p_status: stateAfter.status,
      p_next_date: nextDateStr,
    }
  ) as { data: Array<{ success: boolean; message: string }> | null; error: any };

  if (rpcError) {
    log.error('Failed to update SM-2 state atomically:', rpcError);
    throw rpcError;
  }

  // Verify RPC succeeded
  if (!rpcResult || rpcResult.length === 0 || !rpcResult[0].success) {
    const errorMsg = rpcResult?.[0]?.message || 'Unknown error during SM-2 update';
    log.error('SM-2 update returned failure:', errorMsg);
    throw new Error(errorMsg);
  }

  // =========================================================================
  // 5. LOG DETAILED SM-2 ADJUSTMENT FOR AUDIT TRAIL
  // Note: Audit logging is included in the RPC transaction.
  // This separate insert logs the full history details.
  // =========================================================================
  const history: SpacedRepHistory = {
    quality,
    scorePercentage: score,
    intervalBefore: stateBefore.interval,
    easeFactorBefore: stateBefore.easeFactor,
    repsBefore: stateBefore.reps,
    intervalAfter: stateAfter.interval,
    easeFactorAfter: stateAfter.easeFactor,
    repsAfter: stateAfter.reps,
    nextReviewDate: stateAfter.nextReviewDate,
  };

  // Insert detailed history (non-critical - won't block transaction if fails)
  const { error: historyError } = await supabase.from('spaced_repetition_history').insert({
    student_id: studentId,
    quiz_id: quizId,
    quiz_session_id: quizSessionId,
    quality,
    score_percentage: score,
    interval_before: stateBefore.interval,
    ease_before: stateBefore.easeFactor,
    reps_before: stateBefore.reps,
    interval_after: stateAfter.interval,
    ease_after: stateAfter.easeFactor,
    reps_after: stateAfter.reps,
    next_review_date: nextDateStr,
  } as any);

  if (historyError) {
    log.warn('Failed to log detailed SM-2 history (non-critical):', historyError);
    // Don't throw - detailed history logging failure shouldn't break the main update
  }

  log.info(
    `SM-2 Updated: q=${quality}, reps=${stateBefore.reps}→${stateAfter.reps}, ` +
      `EF=${stateBefore.easeFactor.toFixed(2)}→${stateAfter.easeFactor.toFixed(2)}, ` +
      `interval=${stateBefore.interval}→${stateAfter.interval}d`
  );

  return history;
}

/**
 * Get quizzes due for review today
 * Returns quizzes where next_recommended_date <= today
 *
 * @param studentId - Student UUID
 * @param supabase - Supabase client
 * @returns List of quizzes due for review
 */
export async function getQuizzesDueForReview(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('spaced_repetition_schedules')
    .select(
      `
      id,
      quiz_id,
      quizzes(title, description),
      interval_days,
      ease_factor,
      reps,
      next_recommended_date,
      status
    `
    )
    .eq('student_id', studentId)
    .lte('next_recommended_date', today)
    .order('next_recommended_date', { ascending: true });

  if (error) {
    log.error('Failed to fetch quizzes due for review:', error);
    return [];
  }

  return (data as any) || [];
}

/**
 * Get spaced repetition statistics for a student
 */
export async function getStudentSpacedRepStats(
  studentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{
  totalScheduled: number;
  dueToday: number;
  inLearning: number;
  inReview: number;
  graduated: number;
  averageEaseFactor: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('spaced_repetition_schedules')
    .select('interval_days, ease_factor, reps, status, next_recommended_date')
    .eq('student_id', studentId);

  if (error) {
    log.error('Failed to fetch spaced rep stats:', error);
    return {
      totalScheduled: 0,
      dueToday: 0,
      inLearning: 0,
      inReview: 0,
      graduated: 0,
      averageEaseFactor: 2.5,
    };
  }

  const schedules = data || [];
  const stats = {
    totalScheduled: schedules.length,
    dueToday: schedules.filter((s: any) => s.next_recommended_date <= today).length,
    inLearning: schedules.filter((s: any) => s.status === 'learning').length,
    inReview: schedules.filter((s: any) => s.status === 'review').length,
    graduated: schedules.filter((s: any) => s.status === 'graduated').length,
    averageEaseFactor:
      schedules.length > 0
        ? schedules.reduce((sum: number, s: any) => sum + (s.ease_factor || 2.5), 0) /
          schedules.length
        : 2.5,
  };

  return stats;
}

/**
 * Get spaced repetition history for a quiz
 * Shows progression of SM-2 algorithm over time
 */
export async function getQuizSpacedRepHistory(
  studentId: string,
  quizId: string,
  limit: number = 20,
  supabase: ReturnType<typeof createClient>
): Promise<any[]> {
  const { data, error } = await supabase
    .from('spaced_repetition_history')
    .select(
      `
      id,
      quality,
      score_percentage,
      interval_before,
      ease_before,
      reps_before,
      interval_after,
      ease_after,
      reps_after,
      next_review_date,
      created_at
    `
    )
    .eq('student_id', studentId)
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('Failed to fetch spaced rep history:', error);
    return [];
  }

  return data || [];
}
