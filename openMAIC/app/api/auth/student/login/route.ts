/**
 * Student Login
 * POST /api/auth/student/login
 * Authenticate student and return JWT token
 *
 * 🔒 SECURITY: Rate limiting + account lockout after 5 failed attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import crypto from 'crypto';
import {
  checkLoginRateLimit,
  checkAccountLock,
  lockAccount,
  resetLoginAttempts,
  getRateLimitHeaders,
} from '@/lib/server/rate-limit';

const log = createLogger('StudentLogin');

interface LoginRequest {
  email: string;
  password: string;
}

// Simple JWT generation (in production use jsonwebtoken package)
function generateToken(studentId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: studentId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    })
  ).toString('base64');

  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
    .update(`${header}.${payload}`)
    .digest('base64');

  return `${header}.${payload}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email and password required' } },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Check if account is locked
    const lockStatus = await checkAccountLock(email);
    if (lockStatus.locked) {
      log.warn(`Login attempt on locked account: ${email}`);
      return NextResponse.json(
        {
          error: {
            message: `Account temporarily locked. Please try again after ${lockStatus.unlocksAt?.toLocaleTimeString()}`,
          },
        },
        {
          status: 429,
          headers: getRateLimitHeaders(0, lockStatus.unlocksAt),
        }
      );
    }

    // 🔒 SECURITY: Check rate limit on login attempts
    const rateLimit = await checkLoginRateLimit(email, false); // Don't increment yet
    if (!rateLimit.allowed) {
      log.warn(`Login rate limit exceeded for: ${email}`);
      await lockAccount(email, 15); // Lock for 15 minutes
      return NextResponse.json(
        {
          error: {
            message:
              'Too many failed login attempts. Account locked for 15 minutes.',
          },
        },
        {
          status: 429,
          headers: getRateLimitHeaders(0, rateLimit.resetTime),
        }
      );
    }

    // Find student by email
    const { data: student, error: findError } = await getSupabaseClient()
      .from('students')
      .select('id, email, password_hash, email_verified')
      .eq('email', email)
      .single();

    if (findError || !student) {
      log.warn(`Login attempt for non-existent email: ${email}`);
      // Increment failed attempts
      await checkLoginRateLimit(email, true);
      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!student.email_verified) {
      // Increment failed attempts
      await checkLoginRateLimit(email, true);
      return NextResponse.json(
        { error: { message: 'Please verify your email before logging in' } },
        { status: 401 }
      );
    }

    // Verify password using bcryptjs (constant-time comparison)
    const bcryptjs = await import('bcryptjs');
    const isPasswordValid = await bcryptjs.compare(password, student.password_hash);

    if (!isPasswordValid) {
      log.warn(`Failed login attempt for: ${email}`);
      // Increment failed attempts and check if we should lock
      const rateLimitResult = await checkLoginRateLimit(email, true);
      if (rateLimitResult.remainingAttempts === 0) {
        await lockAccount(email, 15); // Lock for 15 minutes after 5 failures
      }
      return NextResponse.json(
        {
          error: { message: 'Invalid email or password' },
          ...(rateLimitResult.remainingAttempts > 0 && {
            remainingAttempts: rateLimitResult.remainingAttempts,
          }),
        },
        {
          status: 401,
          headers: getRateLimitHeaders(
            rateLimitResult.remainingAttempts,
            rateLimitResult.resetTime
          ),
        }
      );
    }

    // ✅ SUCCESSFUL LOGIN: Reset rate limit attempts
    await resetLoginAttempts(email);

    // Generate token
    const token = generateToken(student.id, student.email);

    // Update last login
    await getSupabaseClient()
      .from('students')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', student.id);

    log.info(`Student login successful: ${email}`);

    return NextResponse.json({
      success: true,
      data: {
        student_id: student.id,
        email: student.email,
        token,
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
