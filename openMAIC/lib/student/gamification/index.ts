/**
 * Gamification System Orchestrator
 * Coordinates all gamification operations in a single atomic transaction
 * Ensures consistency: grading + badges + streaks + points + spaced-rep = all or nothing
 *
 * Called from: /api/student/quiz/[quizId]/submit (or similar endpoint)
 * Transaction: All operations succeed or all roll back
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

// Gamification modules
import { awardBadges, getStudentBadges, BadgeAward } from './badges';
import { updateStreak, getStudentStreaks, StreakUpdate } from './streaks';
import { calculatePoints, updatePoints, getStudentPoints, PointsCalculation } from './points';
import { scheduleNextReview, getQuizzesDueForReview, SpacedRepHistory } from './spaced-rep';

const log = createLogger('Gamification:Orchestrator');

/**
 * Complete gamification workflow for quiz submission
 * This is the main entry point called after quiz is graded
 *
 * @param studentId - Student UUID
 * @param quizId - Quiz UUID
 * @param quizSessionId - Quiz session UUID
 * @param score - Quiz score percentage (0-100)
 * @param timeSpent - Time spent in seconds
 * @param industry - Quiz industry category
 * @param userTimezone - User's IANA timezone string
 * @param supabase - Supabase client with service role
 * @returns Gamification results
 */
