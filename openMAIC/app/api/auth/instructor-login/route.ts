/**
 * Instructor Login Endpoint
 * POST /api/auth/instructor-login
 * Authenticate instructor and return JWT token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { SignJWT } from 'jose';

const log = createLogger('InstructorLogin');

interface LoginRequest {
  email: string;
  password: string;
}

async function generateToken(instructorId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
  const jwt = await new SignJWT({
    id: instructorId,
    email,
    role: 'instructor',
    verified: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  return jwt;
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

    // Find instructor by email
    const { data: instructor, error: findError } = await getSupabaseClient()
      .from('instructors')
      .select('id, email, password_hash')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !instructor) {
      log.warn(`Login attempt for non-existent instructor: ${email}`);
      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password using bcryptjs
    const bcryptjs = await import('bcryptjs');
    const isPasswordValid = await bcryptjs.compare(password, instructor.password_hash);

    if (!isPasswordValid) {
      log.warn(`Failed login attempt for instructor: ${email}`);
      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Generate token
    const token = await generateToken(instructor.id, instructor.email);

    log.info(`Instructor login successful: ${email}`);

    return NextResponse.json({
      success: true,
      data: {
        instructor_id: instructor.id,
        email: instructor.email,
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
