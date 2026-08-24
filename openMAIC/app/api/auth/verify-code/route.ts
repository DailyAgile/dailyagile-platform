/**
 * Verify Email Code
 * POST /api/auth/verify-code
 *
 * Validates verification code and returns session token
 * Rate limited: 10 attempts per 10 minutes
 * Input validated: Zod schema
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { verifyCodeSchema } from '@/lib/server/validation-schemas';
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';

const log = createLogger('VerifyCode');

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();

    // Step 1: Validate request body with Zod
    const validation = verifyCodeSchema.safeParse(body);
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

    const { email, code } = validation.data;

    // Step 2: Rate limit check (max 10 attempts per email per 10 minutes)
    const rateLimitKey = `verify-code:${email}`;
    const rateLimit = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.VERIFY_CODE.limit,
      RATE_LIMITS.VERIFY_CODE.window
    );

    if (!rateLimit.allowed) {
      log.warn(`Rate limit exceeded for verify-code: ${email}`);
      return apiError(
        'RATE_LIMITED',
        429,
        RATE_LIMITS.VERIFY_CODE.message
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Lookup verification code in students table
    const { data: record, error: queryError } = await getSupabaseClient()
      .from('students')
      .select('id, verification_code, verification_code_expires_at, email_verified')
      .eq('email', email)
      .single();

    if (queryError || !record) {
      log.warn(`Email not found: ${email}`);
      return apiError('INVALID_REQUEST', 404, 'Email not registered');
    }

    // Check if already verified
    if (record.email_verified) {
      return apiSuccess({
        success: true,
        verified: true,
        message: 'Email already verified',
        email: email,
      });
    }

    // Check if code expired
    if (record.verification_code_expires_at) {
      const expiresAt = new Date(record.verification_code_expires_at);
      if (expiresAt < new Date()) {
        log.warn(`Verification code expired for ${email}`);
        return apiError('INVALID_REQUEST', 400, 'Verification code has expired');
      }
    }

    // Verify code
    if (record.verification_code !== code) {
      log.warn(`Invalid code attempt for ${email}`);
      return apiError('INVALID_REQUEST', 400, 'Verification code is incorrect');
    }

    // Mark as verified
    const { error: updateError } = await getSupabaseClient()
      .from('students')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('email', email);

    if (updateError) {
      log.error('Failed to mark email as verified:', updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to verify email');
    }

    log.info(`✅ Email verified: ${email}`);

    // Reset rate limit on successful verification
    await resetRateLimit(rateLimitKey);

    return apiSuccess({
      success: true,
      verified: true,
      message: 'Email verified successfully',
      email: email,
      // Return a session token for the student
      session_token: Buffer.from(`${email}:verified`).toString('base64'),
    });
  } catch (error) {
    log.error('Verify code failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to verify email');
  }
}
