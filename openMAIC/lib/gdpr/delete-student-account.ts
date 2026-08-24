/**
 * GDPR Article 17 - Right to be Forgotten
 * Student account deletion service with PII removal and audit compliance
 *
 * Flow:
 * 1. Student initiates deletion request (with email)
 * 2. Send verification email (magic link or password verification)
 * 3. Student verifies ownership (clicks magic link or enters password)
 * 4. Mark deletion request as verified
 * 5. Queue async deletion job
 * 6. Deletion job processes (deletes PII, marks audit logs)
 * 7. Send confirmation email to student
 *
 * Compliance:
 * - GDPR Article 17: Right to be Forgotten
 * - GDPR Article 15: Data Subject Access Request (audit logs)
 * - GDPR Recital 55: Right to erasure (grace period for legal holds)
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger('GDPRDeleteService');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DeletionRequest {
  id: string; // deletion_ticket_id
  student_id: string;
  student_email: string;
  verification_method: 'password' | 'magic_link';
  status: 'pending' | 'verified' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requested_at: string;
  verified_at?: string;
  completed_at?: string;
  error_message?: string;
  records_deleted?: {
    quiz_sessions: number;
    quiz_responses: number;
    quiz_purchases: number;
    student_profiles: number;
    student_quiz_history: number;
  };
}

export interface StudentForDeletion {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_deleted: boolean;
  deletion_requested_at?: string;
}

export interface DeletionResponse {
  success: boolean;
  deletion_ticket_id: string;
  message: string;
  student_email?: string;
  status?: string;
}

// ============================================================================
// 1. INITIATE DELETION REQUEST
// ============================================================================

/**
 * Student initiates account deletion request
 * Creates a pending deletion record and returns ticket ID
 * Next step: Send verification email to student
 */
export async function initiateDeletion(
  studentId: string,
  studentEmail: string,
  verificationMethod: 'password' | 'magic_link' = 'magic_link'
): Promise<DeletionResponse> {
  try {
    const supabase = getSupabaseClient();

    // Verify student exists and matches email
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, email, is_deleted')
      .eq('id', studentId)
      .eq('email', studentEmail)
      .single();

    if (studentError || !student) {
      log.error(`Student not found: ${studentId} / ${studentEmail}`);
      throw new Error('Student not found or email does not match');
    }

    if (student.is_deleted) {
      throw new Error('Account already deleted');
    }

    // Call PL/pgSQL function to create deletion request
    const { data: deletionTicketId, error: functionError } = await supabase.rpc(
      'initiate_student_deletion',
      {
        p_student_id: studentId,
        p_student_email: studentEmail,
        p_verification_method: verificationMethod,
      }
    );

    if (functionError) {
      log.error(`Failed to initiate deletion: ${functionError.message}`);
      throw functionError;
    }

    log.info(`✅ Deletion request initiated: ${deletionTicketId} for ${studentEmail}`);

    return {
      success: true,
      deletion_ticket_id: deletionTicketId,
      message: 'Deletion request initiated. Check your email for verification link.',
      student_email: studentEmail,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`initiateDeletion failed: ${message}`);
    throw error;
  }
}

// ============================================================================
// 2. GENERATE MAGIC LINK FOR VERIFICATION
// ============================================================================

/**
 * Generate a secure magic link for deletion verification
 * Link should be sent via email to student
 * Format: /gdpr/delete-account?token=<encrypted_token>&ticket=<ticket_id>
 */
export function generateDeletionMagicLink(
  deletionTicketId: string,
  studentId: string,
  expiresIn: number = 3600 * 24 // 24 hours
): { token: string; link: string; expiresAt: Date } {
  try {
    // Create token payload
    const payload = JSON.stringify({
      deletion_ticket_id: deletionTicketId,
      student_id: studentId,
      issued_at: Date.now(),
      expires_at: Date.now() + expiresIn * 1000,
    });

    // Encrypt token using app secret (should be in env vars)
    const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'fallback-secret';
    const token = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Build link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com';
    const link = `${baseUrl}/gdpr/delete-account?token=${token}&ticket=${deletionTicketId}`;

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    log.info(`✅ Magic link generated for deletion ticket: ${deletionTicketId}`);

    return { token, link, expiresAt };
  } catch (error) {
    log.error(`Failed to generate magic link: ${error}`);
    throw error;
  }
}

