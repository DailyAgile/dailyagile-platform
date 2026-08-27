/**
 * DELETE /api/instructor/quiz/[quizId]/remove-admin
 * Remove admin role from an instructor on this quiz
 * REQUIRES: Quiz owner authentication
 *
 * Query params:
 * - instructor_id: UUID of the instructor to remove
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('RemoveAdminFromQuiz');

export async function DELETE(
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
    const { searchParams } = new URL(req.url);
    const instructorId = searchParams.get('instructor_id');

    if (!instructorId) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'instructor_id query parameter is required'
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
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to remove admin from quiz ${quizId} they don't own`
      );
      return apiError(
        'FORBIDDEN',
        403,
        'You do not have permission to manage this quiz'
      );
    }

    // Verify the role exists before attempting to delete
    const { data: role, error: roleError } = await supabase
      .from('instructor_roles')
      .select('id, instructor_id, role')
      .eq('quiz_id', quizId)
      .eq('instructor_id', instructorId)
      .single();

    if (roleError || !role) {
      log.warn(
        `Role not found for instructor ${instructorId} on quiz ${quizId}`
      );
      return apiError(
        'NOT_FOUND',
        404,
        'Instructor role not found on this quiz'
      );
    }

    // Delete the instructor role
    const { error: deleteError } = await supabase
      .from('instructor_roles')
      .delete()
      .eq('quiz_id', quizId)
      .eq('instructor_id', instructorId);

    if (deleteError) {
      log.error('Failed to remove admin from quiz:', deleteError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to remove admin from quiz');
    }

    // Get the instructor email for the response
    const { data: targetInstructor } = await supabase
      .from('instructors')
      .select('email')
      .eq('id', instructorId)
      .single();

    log.info(
      `✅ Instructor ${targetInstructor?.email || instructorId} removed from quiz "${quiz.title}" (${quizId}) by ${authenticatedInstructor.email}`
    );

    return apiSuccess({
      success: true,
      data: {
        message: `${targetInstructor?.email || instructorId} removed from "${quiz.title}"`,
        quiz_id: quizId,
        instructor_id: instructorId,
      },
    });
  } catch (error) {
    log.error('Error removing admin from quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to remove admin from quiz');
  }
}
