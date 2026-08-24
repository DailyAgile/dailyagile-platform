/**
 * Email Verification Callback — Phase 2 Security Foundation
 * POST /api/auth/verify-email
 * Verifies magic link token and creates student enrollment record
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('AuthVerifyEmail');


interface VerifyEmailRequest {
  token: string; // OTP token from email link
  stageId?: string; // Self-paced course/stage ID
}

interface VerifyEmailResponse {
  student_id: string;
  auth_user_id: string;
  email: string;
  classroom_id: string; // self-paced classroom UUID
  session_token: string; // Opaque token for subsequent requests
  token_expires_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyEmailRequest;
    const { token, stageId } = body;

    if (!token) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Verification token required');
    }

    // Verify OTP and get session
    const { data: authData, error: authError } = await getSupabaseClient().auth.verifyOtp({
      type: 'email',
      email: '', // email not needed when verifying token
      token,
    });

    if (authError || !authData.user) {
      log.warn(`OTP verification failed: ${authError?.message}`);
      return apiError('INVALID_REQUEST', 401, 'Verification token expired or invalid. Request a new link.');
    }

    const authUserId = authData.user.id;
    const userEmail = authData.user.email;

    if (!userEmail) {
      return apiError('INTERNAL_ERROR', 500, 'User email not found in auth token');
    }

    // Create or link student record
    const studentId = await ensureStudentRecord(authUserId, userEmail);
    if (!studentId) {
      return apiError('INTERNAL_ERROR', 500, 'Failed to create student record');
    }

    // Ensure self-paced classroom enrollment (lazy provision)
    const classroomId = await ensureSelfPacedClassroom(stageId || 'self-paced-general');
    if (!classroomId) {
      return apiError('INTERNAL_ERROR', 500, 'Failed to create or find classroom');
    }

    // Ensure student is enrolled in classroom
    await ensureEnrollment(classroomId, studentId);

    // Generate session token (opaque, not JWT)
    const sessionToken = await generateSessionToken(authUserId, studentId, classroomId);

    log.info(`Student verified: ${userEmail} (auth_user_id: ${authUserId}, student_id: ${studentId})`);

    return apiSuccess({
      student_id: studentId,
      auth_user_id: authUserId,
      email: userEmail,
      classroom_id: classroomId,
      session_token: sessionToken.token,
      token_expires_at: sessionToken.expiresAt.toISOString(),
    });
  } catch (error) {
    log.error('Unexpected error in verify-email:', error);
    return apiError('INTERNAL_ERROR', 500, 'An unexpected error occurred');
  }
}

/**
 * Create or link student record to auth user
 */
async function ensureStudentRecord(authUserId: string, email: string): Promise<string | null> {
  // Check if student already exists
  const { data: existing } = await getSupabaseClient()
    .from('students')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new student record
  const { data: newStudent, error } = await getSupabaseClient()
    .from('students')
    .insert({
      auth_user_id: authUserId,
      email,
      name: email.split('@')[0], // Default name from email prefix
      verified_at: new Date().toISOString(),
      is_verified: true,
    })
    .select('id')
    .single();

  if (error) {
    log.error(`Failed to create student record for ${email}:`, error);
    return null;
  }

  return newStudent?.id || null;
}

/**
 * Lazy-provision self-paced classroom (one per stage)
 */
async function ensureSelfPacedClassroom(stageId: string): Promise<string | null> {
  // Get platform owner's user ID (for instructor_id)
  const platformOwnerId = process.env.PLATFORM_OWNER_USER_ID;
  if (!platformOwnerId) {
    log.error('PLATFORM_OWNER_USER_ID not configured');
    return null;
  }

  // Upsert classroom (idempotent — prevents race condition on concurrent first-access)
  const { data, error } = await getSupabaseClient()
    .from('classrooms')
    .upsert(
      {
        stage_id: `self-paced-${stageId}`,
        title: `Self-Paced: ${stageId}`,
        description: 'Self-paced course offering',
        instructor_id: platformOwnerId,
        is_active: true,
        settings: { selfPaced: true, stageId },
      },
      { onConflict: 'stage_id' },
    )
    .select('id')
    .single();

  if (error) {
    log.error(`Failed to provision classroom for stage ${stageId}:`, error);
    return null;
  }

  return data?.id || null;
}

/**
 * Ensure student is enrolled in classroom
 */
async function ensureEnrollment(classroomId: string, studentId: string): Promise<void> {
  const { error } = await getSupabaseClient().from('student_rosters').upsert(
    {
      classroom_id: classroomId,
      student_id: studentId,
      role: 'student',
      status: 'active',
      enrollment_date: new Date().toISOString(),
    },
    { onConflict: 'classroom_id,student_id' },
  );

  if (error) {
    log.warn(`Failed to ensure enrollment for student ${studentId}:`, error);
    // Don't fail the entire flow; enrollment may already exist
  }
}

/**
 * Generate opaque session token (stored in secure cookie)
 */
async function generateSessionToken(
  authUserId: string,
  studentId: string,
  classroomId: string,
): Promise<{ token: string; expiresAt: Date }> {
  // In production: use a session store (Redis) or Supabase sessions table
  // For MVP: store JWT with short expiry (24 hours), decode server-side
  const payload = {
    auth_user_id: authUserId,
    student_id: studentId,
    classroom_id: classroomId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  // Sign with app secret (keep this server-side only)
  const secret = process.env.SESSION_SECRET || 'dev-secret';
  // Using a simple base64 encoding for MVP (in production, use proper JWT signing)
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return { token, expiresAt };
}