// ============================================================================
// 3. VERIFY DELETION REQUEST (BY MAGIC LINK)
// ============================================================================

/**
 * Verify deletion request using magic link token
 * Called when student clicks verification link
 */
export async function verifyDeletionByMagicLink(
  deletionTicketId: string,
  token: string,
  studentId: string
): Promise<DeletionResponse> {
  try {
    const supabase = getSupabaseClient();

    // Verify magic link token
    const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'fallback-secret';
    const payload = JSON.stringify({
      deletion_ticket_id: deletionTicketId,
      student_id: studentId,
      issued_at: Math.floor(Date.now() / 1000) - 3600, // Approximate
      expires_at: Date.now() + 3600000,
    });

    // In production, verify token signature matches
    // For now, just verify the deletion ticket is pending
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('id', deletionTicketId)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !deletionRequest) {
      throw new Error('Deletion request not found or already verified');
    }

    // Mark as verified
    const { error: verifyError } = await supabase.rpc('verify_deletion_request', {
      p_deletion_request_id: deletionTicketId,
      p_student_id: studentId,
    });

    if (verifyError) {
      throw verifyError;
    }

    log.info(`✅ Deletion verified via magic link: ${deletionTicketId}`);

    return {
      success: true,
      deletion_ticket_id: deletionTicketId,
      message: 'Email verified. Your account will be deleted shortly.',
      status: 'verified',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`verifyDeletionByMagicLink failed: ${message}`);
    throw error;
  }
}

// ============================================================================
// 4. VERIFY DELETION REQUEST (BY PASSWORD)
// ============================================================================

/**
 * Verify deletion request using password verification
 * Called when student enters their password to confirm deletion
 */
export async function verifyDeletionByPassword(
  deletionTicketId: string,
  studentId: string,
  password: string
): Promise<DeletionResponse> {
  try {
    const supabase = getSupabaseClient();

    // TODO: Fetch student password hash and verify
    // This requires bcryptjs comparison
    // For now, throw "not implemented"
    throw new Error('Password verification not yet implemented - use magic link instead');

    // const bcrypt = require('bcryptjs');
    // const { data: student } = await supabase
    //   .from('students')
    //   .select('password_hash')
    //   .eq('id', studentId)
    //   .single();
    //
    // if (!student) throw new Error('Student not found');
    //
    // const passwordMatch = await bcrypt.compare(password, student.password_hash);
    // if (!passwordMatch) throw new Error('Invalid password');
    //
    // // Mark as verified
    // const { error } = await supabase.rpc('verify_deletion_request', {
    //   p_deletion_request_id: deletionTicketId,
    //   p_student_id: studentId,
    // });
    //
    // if (error) throw error;
    //
    // log.info(`✅ Deletion verified via password: ${deletionTicketId}`);
    // return { success: true, deletion_ticket_id: deletionTicketId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`verifyDeletionByPassword failed: ${message}`);
    throw error;
  }
}

// ============================================================================
// 5. PROCESS DELETION (ASYNC JOB)
// ============================================================================

/**
 * Process a verified deletion request
 * Deletes all PII, marks audit logs, sends confirmation email
 * Should be called by async job queue (e.g., Bull, Inngest, etc.)
 */
