/**
 * Send Email Verification Code
 * POST /api/auth/send-verification-code
 *
 * Sends a 6-digit verification code to student email
 * Rate limited: 3 attempts per hour
 * Input validated: Zod schema
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { sendVerificationCodeSchema } from '@/lib/server/validation-schemas';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';
import crypto from 'crypto';

const log = createLogger('SendVerificationCode');

// Generate cryptographically secure 6-digit code
function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();

    // Step 1: Validate request body with Zod
    const validation = sendVerificationCodeSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      log.warn('Validation error:', errors.fieldErrors);
      return apiError(
        'VALIDATION_ERROR',
        400,
        'Invalid request',
        JSON.stringify(errors.fieldErrors)
      );
    }

    const { email } = validation.data;

    // Step 2: Rate limit check (max 3 verification codes per email per hour)
    const rateLimitKey = `send-verify-code:${email}`;
    const rateLimit = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.SEND_VERIFICATION_CODE.limit,
      RATE_LIMITS.SEND_VERIFICATION_CODE.window
    );

    if (!rateLimit.allowed) {
      log.warn(`Rate limit exceeded for send-verification-code: ${email}`);
      return apiError(
        'RATE_LIMITED',
        429,
        RATE_LIMITS.SEND_VERIFICATION_CODE.message
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Store verification code in database
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes
    const { error: insertError } = await (getSupabaseClient() as any)
      .from('students')
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt.toISOString(),
      })
      .eq('email', email);

    if (insertError) {
      log.error('Failed to store verification code:', insertError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to process verification');
    }

    // TODO: Send email with verification code
    // For now, log it (in production, use Resend or SendGrid)
    log.info(`Verification code generated for ${email}`);

    // Send verification email
    try {
      const { sendNotificationEmail } = await import('@/lib/email/send-notification');
      await sendNotificationEmail('resend-verification', {
        email,
        firstName: email.split('@')[0],
        verificationCode,
        expiryMinutes: 10,
      });
    } catch (emailError) {
      log.warn('Failed to send verification email (continuing):', emailError);
    }

    return apiSuccess({
      success: true,
      message: 'Verification code sent to email',
      email: email,
      // For testing: return the code (remove in production)
      test_code: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
    });
  } catch (error) {
    log.error('Send verification code failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to send verification code');
  }
}
