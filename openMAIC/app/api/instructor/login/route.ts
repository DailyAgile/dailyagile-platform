/**
 * POST /api/instructor/login
 * Login with email + password
 * Request: { email: string, password: string }
 * Response: { email: string, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { verifyPassword, makeInstructorSessionCookie } from '@/lib/instructor/auth-utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorLogin');

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email: string; password: string };

    if (!email?.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseClient();

    // Get instructor by email
    const { data: instructor, error } = await supabase
      .from('instructors')
      .select('id, email, password_hash')
      .eq('email', normalizedEmail)
      .single();

    if (error || !instructor) {
      log.warn(`Login attempt for non-existent email: ${normalizedEmail}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!instructor.password_hash) {
      log.warn(`Password login attempted for OTP-only account: ${normalizedEmail}`);
      return NextResponse.json({ error: 'This account uses verification code login' }, { status: 401 });
    }

    // Verify password
    const isValid = await verifyPassword(password, instructor.password_hash);
    if (!isValid) {
      log.warn(`Invalid password for: ${normalizedEmail}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    log.info(`✅ Instructor logged in (password): ${normalizedEmail}`);

    // Create session
    const res = NextResponse.json({
      email: instructor.email,
      message: 'Login successful',
    });

    res.cookies.set('instructor_session', makeInstructorSessionCookie(instructor.id, instructor.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return res;
  } catch (err) {
    log.error('Login error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
