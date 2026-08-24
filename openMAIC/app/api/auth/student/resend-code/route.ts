/**
 * Resend Verification Code
 * POST /api/auth/student/resend-code
 * Resend verification code to student email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger('ResendVerificationCode');


interface ResendRequest {
  email: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResendRequest;
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: { message: 'Email required' } },
        { status: 400 }
      );
    }

    // Find student
    const { data: student, error: findError } = await getSupabaseClient()
      .from('students')
      .select('id, email_verified')
      .eq('email', email)
      .single();

    if (findError || !student) {
      return NextResponse.json(
        { error: { message: 'Student not found' } },
        { status: 404 }
      );
    }

    if (student.email_verified) {
      return NextResponse.json(
        { error: { message: 'Email already verified' } },
        { status: 400 }
      );
    }

    // Generate cryptographically secure verification code (6-digit)
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes

    // Update student with new code
    const { error: updateError } = await getSupabaseClient()
      .from('students')
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: codeExpiry.toISOString(),
      })
      .eq('id', student.id);

    if (updateError) {
      log.error('Error updating student:', updateError);
      return NextResponse.json(
        { error: { message: 'Failed to resend code' } },
        { status: 500 }
      );
    }

    log.info(`Verification code resent for: ${email}`);

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
      log.warn('Failed to send resend verification email (continuing):', emailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Verification code sent to your email',
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
