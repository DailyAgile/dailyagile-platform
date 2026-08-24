/**
 * POST /api/instructor/forgot-password
 *
 * Initiate password reset flow
 * Request: { email: string }
 * Response: { sent: true, email: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateResetToken } from '@/lib/instructor/auth-utils';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorForgotPassword');

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email: string };

    if (!email?.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ─────────────────────────────────────────────────────────────────
    // LOOKUP INSTRUCTOR
    // ─────────────────────────────────────────────────────────────────
    const supabase = getSupabaseClient();
    const { data: instructor, error: lookupError } = await supabase
      .from('instructors')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (lookupError || !instructor) {
      log.info(`Password reset requested for non-existent email: ${normalizedEmail}`);
      // Don't leak whether the email exists
      return NextResponse.json({
        sent: true,
        email: normalizedEmail,
        message: 'If this email is registered, you will receive a reset link.',
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // CREATE RESET TOKEN
    // ─────────────────────────────────────────────────────────────────
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    const { error: insertError } = await supabase
      .from('instructor_password_resets')
      .insert([
        {
          instructor_id: instructor.id,
          email: normalizedEmail,
          token,
          expires_at: expiresAt.toISOString(),
        },
      ]);

    if (insertError) {
      log.error('Failed to create reset token:', insertError);
      return NextResponse.json(
        { error: 'Failed to start password reset' },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // SEND RESET EMAIL
    // ─────────────────────────────────────────────────────────────────
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/instructors/reset-password?token=${token}`;

    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY ?? '',
      },
      body: JSON.stringify({
        sender: { name: 'DailyAgile', email: 'support@dailyagile.com' },
        to: [{ email: normalizedEmail }],
        subject: 'Reset your DailyAgile Instructor Password',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="font-size:20px;color:#1E3A5F;margin:0 0 12px;font-weight:700">Reset Your Password</h2>
            <p style="font-size:14px;color:#64748B;margin:0 0 24px;line-height:1.6">
              Click the button below to reset your DailyAgile instructor password.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:#0891B2;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;margin-bottom:24px">
              Reset Password
            </a>
            <p style="font-size:12px;color:#9ca3af;margin:0">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
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
          { error: 'Failed to send reset email' },
          { status: 500 }
        );
      }
      log.warn('Brevo failed but dev mode — continuing');
    } else {
      log.info(`✅ Password reset email sent to ${normalizedEmail}`);
    }

    return NextResponse.json({
      sent: true,
      email: normalizedEmail,
      message: 'If this email is registered, you will receive a reset link.',
    });
  } catch (err) {
    log.error('Forgot password error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
