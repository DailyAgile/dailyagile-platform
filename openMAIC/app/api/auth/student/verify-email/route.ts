/**
 * Verify Student Email
 * POST /api/auth/student/verify-email
 * Verify student email with code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';

const log = createLogger('VerifyStudentEmail');

interface VerifyRequest {
  email: string;
  code: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: { message: 'Email and code required' } },
        { status: 400 }
      );
    }

    // Find student
    const { data: student, error: findError } = await getSupabaseClient()
      .from('students')
      .select('id, verification_code, verification_code_expires_at, email_verified')
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

    // Check code expiry
    const expiresAt = new Date(student.verification_code_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: { message: 'Verification code expired' } },
        { status: 400 }
      );
    }

    // Verify code
    if (student.verification_code !== code.toUpperCase()) {
      return NextResponse.json(
        { error: { message: 'Invalid verification code' } },
        { status: 400 }
      );
    }

    // Mark email as verified
    const { error: updateError } = await getSupabaseClient()
      .from('students')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('id', student.id);

    if (updateError) {
      log.error('Error updating student:', updateError);
      return NextResponse.json(
        { error: { message: 'Failed to verify email' } },
        { status: 500 }
      );
    }

    log.info(`Email verified for student: ${email}`);

    // Send welcome email after successful verification
    try {
      const { sendNotificationEmail } = await import('@/lib/email/send-notification');
      const firstName = email.split('@')[0]; // Fallback to email prefix
      await sendNotificationEmail('email-verified-welcome', {
        email,
        firstName,
      });
    } catch (emailError) {
      log.warn('Failed to send welcome email (continuing):', emailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Email verified successfully',
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
