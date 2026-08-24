/**
 * Student Signup
 * POST /api/auth/student/signup
 * Register new student account with email verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import crypto from 'crypto';

const log = createLogger('StudentSignup');

interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SignupRequest;

    const { firstName, lastName, email, password } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: { message: 'Password must be at least 6 characters' } },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await getSupabaseClient()
      .from('students')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: { message: 'Email already registered' } },
        { status: 400 }
      );
    }

    // Hash password using bcryptjs (12 rounds = industry standard)
    const bcryptjs = await import('bcryptjs');
    const passwordHash = await bcryptjs.hash(password, 12);

    // Generate cryptographically secure email verification code (6-digit)
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes

    // Create student record
    const { data: student, error: createError } = await getSupabaseClient()
      .from('students')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        email_verified: false,
        verification_code: verificationCode,
        verification_code_expires_at: codeExpiry.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (createError) {
      const errorMsg = createError.message || JSON.stringify(createError);
      log.error('Error creating student:', errorMsg);
      log.error('Full error details:', JSON.stringify(createError, null, 2));
      return NextResponse.json(
        { error: { message: `Failed to create account: ${errorMsg}` } },
        { status: 500 }
      );
    }

    log.info(`Student registered: ${email}`);

    // Record privacy policy consent (required for signup)
    try {
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
      const userAgent = req.headers.get('user-agent') || '';

      await getSupabaseClient().from('student_consents').insert({
        student_id: student.id,
        consent_type: 'privacy',
        given: true,
        given_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        policy_version: 1,
        metadata: { source: 'signup_form' },
      });

      // Initialize marketing preferences
      await getSupabaseClient().from('marketing_preferences').insert({
        student_id: student.id,
        email_marketing: false, // Opt-in by default
        sms_marketing: false,
        push_notifications: false,
        leaderboard_public: true,
        analytics_tracking: true,
        third_party_sharing: false,
      });

      // Log privacy event
      await getSupabaseClient().from('privacy_audit_log').insert({
        student_id: student.id,
        event_type: 'consent_given',
        description: 'Student accepted privacy policy during signup',
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (consentError) {
      log.warn('Failed to record consent (continuing):', consentError);
      // Continue even if consent recording fails - student account is created
    }

    // Send verification email with code
    try {
      const { sendNotificationEmail } = await import('@/lib/email/send-notification');
      await sendNotificationEmail('signup-verification', {
        email,
        firstName,
        verificationCode,
        expiryMinutes: 10,
      });
    } catch (emailError) {
      log.warn('Failed to send verification email (continuing):', emailError);
      // Continue even if email fails - code is generated and stored
    }

    return NextResponse.json({
      success: true,
      data: {
        student_id: student.id,
        email,
        message: 'Account created. Check your email for verification code.',
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
