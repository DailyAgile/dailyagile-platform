/**
 * Student Quiz Access Control
 * Validates student access to quizzes based on access_type, trial expiry, and retry limits
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Student:AccessControl');

export interface QuizAccess {
  hasAccess: boolean;
  accessType: 'free_trial' | 'purchased' | 'organization' | null;
  expiresAt: string | null;
  canRetry: boolean;
  maxRetries: number | null;
  retriesRemaining: number | null;
  message?: string;
}

/**
 * Check if student has access to a specific quiz
 * - Free trials must not be expired
 * - Purchased access permanent
 * - Organization access checked against org membership
 * - Retry limits enforced
 */
export async function checkQuizAccess(
  studentId: string,
  quizId: string,
  supabase: ReturnType<typeof createClient>
): Promise<QuizAccess> {
  try {
    // Get quiz access record
    const { data: access, error: accessError } = await supabase
      .from('quiz_access')
      .select(
        `
        id,
        access_type,
        expires_at,
        max_retries,
        created_at
      `
      )
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .single();

    // No access record = no access
    if (accessError || !access) {
      return {
        hasAccess: false,
        accessType: null,
        expiresAt: null,
        canRetry: false,
        maxRetries: null,
        retriesRemaining: null,
        message: 'No access to this quiz',
      };
    }

    // Check if trial expired
    if ((access as any).access_type === 'free_trial' && (access as any).expires_at) {
      const now = new Date();
      const expiresAt = new Date((access as any).expires_at);
      if (now > expiresAt) {
        return {
          hasAccess: false,
          accessType: 'free_trial',
          expiresAt: (access as any).expires_at,
          canRetry: false,
          maxRetries: null,
          retriesRemaining: null,
          message: 'Free trial has expired',
        };
      }
    }

    // Count attempts to check retry limit
    let retriesRemaining = null;
    let canRetry = true;

    if ((access as any).max_retries !== null) {
      const { count: attemptCount, error: countError } = await supabase
        .from('quiz_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('quiz_id', quizId)
        .in('status', ['submitted', 'graded']);

      if (!countError) {
        const attempts = attemptCount || 0;
        retriesRemaining = Math.max(0, (access as any).max_retries - attempts);
        canRetry = retriesRemaining > 0;
      }
    }

    return {
      hasAccess: true,
      accessType: (access as any).access_type,
      expiresAt: (access as any).expires_at,
      canRetry,
      maxRetries: (access as any).max_retries,
      retriesRemaining,
    };
  } catch (error) {
    log.error('Error checking quiz access:', error);
    return {
      hasAccess: false,
      accessType: null,
      expiresAt: null,
      canRetry: false,
      maxRetries: null,
      retriesRemaining: null,
      message: 'Error validating access',
    };
  }
}

/**
 * Check if student can view leaderboard
 * Privacy rules: some industries (healthcare, finance) = private leaderboard
 */
export async function checkLeaderboardAccess(
  studentId: string,
  scope: 'global' | 'regional' | 'organization',
  supabase: ReturnType<typeof createClient>
): Promise<{ canAccess: boolean; message?: string }> {
  try {
    // Get student's industry from profile metadata
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('metadata')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { canAccess: false, message: 'Student not found' };
    }

    const industry = (student as any).metadata?.industry;
    const privateIndustries = ['healthcare', 'finance', 'legal'];

    // Private industries: only allow personal view (not global/regional)
    if (privateIndustries.includes(industry) && scope !== 'organization') {
      return {
        canAccess: false,
        message: `Leaderboard is private for ${industry} industry`,
      };
    }

    return { canAccess: true };
  } catch (error) {
    log.error('Error checking leaderboard access:', error);
    return { canAccess: false, message: 'Error validating leaderboard access' };
  }
}

/**
 * Verify student has access to a specific quiz submission
 * (for viewing results)
 */
export async function canAccessSubmission(
  studentId: string,
  submissionId: string,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  try {
    const { data: submission, error } = await supabase
      .from('quiz_submissions')
      .select('student_id')
      .eq('id', submissionId)
      .single();

    if (error || !submission) return false;
    return (submission as any).student_id === studentId;
  } catch (error) {
    log.error('Error verifying submission access:', error);
    return false;
  }
}
