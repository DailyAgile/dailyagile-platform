/**
 * INSTRUCTOR LOGIN ENDPOINT (OPTION 1)
 *
 * STATUS: PREPARED BUT NOT ACTIVE
 * To activate: rename to instructor-login.ts and uncomment all code
 *
 * Purpose:
 * - Handle instructor email/password login
 * - Generate JWT token with role: 'instructor'
 * - Return token for client to store as instructor_token
 *
 * API Contract:
 * POST /api/auth/instructor-login
 * Request: { email: string, password: string }
 * Response: { success: true, token: string, instructor: { id, email } }
 * Error: { success: false, error: string }
 *
 * Flow:
 * 1. Client submits email + password
 * 2. Server queries instructors table
 * 3. Verify password using bcrypt.compare()
 * 4. Generate JWT with payload: { id, email, role: 'instructor', verified: true }
 * 5. Return JWT to client
 * 6. Client stores as localStorage.setItem('instructor_token', jwt)
 * 7. Client uses token in Authorization header for API calls
 */

/*
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { SignJWT } from 'jose';

const log = createLogger('InstructorLogin');

// ─────────────────────────────────────────────────────────────
// WHEN ACTIVATED: Import these
// ─────────────────────────────────────────────────────────────
// import bcrypt from 'bcrypt';
// const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  instructor?: {
    id: string;
    email: string;
  };
  error?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as LoginRequest;
    const { email, password } = body;

    // ─────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────
    if (!email?.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Email is required');
    }

    if (!password) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Password is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return apiError('INVALID_REQUEST', 400, 'Invalid email format');
    }

    // ─────────────────────────────────────────────────────────────
    // LOOKUP INSTRUCTOR IN DATABASE
    // ─────────────────────────────────────────────────────────────
    const supabase = getSupabaseClient();
    const { data: instructor, error: lookupError } = await supabase
      .from('instructors')
      .select('id, email, password_hash, is_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (lookupError || !instructor) {
      log.warn(`Login attempt for non-existent instructor: ${email}`);
      // Don't reveal whether email exists (security best practice)
      return apiError('INVALID_REQUEST', 401, 'Invalid email or password');
    }

    if (!instructor.is_verified) {
      log.warn(`Login attempt for unverified instructor: ${email}`);
      return apiError('FORBIDDEN', 403, 'Please verify your email before logging in');
    }

    // ─────────────────────────────────────────────────────────────
    // VERIFY PASSWORD
    // ─────────────────────────────────────────────────────────────
    // WHEN ACTIVATED: Uncomment bcrypt.compare() call
    // const passwordMatch = await bcrypt.compare(password, instructor.password_hash);

    // For now, dummy check:
    const passwordMatch = false; // ← REPLACE WITH BCRYPT COMPARISON

    if (!passwordMatch) {
      log.warn(`Failed password attempt for instructor: ${email}`);
      return apiError('INVALID_REQUEST', 401, 'Invalid email or password');
    }

    // ─────────────────────────────────────────────────────────────
    // GENERATE JWT TOKEN
    // ─────────────────────────────────────────────────────────────
    // WHEN ACTIVATED: Uncomment JWT generation
    // const jwt = await new SignJWT({
    //   id: instructor.id,
    //   email: instructor.email,
    //   role: 'instructor',
    //   verified: true,
    // })
    //   .setProtectedHeader({ alg: 'HS256' })
    //   .setExpirationTime('24h')
    //   .sign(JWT_SECRET);

    // For now, dummy token:
    const jwt = 'COMMENTED_OUT_JWT_PLACEHOLDER';

    // ─────────────────────────────────────────────────────────────
    // LOG SUCCESS
    // ─────────────────────────────────────────────────────────────
    log.info(`✅ Instructor login successful: ${instructor.email} (${instructor.id})`);

    // ─────────────────────────────────────────────────────────────
    // RETURN TOKEN TO CLIENT
    // ─────────────────────────────────────────────────────────────
    return apiSuccess({
      success: true,
      token: jwt,
      instructor: {
        id: instructor.id,
        email: instructor.email,
      },
    });

  } catch (error) {
    log.error('Error during instructor login:', error);
    return apiError('INTERNAL_ERROR', 500, 'Login failed. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────
// MIGRATION NOTES (When activated)
// ─────────────────────────────────────────────────────────────
//
// 1. Instructor Table Schema:
//    CREATE TABLE instructors (
//      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//      email TEXT UNIQUE NOT NULL,
//      password_hash TEXT NOT NULL,  ← Hash using bcrypt
//      is_verified BOOLEAN DEFAULT FALSE,
//      verified_at TIMESTAMPTZ,
//      last_login TIMESTAMPTZ,
//      created_at TIMESTAMPTZ DEFAULT NOW()
//    );
//
// 2. Dependencies to add to package.json:
//    - "bcrypt": "^5.1.0"
//    - "jose": "^4.14.0"  (for JWT signing)
//
// 3. Environment variables needed:
//    JWT_SECRET=<random-32-char-key>  ← Generate with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
//
// 4. Frontend integration:
//    See instructors/login/page.tsx (also commented)
//
// 5. Error handling:
//    - 401: Invalid email/password (don't leak which one)
//    - 403: Email not verified
//    - 400: Missing fields or invalid format
//    - 500: Server error
//
*/

// Placeholder export while commented
export const metadata = {
  title: 'Instructor Login — COMMENTED OUT',
  description: 'This file contains instructor login logic prepared but not activated.',
};
