/**
 * POST /api/instructor/otp/send
 *
 * Send OTP code to instructor email via Brevo
 * Rate limited: 3 attempts per hour
 * Input validated: Zod schema
 *
 * Request: { email: string }
 * Response: { sent: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { makeOtpCookie } from '@/lib/instructor/otp';
import { createLogger } from '@/lib/logger';
import { instructorOtpSendSchema } from '@/lib/server/validation-schemas';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';
import crypto from 'crypto';

const log = createLogger('InstructorOtpSend');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Validate request body with Zod
    const validation = instructorOtpSendSchema.safeParse(body);
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

    const { email: rawEmail } = validation.data;
    const normalizedEmail = rawEmail.toLowerCase().trim();

    // Step 2: Rate limit check (max 3 OTP sends per email per hour)
    const rateLimitKey = `send-otp:${normalizedEmail}`;
    const rateLimit = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.INSTRUCTOR_OTP_SEND.limit,
      RATE_LIMITS.INSTRUCTOR_OTP_SEND.window
    );

    if (!rateLimit.allowed) {
      log.warn(`Rate limit exceeded for OTP send: ${normalizedEmail}`);
      return NextResponse.json(
        { error: RATE_LIMITS.INSTRUCTOR_OTP_SEND.message },
        { status: 429 }
      );
    }

    // Generate cryptographically secure 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();

    // ─────────────────────────────────────────────────────────────────
    // DEV MODE: Log code to console
    // ─────────────────────────────────────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      log.info(`🔧 DEV MODE - OTP code for ${normalizedEmail}: ${code}`);
      console.log(`[OTP dev] code for ${normalizedEmail}: ${code}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // SEND EMAIL VIA BREVO
    // ─────────────────────────────────────────────────────────────────
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY ?? '',
      },
      body: JSON.stringify({
        sender: { name: 'DailyAgile', email: 'support@dailyagile.com' },
        to: [{ email: normalizedEmail }],
        subject: 'Your DailyAgile Instructor Login Code',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="font-size:20px;color:#1E3A5F;margin:0 0 12px;font-weight:700">Your Login Code</h2>
            <p style="font-size:14px;color:#64748B;margin:0 0 24px;line-height:1.6">
              Enter this code on the DailyAgile instructor login page. It expires in 10 minutes.
            </p>
            <div style="background:#F0F7FA;border:2px solid #0891B2;border-radius:12px;padding:32px;text-align:center;margin-bottom:24px">
              <span style="font-size:48px;font-weight:800;letter-spacing:12px;color:#0891B2;font-family:monospace">${code}</span>
            </div>
            <p style="font-size:12px;color:#9ca3af;margin:0">
              If you didn't request this login code, you can safely ignore this email.
            </p>
            <div style="margin-top:32px;border-top:1px solid #E2E8F0;padding-top:16px">
              <p style="font-size:11px;color:#9ca3af;margin:0">
                DailyAgile — Accelerate Business Agility
              </p>
            </div>
          </div>`,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      log.error('Brevo OTP error:', detail);

      // In dev, continue anyway — code is in the console
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
      }

      log.warn('Brevo failed but dev mode — continuing');
    } else {
      log.info(`✅ OTP email sent to ${normalizedEmail}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // CREATE OTP COOKIE (10 min expiry)
    // ─────────────────────────────────────────────────────────────────
    const res = NextResponse.json({ sent: true });
    res.cookies.set('instructor_otp_pending', makeOtpCookie(normalizedEmail, code), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return res;
  } catch (err) {
    log.error('OTP send error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
