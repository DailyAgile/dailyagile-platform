/**
 * Analytics Service
 * Tracks student progress, completion rates, and performance
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('AnalyticsService');

export interface StudentAnalytics {
  studentId: string;
  totalQuizzesTaken: number;
  completedQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  lastActivityDate: string;
}

export interface QuizAnalytics {
  quizId: string;
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  averageTimeSpent: number;
}

/**
 * Get student analytics
 */
export async function getStudentAnalytics(studentId: string): Promise<StudentAnalytics | null> {
  try {
    const supabase = getSupabaseClient();

    // Get quiz attempts for this student
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('score, time_spent_minutes, attempted_at')
      .eq('student_id', studentId);

    if (attemptsError) {
      log.error('Failed to fetch student attempts:', attemptsError);
      return null;
    }

    const totalQuizzesTaken = attempts?.length || 0;
    const completedQuizzes = attempts?.filter((a: any) => a.score !== null).length || 0;
    const totalTimeSpent = attempts?.reduce((sum: number, a: any) => sum + (a.time_spent_minutes || 0), 0) || 0;
    const averageScore = completedQuizzes > 0
      ? Math.round(attempts!.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / completedQuizzes)
      : 0;

    const lastActivityDate = attempts && attempts.length > 0
      ? new Date(attempts[0].attempted_at).toISOString().split('T')[0]
      : '';

    return {
      studentId,
      totalQuizzesTaken,
      completedQuizzes,
      averageScore,
      totalTimeSpent,
      lastActivityDate,
    };
  } catch (error) {
    log.error('Error in getStudentAnalytics:', error);
    return null;
  }
}

/**
 * Get quiz analytics
 */
export async function getQuizAnalytics(quizId: string): Promise<QuizAnalytics | null> {
  try {
    const supabase = getSupabaseClient();

    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('score, time_spent_minutes')
      .eq('quiz_id', quizId);

    if (error) {
      log.error('Failed to fetch quiz attempts:', error);
      return null;
    }

    const totalAttempts = attempts?.length || 0;
    const completedAttempts = attempts?.filter((a: any) => a.score !== null).length || 0;
    const averageScore = completedAttempts > 0
      ? Math.round(attempts!.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / completedAttempts)
      : 0;
    const completionRate = totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0;
    const averageTimeSpent = totalAttempts > 0
      ? Math.round(attempts!.reduce((sum: number, a: any) => sum + (a.time_spent_minutes || 0), 0) / totalAttempts)
      : 0;

    return {
      quizId,
      totalAttempts,
      averageScore,
      completionRate,
      averageTimeSpent,
    };
  } catch (error) {
    log.error('Error in getQuizAnalytics:', error);
    return null;
  }
}

/**
 * Get leaderboard for a quiz
 */
export async function getQuizLeaderboard(quizId: string, limit: number = 10) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('student_id, score, attempted_at, students(first_name, last_name)')
      .eq('quiz_id', quizId)
      .eq('status', 'completed')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Failed to fetch leaderboard:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error in getQuizLeaderboard:', error);
    return [];
  }
}

/**
 * Track quiz engagement
 */
export async function trackQuizEngagement(
  studentId: string,
  quizId: string,
  timeSpentMinutes: number,
  questionsAnswered: number
) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('quiz_engagement')
      .insert({
        student_id: studentId,
        quiz_id: quizId,
        time_spent_minutes: timeSpentMinutes,
        questions_answered: questionsAnswered,
        tracked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to track engagement:', error);
      return null;
    }

    return data;
  } catch (error) {
    log.error('Error in trackQuizEngagement:', error);
    return null;
  }
}
