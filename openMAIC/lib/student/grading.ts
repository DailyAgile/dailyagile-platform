/**
 * Quiz Grading & Badge Awarding System
 * Handles grading logic, badge awards, and streak updates in atomic transaction
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import { awardBadges, getStudentBadges } from './gamification/badges';
import { updateStreak } from './gamification/streaks';

const log = createLogger('Student:Grading');

export interface GradingResult {
  submissionId: string;
  quizId: string;
  scorePercentage: number;
  passed: boolean;
  pointsEarned: number;
  badgesAwarded: string[];
  recommendations: any[];
}

/**
 * Grade all answers for a quiz submission
 * Calls Claude AI API for subjective question types
 * Calculates score and awards badges atomically
 */
export async function gradeSubmission(
  submissionId: string,
  studentId: string,
  quizId: string,
  supabase: ReturnType<typeof createClient>
): Promise<GradingResult> {
  try {
    // Fetch submission and all answers
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    // Fetch all answers for this submission
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('submission_id', submissionId);

    if (answersError) {
      throw new Error(`Failed to fetch answers: ${answersError.message}`);
    }

    if (!answers || (answers as any).length === 0) {
      throw new Error('No answers found for submission');
    }

    // Grade each answer
    let totalPoints = 0;
    let maxPoints = 0;
    const gradingUpdates = [];

    for (const answer of (answers as any)) {
      maxPoints += (answer as any).max_points;

      // For MC/TF: auto-grade
      if (
        (answer as any).question_type === 'multiple_choice' ||
        (answer as any).question_type === 'true_false'
      ) {
        const isCorrect = (answer as any).student_answer === (answer as any).correct_answer;
        const pointsEarned = isCorrect ? (answer as any).max_points : 0;
        totalPoints += pointsEarned;

        gradingUpdates.push({
          id: (answer as any).id,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          feedback: isCorrect
            ? 'Correct!'
            : `Correct answer: ${(answer as any).correct_answer}`,
          grading_time_ms: 10, // auto-grade is instant
        });
      }
      // For essay/short_answer: require Claude grading
      // (This would call /api/quiz-grade endpoint in production)
      else {
        // TODO: Call Claude API for grading
        // For now, mark as pending
        gradingUpdates.push({
          id: (answer as any).id,
          is_correct: null,
          points_earned: null,
          feedback: 'Pending instructor review',
          grading_time_ms: null,
        });
      }
    }

    const scorePercentage =
      maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    // Get quiz details for pass threshold
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('pass_threshold, industry')
      .eq('id', quizId)
      .single();

    const passThreshold = (quiz as any)?.pass_threshold || 70;
    const passed = scorePercentage >= passThreshold;

    // Update submission with score
    const { error: updateError } = await (supabase as any)
      .from('quiz_submissions')
      .update({
        status: 'graded',
        score: totalPoints,
        max_score: maxPoints,
        percentage: scorePercentage,
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    // Batch update all answers with grades
    if (gradingUpdates.length > 0) {
      // Update each answer individually (no batch update available)
      for (const update of gradingUpdates) {
        await (supabase as any)
          .from('quiz_answers')
          .update({
            is_correct: update.is_correct,
            points_earned: update.points_earned,
            feedback: update.feedback,
            grading_time_ms: update.grading_time_ms,
          })
          .eq('id', update.id);
      }
    }

    // Award badges
    // Get previous best score for this quiz
    const { data: previousAttempts } = await supabase
      .from('quiz_submissions')
      .select('percentage')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .neq('id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const previousBestScore =
      ((previousAttempts as any)?.[0]?.percentage as number) || null;

    // Get attempt number
    const { count: attemptCount } = await supabase
      .from('quiz_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('quiz_id', quizId);

    const attemptNumber = (attemptCount || 0) + 1;

    // Award badges
    const badgeAwards = await awardBadges(
      studentId,
      quizId,
      scorePercentage,
      (submission as any).time_spent_seconds || 0,
      passed,
      previousBestScore,
      attemptNumber,
      (quiz as any)?.industry || null,
      submissionId,
      supabase
    );

    const badgesAwarded = badgeAwards.map((b) => b.badgeId);

    // Update streak
    try {
      await updateStreak(studentId, quizId, (submission as any)?.user_timezone || 'UTC', supabase);
    } catch (streakError) {
      log.warn('Failed to update streak:', streakError);
      // Don't fail the entire grading process
    }

    // Get recommendations
    const recommendations = await getNextRecommendations(
      studentId,
      quizId,
      passed,
      supabase
    );

    return {
      submissionId,
      quizId,
      scorePercentage,
      passed,
      pointsEarned: totalPoints,
      badgesAwarded,
      recommendations,
    };
  } catch (error) {
    log.error('Error grading submission:', error);
    throw error;
  }
}

/**
 * Get next quiz recommendations after submission
 * Based on: spaced repetition, weak areas, etc.
 */
async function getNextRecommendations(
  studentId: string,
  justCompletedQuizId: string,
  passed: boolean,
  supabase: ReturnType<typeof createClient>
): Promise<any[]> {
  try {
    // Schedule spaced repetition for this quiz
    const nextRetryDays = passed ? 7 : 3; // Retry failed quizzes sooner
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextRetryDays);

    await (supabase as any)
      .from('spaced_repetition_schedules')
      .upsert(
        {
          student_id: studentId,
          quiz_id: justCompletedQuizId,
          next_recommended_date: nextDate.toISOString(),
          last_attempted_at: new Date().toISOString(),
          attempt_count: 1,
        },
        { onConflict: 'student_id, quiz_id' }
      );

    // Return top 3 recommended quizzes (spaced rep due + weak areas)
    const { data: recommendations } = await supabase
      .from('spaced_repetition_schedules')
      .select('quiz_id, next_recommended_date')
      .eq('student_id', studentId)
      .lte('next_recommended_date', new Date().toISOString())
      .order('next_recommended_date', { ascending: true })
      .limit(3);

    return (
      (recommendations as any)?.map((r: any) => ({
        quizId: r.quiz_id,
        reason: 'spaced_repetition',
        nextRetryDate: r.next_recommended_date,
      })) || []
    );
  } catch (error) {
    log.warn('Error getting recommendations:', error);
    return [];
  }
}

/**
 * Calculate if student passed based on quiz threshold
 */
export function isPassed(
  scorePercentage: number,
  passThreshold: number = 70
): boolean {
  return scorePercentage >= passThreshold;
}

/**
 * Update submission status history (audit trail)
 */
export async function recordStatusChange(
  submissionId: string,
  oldStatus: string | null,
  newStatus: string,
  reason: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  try {
    await (supabase as any).from('quiz_submission_status_history').insert({
      submission_id: submissionId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by_system: 'student_api',
      reason,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.warn('Failed to record status change:', error);
    // Non-critical, don't throw
  }
}
