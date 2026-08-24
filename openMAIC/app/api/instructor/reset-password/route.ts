/**
 * POST /api/instructor/reset-password
 *
 * Complete password reset flow
 * Request: { token: string, password: string }
 * Response: { reset: true, email: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/instructor/auth-utils';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorResetPassword');

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token: string; password: string };
    const { token, password } = body;

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // LOOKUP RESET TOKEN
    // ─────────────────────────────────────────────────────────────────
    const supabase = getSupabaseClient();
    const { data: resetRecord, error: lookupError } = await supabase
      .from('instructor_password_resets')
      .select('instructor_id, email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (lookupError || !resetRecord) {
      log.warn(`Invalid reset token: ${token}`);
      return NextResponse.json({ error: 'Invalid reset link' }, { status: 400 });
    }

    if (resetRecord.used_at) {
      log.warn(`Already-used reset token: ${token}`);
      return NextResponse.json({ error: 'This link has already been used' }, { status: 400 });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      log.warn(`Expired reset token: ${token}`);
      return NextResponse.json({ error: 'Reset link expired' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────
    // HASH NEW PASSWORD
    // ─────────────────────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);

    // ─────────────────────────────────────────────────────────────────
    // UPDATE INSTRUCTOR PASSWORD
    // ─────────────────────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('instructors')
      .update({
        password_hash: passwordHash,
        email_verified_at: new Date().toISOString(), // Mark as verified if not already
      })
      .eq('id', resetRecord.instructor_id);

    if (updateError) {
      log.error('Failed to update password:', updateError);
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    // ─────────────────────────────────────────────────────────────────
    // MARK RESET TOKEN AS USED
    // ─────────────────────────────────────────────────────────────────
    await supabase
      .from('instructor_password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    log.info(`✅ Password reset for instructor: ${resetRecord.email}`);

    return NextResponse.json({
      reset: true,
      email: resetRecord.email,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    log.error('Reset password error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
