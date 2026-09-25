/**
 * POST /api/instructor/quiz/[quizId]/add-admin
 * Assign admin role to another instructor on this quiz
 * REQUIRES: Quiz owner authentication
 *
 * Body:
 * {
 *   instructor_email: string,  // Email of instructor to add as admin
 *   role: 'admin' | 'viewer'   // Role to assign (default: 'admin')
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('AddAdminToQuiz');

interface AddAdminRequest {
  instructor_email: string;
  role?: 'admin' | 'viewer';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { quizId } = await params;
    const body = (await req.json()) as AddAdminRequest;
    const { instructor_email, role = 'admin' } = body;

    // Validate input
    if (!instructor_email || !instructor_email.trim()) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'instructor_email is required'
      );
    }

    if (!['admin', 'viewer'].includes(role)) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'role must be "admin" or "viewer"'
      );
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz exists AND instructor is the owner
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to add admin to quiz ${quizId} they don't own`
      );
      return apiError(
        'FORBIDDEN',
        403,
        'You do not have permission to manage this quiz'
      );
    }

    // Find the target instructor by email
    const { data: targetInstructor, error: instructorError } = await supabase
      .from('instructors')
      .select('id, email')
      .eq('email', instructor_email.toLowerCase().trim())
      .single();

    if (instructorError || !targetInstructor) {
      log.warn(
        `Instructor not found: ${instructor_email}`
      );
      return apiError(
        'NOT_FOUND',
        404,
        `Instructor with email "${instructor_email}" not found`
      );
    }

    // Check if trying to add themselves
    if (targetInstructor.id === authenticatedInstructor.id) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Cannot change your own role on this quiz'
      );
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('instructor_roles')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('instructor_id', targetInstructor.id)
      .single();

    let roleResponse;
    let roleError;

    if (existingRole) {
      // Update existing role
      const result = await supabase
        .from('instructor_roles')
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('quiz_id', quizId)
        .eq('instructor_id', targetInstructor.id)
        .select()
        .single();

      roleResponse = result.data;
      roleError = result.error;
    } else {
      // Insert new role
      const result = await supabase
        .from('instructor_roles')
        .insert({
          quiz_id: quizId,
          instructor_id: targetInstructor.id,
          role,
          assigned_by: authenticatedInstructor.id,
        })
        .select()
        .single();

      roleResponse = result.data;
      roleError = result.error;
    }

    if (roleError) {
      log.error('Failed to manage instructor role:', {
        error: roleError,
        quiz_id: quizId,
        instructor_id: targetInstructor.id,
        operation: existingRole ? 'update' : 'insert',
      });
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to assign role to instructor'
      );
    }

    if (!roleResponse) {
      log.error('Role operation succeeded but returned no data');
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Role assignment did not return data'
      );
    }

    log.info(
      `✅ Instructor ${targetInstructor.email} added as ${role} to quiz "${quiz.title}" (${quizId}) by ${authenticatedInstructor.email}`
    );

    return apiSuccess({
      success: true,
      data: {
        message: `${targetInstructor.email} added as ${role} to "${quiz.title}"`,
        quiz_id: quizId,
        instructor_id: targetInstructor.id,
        instructor_email: targetInstructor.email,
        role,
      },
    });
  } catch (error) {
    log.error('Error adding admin to quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to add admin to quiz');
  }
}