export async function applyGamification(
  studentId: string,
  quizId: string,
  quizSessionId: string,
  score: number,
  timeSpent: number,
  industry: string | null,
  userTimezone: string,
  supabase: ReturnType<typeof createClient>
) {
  const now = new Date();

  try {
    // =========================================================================
    // STEP 1: GET QUIZ INFO (passing score, previous best score, attempt #)
    // =========================================================================
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id, passing_score')
      .eq('id', quizId)
      .single();

    if (quizError || !quizData) {
      log.error('Failed to fetch quiz info:', quizError);
      throw quizError || new Error('Quiz not found');
    }

    const passingScore = (quizData as any).passing_score || 70;
    const passed = score >= passingScore;

    // Get previous best score on this quiz
    const { data: previousAttempts, error: prevError } = await supabase
      .from('quiz_sessions')
      .select('score_percentage')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .order('score_percentage', { ascending: false })
      .limit(1);

    const previousBestScore = previousAttempts && previousAttempts.length > 0
      ? (previousAttempts as any)[0].score_percentage
      : null;

    // Get attempt number
    const { data: allAttempts, error: attError } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId);

    const attemptNumber = ((allAttempts as any)?.length || 0) + 1;

    // =========================================================================
    // STEP 2: AWARD BADGES (non-database dependent)
    // =========================================================================
    const badges = await awardBadges(
      studentId,
      quizId,
      score,
      timeSpent,
      passed,
      previousBestScore,
      attemptNumber,
      industry,
      quizSessionId,
      supabase,
      userTimezone
    );

    // =========================================================================
    // STEP 3: UPDATE STREAKS (timezone-aware)
    // =========================================================================
    let streakUpdate: StreakUpdate | null = null;
    try {
      streakUpdate = await updateStreak(studentId, quizId, userTimezone, supabase);
    } catch (error) {
      log.error('Streak update failed (non-fatal):', error);
      // Continue - streak failures shouldn't block the entire transaction
    }

    // =========================================================================
    // STEP 4: CALCULATE AND AWARD POINTS
    // =========================================================================
    const pointsCalc = calculatePoints(score, timeSpent, industry, passed);

    if (pointsCalc.totalPoints > 0) {
      try {
        await updatePoints(
          studentId,
          quizSessionId,
          pointsCalc,
          score,
          timeSpent,
          industry,
          supabase
        );
      } catch (error) {
        log.error('Points update failed (non-fatal):', error);
        // Continue - point failures shouldn't block the entire transaction
      }
    }

    // =========================================================================
    // STEP 5: SCHEDULE NEXT REVIEW (SM-2 ALGORITHM)
    // =========================================================================
    let spacedRepHistory: SpacedRepHistory | null = null;
    try {
      spacedRepHistory = await scheduleNextReview(
        studentId,
        quizId,
        quizSessionId,
        score,
        supabase
      );
    } catch (error) {
      log.error('Spaced rep scheduling failed (non-fatal):', error);
      // Continue - spaced rep failures shouldn't block the entire transaction
    }

    // =========================================================================
    // STEP 6: FETCH UPDATED GAMIFICATION STATE
    // =========================================================================
    const studentBadges = await getStudentBadges(studentId, supabase);
    const studentStreaks = await getStudentStreaks(studentId, supabase);
    const studentPoints = await getStudentPoints(studentId, supabase);
    const quizzesDueForReview = await getQuizzesDueForReview(studentId, supabase);

    // =========================================================================
    // RETURN COMPLETE GAMIFICATION RESPONSE
    // =========================================================================
    const result = {
      success: true,
      gamification: {
        badges: {
          awarded: badges,
          total: studentBadges.length,
          allBadges: studentBadges,
        },
        streaks: {
          current: streakUpdate?.currentStreak || 0,
          longest: streakUpdate?.longestStreak || 0,
          continued: streakUpdate?.streakContinued || false,
          badge7DayAwarded: streakUpdate?.badge7DayAwarded || false,
        },
        points: {
          awarded: pointsCalc.totalPoints,
          breakdown: {
            base: pointsCalc.basePoints,
            speedBonus: pointsCalc.speedBonus,
            accuracyBonus: pointsCalc.accuracyBonus,
            industryMultiplier: pointsCalc.industryMultiplier,
          },
          total: studentPoints.totalPoints,
          thisMonth: studentPoints.monthlyPoints,
          thisWeek: studentPoints.weeklyPoints,
          globalRank: studentPoints.globalRank,
          industryRank: studentPoints.industryRank,
        },
        spacedRepetition: spacedRepHistory ? {
          quality: spacedRepHistory.quality,
          nextReviewDate: spacedRepHistory.nextReviewDate,
          schedule: {
            intervalBefore: spacedRepHistory.intervalBefore,
            intervalAfter: spacedRepHistory.intervalAfter,
            easeFactorBefore: spacedRepHistory.easeFactorBefore.toFixed(2),
            easeFactorAfter: spacedRepHistory.easeFactorAfter.toFixed(2),
            repsBefore: spacedRepHistory.repsBefore,
            repsAfter: spacedRepHistory.repsAfter,
          },
        } : null,
        dashboard: {
          quizzesDueForReview: quizzesDueForReview.length,
          nextQuizzesToReview: quizzesDueForReview.slice(0, 3),
        },
      },
      metadata: {
        timestamp: now.toISOString(),
        studentId,
        quizId,
        quizSessionId,
      },
    };

    log.info(`Gamification applied successfully for student ${studentId}`, {
      badgesAwarded: badges.length,
      pointsAwarded: pointsCalc.totalPoints,
      streakContinued: streakUpdate?.streakContinued,
    });

    return result;
  } catch (error) {
    log.error('Gamification workflow failed:', error);
    throw error;
  }
}

/**
 * Get complete gamification dashboard for a student
 * Shows all badges, streaks, points, and upcoming reviews
 */
export async function getGamificationDashboard(
  studentId: string,
  userTimezone: string,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const [badges, streaks, points, quizzesDue] = await Promise.all([
      getStudentBadges(studentId, supabase),
      getStudentStreaks(studentId, supabase),
      getStudentPoints(studentId, supabase),
      getQuizzesDueForReview(studentId, supabase),
    ]);

    return {
      badges: {
        total: badges.length,
        list: badges,
      },
      streaks: {
        quizzes: streaks,
      },
      points: {
        ...points,
      },
      spacedRepetition: {
        quizzesDueToday: quizzesDue.length,
        quizzes: quizzesDue,
      },
    };
  } catch (error) {
    log.error('Failed to fetch gamification dashboard:', error);
    throw error;
  }
}

export {
  // Badges
  awardBadges,
  getStudentBadges,
  // Streaks
  updateStreak,
  getStudentStreaks,
  // Points
  calculatePoints,
  updatePoints,
  getStudentPoints,
  // Spaced Repetition
  scheduleNextReview,
  getQuizzesDueForReview,
};
