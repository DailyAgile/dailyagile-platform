/**
 * POST /api/instructor/otp/verify
 *
 * Verify OTP code and create instructor session
 * Rate limited: 10 attempts per 10 minutes
 * Input validated: Zod schema
 *
 * Request: { code: string }
 * Response: { verified: true, instructorId: string, email: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseOtpCookie } from '@/lib/instructor/otp';
import { makeInstructorSessionCookie } from '@/lib/instructor/auth-utils';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { instructorOtpVerifySchema } from '@/lib/server/validation-schemas';
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';

const log = createLogger('InstructorOtpVerify');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Validate request body with Zod
    const validation = instructorOtpVerifySchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      log.warn('Validation error:', errors.fieldErrors);
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // ─────────────────────────────────────────────────────────────────
    // GET OTP COOKIE
    // ─────────────────────────────────────────────────────────────────
    const raw = req.cookies.get('instructor_otp_pending')?.value;
    if (!raw) {
      return NextResponse.json(
        { error: 'No pending verification. Please request a new code.' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // PARSE & VALIDATE COOKIE (checks signature + expiry)
    // ─────────────────────────────────────────────────────────────────
    const pending = parseOtpCookie(raw);
    if (!pending) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    // Step 2: Rate limit check (max 10 OTP verification attempts per email per 10 minutes)
    const rateLimitKey = `verify-otp:${pending.email}`;
    const rateLimit = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.INSTRUCTOR_OTP_VERIFY.limit,
      RATE_LIMITS.INSTRUCTOR_OTP_VERIFY.window
    );

    if (!rateLimit.allowed) {
      log.warn(`Rate limit exceeded for OTP verify: ${pending.email}`);
      return NextResponse.json(
        { error: RATE_LIMITS.INSTRUCTOR_OTP_VERIFY.message },
        { status: 429 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // VERIFY CODE MATCHES
    // ─────────────────────────────────────────────────────────────────
    if (String(code).trim() !== pending.code) {
      log.warn(`Invalid OTP attempt for ${pending.email}`);
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 });
    }

    // Reset rate limit on successful verification
    await resetRateLimit(rateLimitKey);

    // ─────────────────────────────────────────────────────────────────
    // LOOKUP INSTRUCTOR IN DATABASE
    // ─────────────────────────────────────────────────────────────────
    const supabase = getSupabaseClient();
    const { data: instructor, error: lookupError } = await supabase
      .from('instructors')
      .select('id, email, is_active')
      .eq('email', pending.email)
      .single();

    if (lookupError || !instructor) {
      log.warn(`Instructor not found: ${pending.email}`);
      return NextResponse.json({ error: 'Instructor account not found. Contact support.' }, { status: 404 });
    }

    if (!instructor.is_active) {
      log.warn(`Inactive instructor attempted login: ${pending.email}`);
      return NextResponse.json(
        { error: 'This instructor account is inactive. Contact support.' },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // UPDATE LAST LOGIN
    // ─────────────────────────────────────────────────────────────────
    await supabase
      .from('instructors')
      .update({ last_login: new Date().toISOString() })
      .eq('id', instructor.id);

    // ─────────────────────────────────────────────────────────────────
    // CREATE INSTRUCTOR SESSION COOKIE (7 days)
    // ─────────────────────────────────────────────────────────────────
    const res = NextResponse.json({
      verified: true,
      instructorId: instructor.id,
      email: instructor.email,
    });

    res.cookies.set(
      'instructor_session',
      makeInstructorSessionCookie(instructor.id, instructor.email),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      }
    );

    // Delete the OTP cookie
    res.cookies.delete('instructor_otp_pending');

    log.info(`✅ Instructor verified and logged in: ${instructor.email}`);
    return res;
  } catch (err) {
    log.error('OTP verify error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
