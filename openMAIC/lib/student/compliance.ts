/**
 * Compliance & GDPR/CCPA Logging
 *
 * Handles audit logging for compliance with:
 * - GDPR (EU) - Article 5 (lawfulness), Article 15 (access), Article 17 (deletion)
 * - CCPA (California) - Right to know, right to delete, right to opt-out
 * - LGPD (Brazil) - Similar to GDPR
 *
 * All compliance events are logged for audit trails and regulatory compliance.
 */

export type ComplianceEventType =
  | 'consent_given'
  | 'consent_changed'
  | 'data_export_requested'
  | 'data_deletion_requested'
  | 'quiz_attempt'
  | 'badge_awarded'
  | 'progress_updated'
  | 'login'
  | 'logout'
  | 'account_created'
  | 'account_deleted'
  | 'email_bounced'
  | 'email_sent';

export type ConsentType =
  | 'marketing'
  | 'analytics'
  | 'data_processing'
  | 'cookies'
  | 'third_party_sharing';

export interface ComplianceLogEntry {
  id: string;
  student_id: string;
  event_type: ComplianceEventType;
  event_data: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  country_code?: string;
  logged_at: Date;
  retention_until?: Date; // When this log can be deleted per compliance rules
}

export interface ConsentRecord {
  student_id: string;
  consent_type: ConsentType;
  value: boolean; // true = consented, false = not consented
  given_at: Date;
  version: number; // Consent policy version
}

/**
 * Extract IP address from request headers
 * Handles various proxy configurations (Cloudflare, AWS Load Balancer, etc.)
 *
 * @param request - Request object with headers
 * @returns IP address string or 'unknown'
 */
export function extractIpAddress(request: Request): string {
  const headers = request.headers;

  // Try various headers in order of preference
  const candidates = [
    headers.get('cf-connecting-ip'), // Cloudflare
    headers.get('x-forwarded-for'), // Standard proxy header
    headers.get('x-real-ip'), // Nginx
    headers.get('x-client-ip'), // Custom
  ];

  for (const candidate of candidates) {
    if (candidate) {
      // x-forwarded-for can be comma-separated, get first IP
      return candidate.split(',')[0].trim();
    }
  }

  return 'unknown';
}

/**
 * Extract country code from IP address using geolocation
 * In production, use MaxMind GeoIP2 or similar service
 *
 * @param ipAddress - IP address to geolocate
 * @returns ISO country code or undefined
 *
 * @example
 * const country = await getCountryFromIp('203.0.113.42');
 * console.log(country); // 'US'
 */
export async function getCountryFromIp(ipAddress: string): Promise<string | undefined> {
  // Placeholder for geolocation API
  // In production, integrate with:
  // - MaxMind GeoIP2 (most accurate)
  // - IP2Location
  // - ipstack
  // - Cloudflare's built-in geolocation headers (cf-ipcountry)

  // For now, return undefined and rely on cf-ipcountry header
  return undefined;
}

/**
 * Determine data retention period based on event type and jurisdiction
 *
 * @param eventType - Type of compliance event
 * @param countryCode - ISO country code
 * @returns Date when log should be deleted
 *
 * GDPR: 3 years minimum for audit logs
 * CCPA: 2 years minimum
 * General best practice: 7 years for financial/legal records
 */
export function calculateRetentionDate(
  eventType: ComplianceEventType,
  countryCode?: string
): Date {
  const now = new Date();
  let retentionYears = 3; // Default to GDPR standard

  // CCPA states: 2 years
  if (countryCode === 'US') {
    retentionYears = 2;
  }

  // LGPD (Brazil): Similar to GDPR, 3 years
  if (countryCode === 'BR') {
    retentionYears = 3;
  }

  // Financial records need longer retention
  if (eventType === 'quiz_attempt' || eventType === 'progress_updated') {
    retentionYears = 7;
  }

  const retentionDate = new Date(now);
  retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);

  return retentionDate;
}

/**
 * Log a compliance event to the audit trail
 * Typically called from API endpoints that modify student data
 *
 * @param studentId - Student ID
 * @param eventType - Type of event
 * @param eventData - Event-specific data
 * @param request - HTTP request object
 *
 * @example
 * // Log quiz attempt
 * await logComplianceEvent(
 *   studentId,
 *   'quiz_attempt',
 *   { quiz_id: '123', score: 85, time_spent: 300 },
 *   request
 * );
 *
 * // Log consent given
 * await logComplianceEvent(
 *   studentId,
 *   'consent_given',
 *   { consent_type: 'marketing', version: 2 },
 *   request
 * );
 */