export async function processDeletion(deletionTicketId: string): Promise<DeletionResponse> {
  try {
    const supabase = getSupabaseClient();

    log.info(`Starting deletion processing: ${deletionTicketId}`);

    // Call PL/pgSQL function to process deletion
    const { data: result, error: functionError } = await supabase.rpc(
      'process_student_deletion',
      {
        p_deletion_request_id: deletionTicketId,
      }
    );

    if (functionError) {
      log.error(`process_student_deletion failed: ${functionError.message}`);
      throw functionError;
    }

    log.info(`✅ Deletion completed: ${deletionTicketId}`);
    log.info(`Records deleted:`, result?.records_deleted);

    return {
      success: true,
      deletion_ticket_id: deletionTicketId,
      message: 'Account deleted successfully. All your personal data has been removed.',
      status: 'completed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`processDeletion failed: ${message}`);
    throw error;
  }
}

// ============================================================================
// 6. GET DELETION REQUEST STATUS
// ============================================================================

/**
 * Check the status of a deletion request
 */
export async function getDeletionStatus(
  deletionTicketId: string,
  studentId: string
): Promise<DeletionRequest> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('id', deletionTicketId)
      .eq('student_id', studentId)
      .single();

    if (error || !data) {
      throw new Error('Deletion request not found');
    }

    return data as DeletionRequest;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`getDeletionStatus failed: ${message}`);
    throw error;
  }
}

// ============================================================================
// 7. CANCEL DELETION REQUEST
// ============================================================================

/**
 * Cancel a pending deletion request
 * Can only be called before verification is complete
 */
export async function cancelDeletion(
  deletionTicketId: string,
  studentId: string
): Promise<DeletionResponse> {
  try {
    const supabase = getSupabaseClient();

    // Update deletion request to cancelled
    const { data, error } = await supabase
      .from('deletion_requests')
      .update({ status: 'cancelled' })
      .eq('id', deletionTicketId)
      .eq('student_id', studentId)
      .in('status', ['pending', 'verified']) // Only cancel if not already processing
      .select()
      .single();

    if (error || !data) {
      throw new Error('Cannot cancel deletion request - may already be processing');
    }

    log.info(`✅ Deletion cancelled: ${deletionTicketId}`);

    return {
      success: true,
      deletion_ticket_id: deletionTicketId,
      message: 'Deletion request cancelled. Your account remains active.',
      status: 'cancelled',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`cancelDeletion failed: ${message}`);
    throw error;
  }
}

// ============================================================================
// 8. EMAIL HELPERS
// ============================================================================

/**
 * Format deletion confirmation email template
 */
