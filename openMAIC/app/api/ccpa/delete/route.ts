/**
 * CCPA Deletion Request Endpoint
 * POST /api/ccpa/delete
 *
 * California Consumer Privacy Act (CCPA §1798.105) compliant endpoint
 * Allows California residents to request deletion of personal information
 *
 * Response time requirement: Within 45 calendar days
 *
 * Request format:
 * {
 *   "email": "consumer@example.com",
 *   "verification_token": "magic-link-token",
 *   "reason": "optional reason for deletion"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';

const log = createLogger('CCPADeletion');

// ============================================================================
// CCPA RATE LIMITING
// Prevent abuse: max 3 deletion requests per 24 hours per email
// ============================================================================
const CCPA_DELETION_RATE_LIMIT = {
  limit: 3,
  window: 24 * 60 * 60 * 1000, // 24 hours
};

interface CCPADeletionRequest {
  email: string;
  verification_token?: string;
  reason?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CCPADeletionRequest;
    const { email, verification_token, reason } = body;

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL', message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // 🛡️ RATE LIMITING: Prevent deletion request abuse
    const rateLimitKey = `ccpa-deletion:${email.toLowerCase()}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      CCPA_DELETION_RATE_LIMIT.limit,
      CCPA_DELETION_RATE_LIMIT.window
    );

    if (!rateLimitResult.allowed) {
      log.warn(`CCPA deletion request rate limit exceeded for: ${email}`);
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: `You have exceeded the maximum number of deletion requests. Please try again in ${Math.ceil(rateLimitResult.retryAfterSeconds / 3600)} hours.`,
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const supabase = getSupabaseClient();

    // Try to find student by email
    // Note: For privacy reasons, we don't reveal if account exists or not
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    // Log CCPA deletion request (regardless of whether account found)
    const { data: ccpaRequest, error: logError } = await supabase
      .from('ccpa_requests')
      .insert({
        email: email.toLowerCase(),
        request_type: 'deletion',
        status: 'received',
        reason: reason || null,
        submitted_at: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        user_agent: req.headers.get('user-agent') || '',
      })
      .select('id')
      .single();

    if (logError) {
      log.error('Failed to log CCPA deletion request:', logError);
    }

    // If student not found, send generic response (privacy by design)
    if (fetchError || !student) {
      log.warn(`CCPA deletion request for non-existent email: ${email}`);

      // Send email notification
      try {
        const { sendNotificationEmail } = await import('@/lib/email/send-notification');
        await sendNotificationEmail('ccpa-deletion-no-account', {
          email: email,
          requestId: ccpaRequest?.id,
          responseDeadline: getDeadlineDate(),
          supportEmail: 'support@dailyagile.com',
        });
      } catch (emailError) {
        log.warn('Failed to send CCPA notification email:', emailError);
      }

      return NextResponse.json(
        {
          success: true,
          request_id: ccpaRequest?.id || null,
          message: 'Your CCPA deletion request has been received. We will review and process your request within 45 days.',
          response_deadline: getDeadlineDate(),
          status: 'received',
        },
        { status: 202 }
      );
    }

    // Update CCPA request with student ID and set processing status
    await supabase
      .from('ccpa_requests')
      .update({
        student_id: student.id,
        status: 'processing',
        response_due_at: getDeadlineDateISO(),
      })
      .eq('id', ccpaRequest?.id);

    // Log privacy event
    await supabase.from('privacy_audit_log').insert({
      student_id: student.id,
      event_type: 'ccpa_deletion_requested',
      description: `CCPA deletion request received (request_id: ${ccpaRequest?.id}, reason: ${reason || 'not provided'})`,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
    });

    // Send confirmation email to consumer
    try {
      const { sendNotificationEmail } = await import('@/lib/email/send-notification');
      await sendNotificationEmail('ccpa-deletion-received', {
        email: student.email,
        requestId: ccpaRequest?.id,
        responseDeadline: getDeadlineDate(),
        supportEmail: 'support@dailyagile.com',
      });
    } catch (emailError) {
      log.warn('Failed to send CCPA confirmation email:', emailError);
    }

    log.info(`CCPA deletion request created for: ${email} (request_id: ${ccpaRequest?.id})`);

    return NextResponse.json(
      {
        success: true,
        request_id: ccpaRequest?.id,
        status: 'received',
        message:
          'Your CCPA deletion request has been received. We will process your request and delete your personal information within 45 days.',
        data: {
          email: email,
          request_id: ccpaRequest?.id,
          submitted_at: new Date().toISOString(),
          response_due_at: getDeadlineDate(),
          exceptions: [
            'Audit logs may be retained for legal compliance purposes',
            'Quiz attempt records may be retained for regulatory compliance (3 years)',
          ],
        },
      },
      { status: 202 }
    );
  } catch (error) {
    log.error('Unexpected error in CCPA deletion:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Get CCPA 45-day response deadline
 */
function getDeadlineDate(): string {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 45);
  return deadline.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get CCPA 45-day response deadline in ISO format
 */
function getDeadlineDateISO(): string {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 45);
  return deadline.toISOString();
}
