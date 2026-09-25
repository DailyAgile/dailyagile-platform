/**
 * DELETE /api/instructor/cohorts/[cohortId]/remove-student
 * Remove a student from a cohort
 *
 * Query params:
 * - student_id: UUID of student to remove
 *
 * REQUIRES: Instructor authentication
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('RemoveStudentFromCohort');

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> },
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { cohortId } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('student_id');

    // Validate IDs
    if (!isValidUUID(cohortId)) {
      return apiError('VALIDATION_ERROR', 400, 'Invalid cohort ID format');
    }

    if (!studentId || !isValidUUID(studentId)) {
      return apiError('VALIDATION_ERROR', 400, 'Invalid student ID format');
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify cohort belongs to instructor
    const { data: cohort, error: cohortError } = await supabase
      .from('student_cohorts')
      .select('id, instructor_id')
      .eq('id', cohortId)
      .single();

    if (cohortError || !cohort) {
      log.warn(`Cohort not found: ${cohortId}`);
      return apiError('NOT_FOUND', 404, 'Cohort not found');
    }

    if (cohort.instructor_id !== authenticatedInstructor.email) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} tried to modify cohort ${cohortId}`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to modify this cohort');
    }

    // Verify member exists before deleting
    const { data: member, error: memberError } = await supabase
      .from('cohort_members')
      .select('id')
      .eq('cohort_id', cohortId)
      .eq('student_id', studentId)
      .single();

    if (memberError || !member) {
      log.warn(`Student ${studentId} is not a member of cohort ${cohortId}`);
      return apiError('NOT_FOUND', 404, 'Student is not a member of this cohort');
    }

    // Remove student from cohort
    const { error: deleteError } = await supabase
      .from('cohort_members')
      .delete()
      .eq('cohort_id', cohortId)
      .eq('student_id', studentId);

    if (deleteError) {
      log.error('Failed to remove student from cohort:', deleteError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to remove student from cohort');
    }

    log.info(
      `Student ${studentId} removed from cohort ${cohortId} by instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
    });
  } catch (error) {
    log.error('Error removing student from cohort:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to remove student from cohort');
  }
}
