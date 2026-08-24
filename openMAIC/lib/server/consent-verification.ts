/**
 * GDPR Consent Verification
 * Provides utilities to check if students have given required consent
 * GDPR Article 7 compliant
 */

import { getSupabaseClient } from './supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('ConsentVerification');

export type ConsentType = 'privacy' | 'marketing' | 'analytics' | 'third_party' | 'data_processing';

interface ConsentCheckResult {
  hasConsent: boolean;
  consentRecord?: {
    id: string;
    given: boolean;
    given_at: string;
  };
  reason: string;
}

/**
 * Check if a student has given consent for a specific type
 * @param studentId - Student UUID
 * @param consentType - Type of consent to check ('privacy', 'marketing', 'analytics', etc.)
 * @returns ConsentCheckResult with consent status and details
 */
export async function checkStudentConsent(
  studentId: string,
  consentType: ConsentType = 'privacy'
): Promise<ConsentCheckResult> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('student_consents')
      .select('id, given, given_at')
      .eq('student_id', studentId)
      .eq('consent_type', consentType)
      .single();

    if (error) {
      log.warn(
        `No consent record found for student ${studentId}, type: ${consentType}`,
        error
      );
      return {
        hasConsent: false,
        reason: `No ${consentType} consent record found. Student must accept terms to proceed.`,
      };
    }

    if (!data || !data.given) {
      log.warn(
        `Student ${studentId} has not given ${consentType} consent`
      );
      return {
        hasConsent: false,
        consentRecord: data || undefined,
        reason: `Student has not given ${consentType} consent.`,
      };
    }

    log.debug(`Student ${studentId} has valid ${consentType} consent`, {
      given_at: data.given_at,
    });

    return {
      hasConsent: true,
      consentRecord: data,
      reason: 'Consent verified',
    };
  } catch (error) {
    log.error(`Error checking consent for student ${studentId}:`, error);
    return {
      hasConsent: false,
      reason: 'Error verifying consent. Please try again.',
    };
  }
}

/**
 * Record that a student has given consent (used during signup)
 * @param studentId - Student UUID
 * @param consentType - Type of consent
 * @param metadata - Optional metadata (source, IP, user agent, etc.)
 * @returns boolean - success status
 */
export async function recordStudentConsent(
  studentId: string,
  consentType: ConsentType = 'privacy',
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('student_consents')
      .upsert({
        student_id: studentId,
        consent_type: consentType,
        given: true,
        given_at: new Date().toISOString(),
        metadata: metadata || {},
      });

    if (error) {
      log.error(`Failed to record ${consentType} consent for student ${studentId}:`, error);
      return false;
    }

    log.info(`Recorded ${consentType} consent for student ${studentId}`);
    return true;
  } catch (error) {
    log.error(`Error recording consent for student ${studentId}:`, error);
    return false;
  }
}

/**
 * Require consent or throw error - used in API endpoints
 * Throws error if student has not given required consent
 * @param studentId - Student UUID
 * @param consentType - Type of consent required
 * @throws Error if consent not found or not given
 */
export async function requireStudentConsent(
  studentId: string,
  consentType: ConsentType = 'privacy'
): Promise<void> {
  const result = await checkStudentConsent(studentId, consentType);

  if (!result.hasConsent) {
    const error = new Error(
      `Student has not given ${consentType} consent. Please accept the privacy policy to continue.`
    );
    (error as any).code = 'CONSENT_REQUIRED';
    (error as any).consentType = consentType;
    throw error;
  }
}
