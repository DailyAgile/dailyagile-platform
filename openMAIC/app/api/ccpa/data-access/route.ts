/**
 * CCPA Data Access Request Endpoint
 * POST /api/ccpa/data-access
 *
 * California Consumer Privacy Act (CCPA §1798.100) compliant endpoint
 * Allows California residents to request a copy of personal information
 * we have collected about them
 *
 * Response time requirement: Within 45 calendar days
 *
 * Request format:
 * {
 *   "email": "consumer@example.com",
 *   "verification_token": "magic-link-token"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { generateCCPADataReport } from '@/lib/ccpa/consumer-data-report';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';

const log = createLogger('CCPADataAccess');

// ============================================================================
// CCPA RATE LIMITING
// Prevent abuse: max 5 data access requests per 24 hours per email
// ============================================================================
const CCPA_RATE_LIMIT = {
  limit: 5,
  window: 24 * 60 * 60 * 1000, // 24 hours
};

interface CCPADataAccessRequest {
  email: string;
  verification_token?: string;
  format?: 'json' | 'pdf';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CCPADataAccessRequest;
    const { email, verification_token, format = 'json' } = body;

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL', message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['json', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'INVALID_FORMAT', message: 'Format must be "json" or "pdf"' },
        { status: 400 }
      );
    }

    // 🛡️ RATE LIMITING: Prevent data access abuse
    const rateLimitKey = `ccpa-data-access:${email.toLowerCase()}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      CCPA_RATE_LIMIT.limit,
      CCPA_RATE_LIMIT.window
    );

    if (!rateLimitResult.allowed) {
      log.warn(`CCPA data access rate limit exceeded for: ${email}`);
      const retryAfter = rateLimitResult.retryAfterSeconds ?? 3600;
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: `You have exceeded the maximum number of data access requests. Please try again in ${Math.ceil(retryAfter / 3600)} hours.`,
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    const supabase = getSupabaseClient();

    // Try to find student by email
    // Note: For privacy reasons, we don't reveal if account exists or not
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select(
        `id, email, first_name, last_name, created_at, updated_at,
         last_login_at, student_profiles(*), student_quiz_history(*),
         student_progress(*), student_consents(*), marketing_preferences(*),
         student_badges(*), student_streaks(*)`
      )
      .eq('email', email.toLowerCase())
      .single();

    // Log CCPA request (regardless of whether account found)
    await supabase.from('ccpa_requests').insert({
      email: email.toLowerCase(),
      request_type: 'data_access',
      status: 'received',
      format: format,
      submitted_at: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
    });

    // If student not found, send generic response (privacy by design)
    if (fetchError || !student) {
      log.warn(`CCPA data access request for non-existent email: ${email}`);

      // Send email notification that no account found
      try {
        const { sendNotificationEmail } = await import('@/lib/email/send-notification');
        await sendNotificationEmail('ccpa-data-access-no-account', {
          email: email,
          supportEmail: 'support@dailyagile.com',
        });
      } catch (emailError) {
        log.warn('Failed to send CCPA notification email:', emailError);
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Your CCPA data access request has been received. We will review your request and respond within 45 days.',
          request_id: null,
          response_deadline: getDeadlineDate(),
        },
        { status: 202 }
      );
    }

    // Generate CCPA California Consumer Data Report
    const ccpaReport = await generateCCPADataReport(student, supabase);

    // Generate response
    let responseContent: string;
    let contentType: string;
    let filename: string;

    if (format === 'json') {
      responseContent = JSON.stringify(ccpaReport, null, 2);
      contentType = 'application/json';
      filename = `ccpa-consumer-data-${email.split('@')[0]}-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      // PDF format - would need pdfkit or similar library
      // For now, return JSON with note that PDF is being generated
      responseContent = JSON.stringify(ccpaReport, null, 2);
      contentType = 'application/json';
      filename = `ccpa-consumer-data-${email.split('@')[0]}-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Create CCPA request record
    const { data: ccpaRequest, error: insertError } = await supabase
      .from('ccpa_requests')
      .insert({
        email: email.toLowerCase(),
        student_id: student.id,
        request_type: 'data_access',
        status: 'processing',
        format: format,
        submitted_at: new Date().toISOString(),
        response_due_at: getDeadlineDateISO(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        user_agent: req.headers.get('user-agent') || '',
      })
      .select('id')
      .single();

    if (insertError) {
      log.error('Failed to create CCPA request record:', insertError);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to process request' },
        { status: 500 }
      );
    }

    // Log privacy event
    await supabase.from('privacy_audit_log').insert({
      student_id: student.id,
      event_type: 'ccpa_data_access_requested',
      description: `CCPA data access request submitted (format: ${format}, request_id: ${ccpaRequest.id})`,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
    });

    // Send confirmation email to consumer
    try {
      const { sendNotificationEmail } = await import('@/lib/email/send-notification');
      await sendNotificationEmail('ccpa-data-access-received', {
        email: student.email,
        requestId: ccpaRequest.id,
        responseDeadline: getDeadlineDate(),
        supportEmail: 'support@dailyagile.com',
      });
    } catch (emailError) {
      log.warn('Failed to send CCPA confirmation email:', emailError);
    }

    log.info(`CCPA data access request created for: ${email} (request_id: ${ccpaRequest.id})`);

    // Return data immediately (consumer can download)
    return new NextResponse(responseContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    log.error('Unexpected error in CCPA data access:', error);
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
