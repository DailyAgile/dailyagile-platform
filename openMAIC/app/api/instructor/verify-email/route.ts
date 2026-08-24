/**
 * POST /api/instructor/verify-email
 *
 * Step 2 of signup: Verify email token and optionally choose auth method
 * Request: { token: string, method?: 'password' | 'otp' }
 * Response: { verified: true, email: string, method: 'password' | 'otp' }
 *
 * If method is 'password', user proceeds to set password on next page.
 * If method is 'otp', user can proceed to login (future OTP-only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, makeInstructorSessionCookie } from '@/lib/instructor/auth-utils';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorVerifyEmail');

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token: string;
      method?: 'password' | 'otp';
      password?: string;
    };

    const { token, method = 'password', password } = body;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────
    // LOOKUP VERIFICATION TOKEN
    // ─────────────────────────────────────────────────────────────────
    const supabase = getSupabaseClient();
    const { data: verification, error: lookupError } = await supabase
      .from('instructor_email_verification')
      .select('email, expires_at, verified_at')
      .eq('token', token)
      .single();

    if (lookupError || !verification) {
      log.warn(`Invalid verification token: ${token}`);
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 });
    }

    if (verification.verified_at) {
      log.warn(`Already-verified token used: ${token}`);
      return NextResponse.json({ error: 'This link has already been used' }, { status: 400 });
    }

    if (new Date(verification.expires_at) < new Date()) {
      log.warn(`Expired verification token: ${token}`);
      return NextResponse.json({ error: 'Verification link expired' }, { status: 400 });
    }

    const normalizedEmail = verification.email.toLowerCase().trim();

    // ─────────────────────────────────────────────────────────────────
    // METHOD 1: OAUTH-ONLY (OTP) — Create account, no password
    // ─────────────────────────────────────────────────────────────────
    if (method === 'otp') {
      // Insert instructor with no password (email_verified_at set)
      const { data: instructor, error: insertError } = await supabase
        .from('instructors')
        .insert([
          {
            email: normalizedEmail,
            password_hash: null, // OTP only
            email_verified_at: new Date().toISOString(),
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select('id, email')
        .single();

      if (insertError || !instructor) {
        if (insertError?.code === '23505') {
          // Duplicate email
          log.warn(`Email already registered during OTP signup: ${normalizedEmail}`);
          return NextResponse.json(
            { error: 'Email already registered. Use login or forgot password.' },
            { status: 409 }
          );
        }
        log.error('Failed to create instructor:', insertError);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }

      // Mark token as verified
      await supabase
        .from('instructor_email_verification')
        .update({ verified_at: new Date().toISOString() })
        .eq('token', token);

      log.info(`✅ Instructor created (OTP only): ${normalizedEmail}`);

      return NextResponse.json({
        verified: true,
        email: instructor.email,
        instructorId: instructor.id,
        method: 'otp',
        message: 'Email verified. You can now log in with OTP.',
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // METHOD 2: PASSWORD — Create account with password hash
    // ─────────────────────────────────────────────────────────────────
    if (method === 'password') {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Insert instructor
      const { data: instructor, error: insertError } = await supabase
        .from('instructors')
        .insert([
          {
            email: normalizedEmail,
            password_hash: passwordHash,
            email_verified_at: new Date().toISOString(),
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select('id, email')
        .single();

      if (insertError || !instructor) {
        if (insertError?.code === '23505') {
          log.warn(`Email already registered during password signup: ${normalizedEmail}`);
          return NextResponse.json(
            { error: 'Email already registered. Use login or forgot password.' },
            { status: 409 }
          );
        }
        log.error('Failed to create instructor - Full Error:', {
          code: insertError?.code,
          message: insertError?.message,
          details: insertError?.details,
          hint: insertError?.hint,
          status: insertError?.status,
        });
        return NextResponse.json({ error: `Failed to create account: ${insertError?.message || 'Unknown error'}` }, { status: 500 });
      }

      // Mark token as verified
      await supabase
        .from('instructor_email_verification')
        .update({ verified_at: new Date().toISOString() })
        .eq('token', token);

      log.info(`✅ Instructor created (password): ${normalizedEmail}`);

      // Create session immediately
      const res = NextResponse.json({
        verified: true,
        email: instructor.email,
        instructorId: instructor.id,
        method: 'password',
        message: 'Account created successfully. Signing you in...',
      });

      res.cookies.set('instructor_session', makeInstructorSessionCookie(instructor.id, instructor.email), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return res;
    }

    return NextResponse.json({ error: 'Invalid authentication method' }, { status: 400 });
  } catch (err) {
    log.error('Email verification error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
