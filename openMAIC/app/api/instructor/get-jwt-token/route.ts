/**
 * GET /api/instructor/get-jwt-token
 * Get JWT token for instructor from session cookie
 * Used after password login to populate localStorage
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { parseInstructorSessionCookie } from '@/lib/instructor/auth-utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('GetJWTToken');

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET(req: NextRequest) {
  try {
    // Get session cookie
    const sessionCookie = req.cookies.get('instructor_session')?.value;

    if (!sessionCookie) {
      log.warn('No instructor_session cookie found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse and validate cookie
    const session = parseInstructorSessionCookie(sessionCookie);
    if (!session) {
      log.warn('Invalid or expired session cookie');
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Verify instructor still exists in database
    const supabase = getSupabaseClient();
    const { data: instructor } = await supabase
      .from('instructors')
      .select('id, email')
      .eq('id', session.instructorId)
      .single();

    if (!instructor) {
      log.warn(`Instructor not found: ${session.instructorId}`);
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    // Create properly signed JWT token
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      id: instructor.id,
      email: instructor.email,
      role: 'instructor',
      verified: true,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + 7 * 24 * 60 * 60) // 7 days
      .sign(JWT_SECRET);

    log.info(`✅ JWT token generated for instructor: ${instructor.email}`);

    return NextResponse.json({
      token,
      email: instructor.email,
      instructorId: instructor.id,
      message: 'Token generated successfully',
    });
  } catch (err) {
    log.error('Get token error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