export async function logComplianceEvent(
  studentId: string,
  eventType: ComplianceEventType,
  eventData: Record<string, unknown>,
  request: Request,
  countryCode?: string
): Promise<ComplianceLogEntry> {
  const ipAddress = extractIpAddress(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const country = countryCode || request.headers.get('cf-ipcountry') || undefined;

  const logEntry: ComplianceLogEntry = {
    id: generateLogId(),
    student_id: studentId,
    event_type: eventType,
    event_data: {
      ...eventData,
      timestamp: new Date().toISOString(),
    },
    ip_address: hashIpForPrivacy(ipAddress), // Hash IP for privacy
    user_agent: userAgent,
    country_code: country,
    logged_at: new Date(),
    retention_until: calculateRetentionDate(eventType, country),
  };

  // In production, save to Supabase audit_logs table
  // await supabase.from('audit_logs').insert([logEntry]);

  console.log('[COMPLIANCE]', logEntry.event_type, {
    student: logEntry.student_id,
    timestamp: logEntry.logged_at.toISOString(),
  });

  return logEntry;
}

/**
 * Hash IP address for privacy while maintaining uniqueness
 * Allows identifying the same user across sessions without storing full IP
 *
 * @param ipAddress - IP address to hash
 * @returns Hashed IP (first 16 chars of hash)
 */
function hashIpForPrivacy(ipAddress: string): string {
  if (ipAddress === 'unknown') {
    return 'unknown';
  }

  // In production, use crypto.subtle for SHA-256:
  // const encoded = new TextEncoder().encode(ipAddress + secretSalt);
  // const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  // const hashArray = Array.from(new Uint8Array(hashBuffer));
  // return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // For now, simple hash simulation
  let hash = 0;
  for (let i = 0; i < ipAddress.length; i++) {
    const char = ipAddress.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `ip_${Math.abs(hash).toString(16)}`;
}

/**
 * Generate unique log ID
 * @returns Unique identifier for compliance log
 */
function generateLogId(): string {
  return `compliance_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Record student consent to terms, privacy policy, marketing, etc.
 *
 * @param studentId - Student ID
 * @param consentType - Type of consent
 * @param value - true if consented, false if denied
 * @param version - Consent policy version (increments when terms change)
 * @param request - HTTP request for logging
 *
 * @example
 * await recordConsent(
 *   studentId,
 *   'marketing',
 *   true,
 *   2,
 *   request
 * );
 */
export async function recordConsent(
  studentId: string,
  consentType: ConsentType,
  value: boolean,
  version: number,
  request: Request
): Promise<void> {
  await logComplianceEvent(
    studentId,
    value ? 'consent_given' : 'consent_changed',
    {
      consent_type: consentType,
      value,
      version,
    },
    request
  );

  // In production, save to Supabase consent_records table
  // const { error } = await supabase.from('consent_records').insert([{
  //   student_id: studentId,
  //   consent_type: consentType,
  //   value,
  //   given_at: new Date(),
  //   version
  // }]);
  // if (error) throw error;
}

/**
 * Handle GDPR data access request (Article 15)
 * Return all personal data for a student
 *
 * @param studentId - Student ID
 * @returns All student data in JSON format
 */
export async function generateGdprDataExport(
  studentId: string
): Promise<{
  export_date: string;
  student: Record<string, unknown>;
  quiz_attempts: Array<Record<string, unknown>>;
  badges: Array<Record<string, unknown>>;
  points: Array<Record<string, unknown>>;
  streaks: Array<Record<string, unknown>>;
  audit_logs: Array<Record<string, unknown>>;
}> {
  // In production, query all student data from Supabase

  return {
    export_date: new Date().toISOString(),
    student: {
      // Placeholder
      id: studentId,
      exported_at: new Date().toISOString(),
    },
    quiz_attempts: [],
    badges: [],
    points: [],
    streaks: [],
    audit_logs: [],
  };
}

/**
 * Handle GDPR data deletion request (Article 17 - Right to Be Forgotten)
 *
 * @param studentId - Student ID
 * @param request - HTTP request for logging
 * @param reason - Reason for deletion request
 *
 * IMPORTANT NOTES:
 * - Cannot delete quiz attempts (required for audit trail and fraud prevention)
 * - Cannot delete transaction records (financial compliance)
 * - CAN delete personal data (email, name, profile)
 * - CAN anonymize quiz responses after retention period
 */
export async function handleGdprDeletionRequest(
  studentId: string,
  request: Request,
  reason?: string
): Promise<void> {
  await logComplianceEvent(
    studentId,
    'data_deletion_requested',
    {
      reason: reason || 'No reason provided',
      action: 'deletion_scheduled',
    },
    request
  );

  // In production, implement:
  // 1. Mark student account as "deletion_requested"
  // 2. Schedule deletion job for 30 days later (allow for disputes)
  // 3. Keep only anonymized data needed for compliance
  // 4. Delete personal identifiable information (PII)
}

/**
 * Log CCPA-specific opt-out request
 *
 * @param studentId - Student ID
 * @param optOutType - 'sale' (data sale) or 'targeted_ads'
 * @param request - HTTP request for logging
 */
export async function handleCcpaOptOut(
  studentId: string,
  optOutType: 'sale' | 'targeted_ads',
  request: Request
): Promise<void> {
  await logComplianceEvent(
    studentId,
    'consent_changed',
    {
      consent_type: optOutType === 'sale' ? 'third_party_sharing' : 'analytics',
      value: false,
      regulation: 'CCPA',
    },
    request
  );

  // In production:
  // 1. Add student to "do not sell" list
  // 2. Remove from third-party data sharing
  // 3. Stop targeted advertising
}

/**
 * Get consent status for a student
 *
 * @param studentId - Student ID
 * @param consentType - Type of consent to check
 * @returns true if consented, false if denied
 *
 * @example
 * const hasMarketingConsent = await getConsent(studentId, 'marketing');
 */
export async function getConsent(
  studentId: string,
  consentType: ConsentType
): Promise<boolean> {
  // In production, query from Supabase consent_records table
  // Find latest record for this student and consent type
  // const { data } = await supabase
  //   .from('consent_records')
  //   .select('value')
  //   .eq('student_id', studentId)
  //   .eq('consent_type', consentType)
  //   .order('given_at', { ascending: false })
  //   .limit(1)
  //   .single();
  // return data?.value ?? false;

  return false;
}

/**
 * Anonymize audit logs older than retention date
 * Called by scheduled job to clean up old compliance logs
 *
 * Replaces PII with hashes/randomized data while keeping event type
 * for compliance audit trails
 */
export async function anonymizeOldAuditLogs(): Promise<number> {
  // In production:
  // 1. Find all audit logs older than retention_until
  // 2. Replace student_id with hash
  // 3. Replace ip_address with hash
  // 4. Remove user_agent (fingerprinting risk)
  // 5. Keep event_type and timestamp for compliance
  // 6. Return count of anonymized records

  console.log('[COMPLIANCE] Anonymization job would run here');
  return 0;
}

/**
 * Compliance report builder for regulatory audits
 *
 * @param startDate - Report period start
 * @param endDate - Report period end
 * @returns Compliance summary for audit
 */
export async function generateComplianceReport(
  startDate: Date,
  endDate: Date
): Promise<{
  period: { start: string; end: string };
  total_logs: number;
  events_by_type: Record<string, number>;
  countries_affected: string[];
  deletion_requests: number;
  export_requests: number;
  consent_changes: number;
}> {
  // In production, query audit_logs table with date range

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    total_logs: 0,
    events_by_type: {},
    countries_affected: [],
    deletion_requests: 0,
    export_requests: 0,
    consent_changes: 0,
  };
}

/**
 * Check if student's data deletion can proceed
 * (e.g., after 30-day dispute period)
 *
 * @param studentId - Student ID
 * @returns true if safe to delete
 */
export async function canProceedWithDeletion(studentId: string): Promise<boolean> {
  // In production:
  // 1. Check if deletion was requested 30+ days ago
  // 2. Check if there are any active disputes
  // 3. Check if all transaction period has ended
  // 4. Return true only if safe to proceed

  return false;
}