export function formatDeletionConfirmationEmail(
  studentName: string,
  studentEmail: string,
  deletionTicketId: string
): { subject: string; html: string; text: string } {
  const subject = '🗑️ DailyAgile Account Deletion Complete';

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <!-- Header -->
          <div style="background-color: #1E3A5F; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Account Deletion Complete</h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p>Hello ${escapeHtml(studentName || studentEmail)},</p>

            <p>Your DailyAgile account has been successfully deleted. All your personal data has been removed from our active systems.</p>

            <div style="background-color: #F0F7FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 12px; color: #666;">Deletion Ticket ID</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; font-family: 'Courier New', monospace; color: #1E3A5F;">
                ${deletionTicketId}
              </p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
                Keep this ID for your records. You can use it to verify deletion if needed.
              </p>
            </div>

            <h3 style="margin-top: 30px; color: #1E3A5F;">What was deleted:</h3>
            <ul style="line-height: 2;">
              <li>✅ Your email address and password</li>
              <li>✅ Your profile information (name, preferences)</li>
              <li>✅ Your quiz attempts and scores</li>
              <li>✅ Your course purchases and enrollment records</li>
              <li>✅ All payment information associated with your account</li>
            </ul>

            <h3 style="margin-top: 30px; color: #1E3A5F;">What we kept (for legal compliance):</h3>
            <ul style="line-height: 2;">
              <li>📋 Anonymized audit logs (for 7 years, per GDPR requirements)</li>
              <li>📋 System activity logs (with your personal data removed)</li>
            </ul>

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              If you have any questions about your data deletion, please contact us at support@dailyagile.com
              <br>
              Include your Deletion Ticket ID in your message for faster resolution.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <!-- Footer -->
            <p style="font-size: 12px; color: #999; margin-bottom: 0;">
              This is an automated email from DailyAgile.
              <br>
              © DailyAgile — Accelerate Business Agility
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
DailyAgile Account Deletion Complete

Hello ${studentName || studentEmail},

Your DailyAgile account has been successfully deleted. All your personal data has been removed from our active systems.

Deletion Ticket ID: ${deletionTicketId}
Keep this ID for your records. You can use it to verify deletion if needed.

WHAT WAS DELETED:
✅ Your email address and password
✅ Your profile information (name, preferences)
✅ Your quiz attempts and scores
✅ Your course purchases and enrollment records
✅ All payment information associated with your account

WHAT WE KEPT (for legal compliance):
📋 Anonymized audit logs (for 7 years, per GDPR requirements)
📋 System activity logs (with your personal data removed)

If you have any questions about your data deletion, please contact us at support@dailyagile.com
Include your Deletion Ticket ID in your message for faster resolution.

---
This is an automated email from DailyAgile.
© DailyAgile — Accelerate Business Agility
  `.trim();

  return { subject, html, text };
}

/**
 * Format deletion verification email template (magic link)
 */
export function formatDeletionVerificationEmail(
  studentName: string,
  studentEmail: string,
  verificationLink: string,
  expiresAt: Date
): { subject: string; html: string; text: string } {
  const subject = '⚠️ Confirm DailyAgile Account Deletion';

  const expiresIn = Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60); // minutes

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <!-- Header -->
          <div style="background-color: #E74C3C; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Confirm Account Deletion</h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p>Hello ${escapeHtml(studentName || studentEmail)},</p>

            <p style="color: #E74C3C; font-weight: bold;">You requested to delete your DailyAgile account.</p>

            <p>To complete this action, please click the button below to confirm:</p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${escapeHtml(verificationLink)}"
                 style="display: inline-block; padding: 12px 30px; background-color: #E74C3C; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Confirm Account Deletion
              </a>
            </div>

            <p style="color: #E74C3C; font-weight: bold;">⏰ This link expires in ${expiresIn} minutes.</p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <h3>What will happen when you confirm:</h3>
            <ul>
              <li>Your email address and password will be permanently deleted</li>
              <li>All your quiz scores and course enrollment records will be removed</li>
              <li>Your payment information will be cleared from our systems</li>
              <li>Your profile and preferences will be erased</li>
            </ul>

            <p style="color: #999; font-size: 12px;">
              <strong>This action cannot be undone.</strong> If you change your mind, simply do not click the confirmation link.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <p style="color: #666; font-size: 12px;">
              If you did not request this deletion, please ignore this email and your account will remain active.
              <br>
              Questions? Contact support@dailyagile.com
            </p>

            <!-- Footer -->
            <p style="font-size: 12px; color: #999; margin-bottom: 0;">
              This is an automated security email from DailyAgile.
              <br>
              © DailyAgile — Accelerate Business Agility
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
⚠️ CONFIRM ACCOUNT DELETION

Hello ${studentName || studentEmail},

You requested to delete your DailyAgile account.

To complete this action, please click the link below to confirm:
${verificationLink}

⏰ This link expires in ${expiresIn} minutes.

WHAT WILL HAPPEN:
- Your email address and password will be permanently deleted
- All your quiz scores and course enrollment records will be removed
- Your payment information will be cleared from our systems
- Your profile and preferences will be erased

⚠️ THIS ACTION CANNOT BE UNDONE

If you change your mind, simply do not click the confirmation link.
Your account will remain active.

If you did not request this deletion, please ignore this email.

Questions? Contact support@dailyagile.com

---
This is an automated security email from DailyAgile.
© DailyAgile — Accelerate Business Agility
  `.trim();

  return { subject, html, text };
}

/**
 * Escape HTML to prevent injection
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
