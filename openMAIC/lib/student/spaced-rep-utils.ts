/**
 * Spaced Repetition Scheduling
 * Determines when student should retry quizzes based on performance
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Student:SpacedRep');

export interface Recommendation {
  quizId: string;
  quizTitle: string;
  reason: 'spaced_repetition' | 'weak_area';
  nextRetryDate: string;
  daysUntilRetry: number;
  lastAttemptDate: string;
}

/**
 * Schedule next review for a quiz based on performance
 * - Passed (>=70%): retry in 7 days (long-term retention)
 * - Failed (<70%): retry in 3 days (immediate reinforcement)
 */
export async function scheduleNextReview(
  studentId: string,
  quizId: string,
  passed: boolean,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  try {
    const nextRetryDays = passed ? 7 : 3;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextRetryDays);

    const { error } = await (supabase as any)
      .from('spaced_repetition_schedules')
      .upsert(
        {
          student_id: studentId,
          quiz_id: quizId,
          next_recommended_date: nextDate.toISOString(),
          last_attempted_at: new Date().toISOString(),
          status: 'scheduled',
        },
        { onConflict: 'student_id,quiz_id' }
      );

    if (error) {
      throw error;
    }

    log.info(
      `Scheduled next review for student ${studentId}, quiz ${quizId} in ${nextRetryDays} days`
    );
  } catch (error) {
    log.error('Error scheduling next review:', error);
    throw error;
  }
}

/**
 * Get personalized recommendations for student
 * Returns quizzes due for spaced repetition + weak areas
 */
export async function getRecommendations(
  studentId: string,
  limit: number = 5,
  supabase: ReturnType<typeof createClient>
): Promise<Recommendation[]> {
  try {
    const now = new Date();

    // Get spaced repetition due
    const { data: spacedRepDue, error: spacedError } = await supabase
      .from('spaced_repetition_schedules')
      .select(
        `
        quiz_id,
        next_recommended_date,
        last_attempted_at,
        quizzes(id, title)
      `
      )
      .eq('student_id', studentId)
      .lte('next_recommended_date', now.toISOString())
      .order('next_recommended_date', { ascending: true })
      .limit(Math.ceil(limit * 0.7)); // 70% spaced rep, 30% weak areas

    if (spacedError) {
      throw spacedError;
    }

    // Get weak areas (low scores in last 5 attempts)
    const { data: weakAreas, error: weakError } = await supabase
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
      .in('status', ['graded'])
      .lt('percentage', 70)
      .order('created_at', { ascending: false })
      .limit(20);

    if (weakError) {
      throw weakError;
    }

    const recommendations: Recommendation[] = [];

    // Add spaced rep recommendations
    if (spacedRepDue) {
      (spacedRepDue as any).forEach((item: any) => {
        const nextDate = new Date(item.next_recommended_date);
        const daysUntil = Math.max(
          0,
          Math.ceil(
            (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        recommendations.push({
          quizId: item.quiz_id,
          quizTitle: item.quizzes?.title || 'Unknown',
          reason: 'spaced_repetition',
          nextRetryDate: item.next_recommended_date,
          daysUntilRetry: daysUntil,
          lastAttemptDate: item.last_attempted_at,
        });
      });
    }

    // Add weak area recommendations (remove duplicates)
    const addedQuizIds = new Set(recommendations.map((r) => r.quizId));
    const uniqueWeakAreas = new Map<string, any>();

    if (weakAreas) {
      (weakAreas as any).forEach((item: any) => {
        if (
          !addedQuizIds.has(item.quiz_id) &&
          !uniqueWeakAreas.has(item.quiz_id)
        ) {
          uniqueWeakAreas.set(item.quiz_id, item);
        }
      });

      // Add remaining capacity with weak areas
      const remaining = limit - recommendations.length;
      let added = 0;

      uniqueWeakAreas.forEach((item: any) => {
        if (added >= remaining) return;

        recommendations.push({
          quizId: item.quiz_id,
          quizTitle: item.quizzes?.title || 'Unknown',
          reason: 'weak_area',
          nextRetryDate: item.created_at,
          daysUntilRetry: 0, // Available now
          lastAttemptDate: item.created_at,
        });

        added++;
      });
    }

    return recommendations.slice(0, limit);
  } catch (error) {
    log.error('Error getting recommendations:', error);
    return [];
  }
}

/**
 * Get spaced repetition stats for a quiz
 */
export async function getSpacedRepStats(
  studentId: string,
  quizId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{
  attemptCount: number;
  lastAttemptAt: string | null;
  nextReviewAt: string | null;
  daysUntilReview: number | null;
}> {
  try {
    const { data: schedule } = await supabase
      .from('spaced_repetition_schedules')
      .select('*')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .single();

    if (!schedule) {
      return {
        attemptCount: 0,
        lastAttemptAt: null,
        nextReviewAt: null,
        daysUntilReview: null,
      };
    }

    const nextReviewDate = new Date((schedule as any).next_recommended_date);
    const now = new Date();
    const daysUntil = Math.ceil(
      (nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      attemptCount: (schedule as any).attempt_count || 1,
      lastAttemptAt: (schedule as any).last_attempted_at,
      nextReviewAt: (schedule as any).next_recommended_date,
      daysUntilReview: Math.max(0, daysUntil),
    };
  } catch (error) {
    log.error('Error getting spaced rep stats:', error);
    return {
      attemptCount: 0,
      lastAttemptAt: null,
      nextReviewAt: null,
      daysUntilReview: null,
    };
  }
}
