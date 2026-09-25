/**
 * POST /api/instructor/cohorts/[cohortId]/add-student
 * Add a student to a cohort
 *
 * REQUIRES: Instructor authentication
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('AddStudentToCohort');

interface AddStudentPayload {
  student_id: string;
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(
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

    // Validate cohort ID is UUID
    if (!isValidUUID(cohortId)) {
      return apiError('VALIDATION_ERROR', 400, 'Invalid cohort ID format');
    }

    // Parse payload
    const payload: AddStudentPayload = await req.json();

    // Validate student_id
    if (!payload.student_id || typeof payload.student_id !== 'string') {
      return apiError('VALIDATION_ERROR', 400, 'Student ID is required');
    }

    if (!isValidUUID(payload.student_id)) {
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

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', payload.student_id)
      .single();

    if (studentError || !student) {
      log.warn(`Student not found: ${payload.student_id}`);
      return apiError('NOT_FOUND', 404, 'Student not found');
    }

    // Add student to cohort
    const { data: member, error: addError } = await supabase
      .from('cohort_members')
      .insert({
        cohort_id: cohortId,
        student_id: payload.student_id,
      })
      .select()
      .single();

    if (addError) {
      // Check if it's a unique constraint violation
      if (addError.code === '23505') {
        log.warn(
          `Student ${payload.student_id} already in cohort ${cohortId}`,
        );
        return apiError(
          'CONFLICT',
          409,
          'Student is already a member of this cohort',
        );
      }

      log.error('Failed to add student to cohort:', addError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to add student to cohort');
    }

    log.info(
      `Student ${payload.student_id} added to cohort ${cohortId} by instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
      data: {
        member: {
          cohort_id: member.cohort_id,
          student_id: member.student_id,
          added_at: member.added_at,
        },
      },
    });
  } catch (error) {
    log.error('Error adding student to cohort:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to add student to cohort');
  }
}
