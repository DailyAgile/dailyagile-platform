/**
 * POST /api/instructor/signup
 *
 * Step 1: Request email verification
 * Request: { email: string }
 * Response: { sent: true, email: string } (verification link sent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVerificationToken } from '@/lib/instructor/auth-utils';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorSignup');

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email: string };

    if (!email?.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ─────────────────────────────────────────────────────────────────
    // CHECK IF INSTRUCTOR ALREADY EXISTS
    // ─────────────────────────────────────────────────────────────────
    const supabase = getSupabaseClient();

    const { data: existing, error: existingError } = await supabase
      .from('instructors')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      // Already has account — send password reset instead
      log.info(`Signup attempted for existing instructor: ${normalizedEmail}`);
      return NextResponse.json(
        { error: 'Email already registered. Use login or forgot password.' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // CREATE EMAIL VERIFICATION TOKEN (UPSERT)
    // ─────────────────────────────────────────────────────────────────
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Use UPSERT to handle both new signups and retries
    // Avoids duplicate key errors when user retries signup
    const { error: upsertError } = await supabase
      .from('instructor_email_verification')
      .upsert(
        [
          {
            email: normalizedEmail,
            token,
            expires_at: expiresAt.toISOString(),
          },
        ],
        { onConflict: 'email' }
      );

    if (upsertError) {
      log.error('Failed to create verification token:', upsertError);
      return NextResponse.json(
        { error: 'Failed to start signup' },
        { status: 500 }
      );
    }
    log.info(`✅ Verification token created for ${normalizedEmail}`);

    // ─────────────────────────────────────────────────────────────────
    // SEND VERIFICATION EMAIL
    // ─────────────────────────────────────────────────────────────────
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/instructors/verify-email?token=${token}`;

    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY ?? '',
      },
      body: JSON.stringify({
        sender: { name: 'DailyAgile', email: 'support@dailyagile.com' },
        to: [{ email: normalizedEmail }],
        subject: 'Verify your DailyAgile Instructor Email',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="font-size:20px;color:#1E3A5F;margin:0 0 12px;font-weight:700">Verify Your Email</h2>
            <p style="font-size:14px;color:#64748B;margin:0 0 24px;line-height:1.6">
              Click the button below to verify your email and continue creating your DailyAgile instructor account.
            </p>
            <a href="${verificationUrl}" style="display:inline-block;background:#0891B2;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;margin-bottom:24px">
              Verify Email
            </a>
            <p style="font-size:12px;color:#9ca3af;margin:0">
              This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
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
      log.error('Brevo email error:', detail);
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { error: 'Failed to send verification email' },
          { status: 500 }
        );
      }
      log.warn('Brevo failed but dev mode — continuing');
    } else {
      log.info(`✅ Verification email sent to ${normalizedEmail}`);
    }

    return NextResponse.json({
      sent: true,
      email: normalizedEmail,
      message: 'Check your email for verification link',
    });
  } catch (err) {
    log.error('Signup error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
