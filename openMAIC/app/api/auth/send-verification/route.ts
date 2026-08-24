/**
 * Email Verification API — Phase 2 Security Foundation
 * POST /api/auth/send-verification
 * Sends a magic link (OTP) via email for self-paced student enrollment
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('AuthSendVerification');


interface SendVerificationRequest {
  email: string;
  redirectTo?: string; // URL to redirect after verification (e.g., /quiz/module-1)
}

const VERIFICATION_CONFIG = {
  expiryMinutes: 15,
  maxAttemptsPerEmail: 5,
  cooldownSeconds: 60,
  rateLimitWindow: 3600, // 1 hour
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendVerificationRequest;
    const { email, redirectTo } = body;

    // Validation
    if (!email || !email.includes('@')) {
      return apiError('INVALID_REQUEST', 400, 'Valid email address required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    // Rate limiting: check recent attempts from this email/IP
    const recentAttempts = await checkRateLimit(normalizedEmail, clientIp);
    if (recentAttempts.tooManyAttempts) {
      log.warn(`Rate limit exceeded for ${normalizedEmail} (${recentAttempts.attemptCount} attempts in ${VERIFICATION_CONFIG.rateLimitWindow}s)`);
      return apiError(
        'RATE_LIMITED',
        429,
        `Too many verification requests. Try again in ${Math.ceil(recentAttempts.secondsUntilReset)}s.`,
      );
    }

    // Send OTP via Supabase Auth (passwordless)
    const { data, error } = await getSupabaseClient().auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo ? `${process.env.NEXT_PUBLIC_APP_URL}${redirectTo}` : undefined,
        shouldCreateUser: true, // Auto-create auth.users row if not exists
      },
    });

    if (error) {
      log.error(`Supabase OTP error for ${normalizedEmail}:`, error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to send verification email. Try again later.');
    }

    // Log attempt for rate limiting
    await logVerificationAttempt(normalizedEmail, clientIp);

    log.info(`Verification email sent to ${normalizedEmail}`);
    return apiSuccess({
      message: 'Verification link sent to your email. Check your inbox (expires in 15 minutes).',
      email: normalizedEmail,
    });
  } catch (error) {
    log.error('Unexpected error in send-verification:', error);
    return apiError('INTERNAL_ERROR', 500, 'An unexpected error occurred');
  }
}

/**
 * Check if email/IP has exceeded rate limits
 */
async function checkRateLimit(
  email: string,
  ip: string,
): Promise<{ tooManyAttempts: boolean; attemptCount: number; secondsUntilReset: number }> {
  // Store rate limit data in Supabase via a simple verification_attempts table
  // (or use Redis if available for faster checks)
  const oneHourAgo = new Date(Date.now() - VERIFICATION_CONFIG.rateLimitWindow * 1000).toISOString();

  const { data, error } = await (getSupabaseClient() as any)
    .from('verification_attempts')
    .select('id, created_at', { count: 'exact' })
    .eq('email', email)
    .gte('created_at', oneHourAgo);

  if (error) {
    log.warn('Rate limit check failed, allowing request:', error);
    return { tooManyAttempts: false, attemptCount: 0, secondsUntilReset: 0 };
  }

  const attemptCount = data?.length || 0;
  const tooManyAttempts = attemptCount >= VERIFICATION_CONFIG.maxAttemptsPerEmail;
  const oldestAttempt = data?.[0]?.created_at || new Date().toISOString();
  const secondsUntilReset = Math.max(
    0,
    VERIFICATION_CONFIG.rateLimitWindow - Math.floor((Date.now() - new Date(oldestAttempt).getTime()) / 1000),
  );

  return { tooManyAttempts, attemptCount, secondsUntilReset };
}

/**
 * Log verification attempt for rate limiting
 */
async function logVerificationAttempt(email: string, ip: string): Promise<void> {
  const { error } = await getSupabaseClient().from('verification_attempts').insert({
    email,
    ip,
    created_at: new Date().toISOString(),
  });

  if (error) {
    log.warn('Failed to log verification attempt:', error);
  }
}
