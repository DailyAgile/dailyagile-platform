/**
 * PATCH /api/instructor/cohorts/[cohortId] — Update cohort
 * DELETE /api/instructor/cohorts/[cohortId] — Delete cohort
 *
 * REQUIRES: Instructor authentication
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('CohortDetailAPI');

interface UpdateCohortPayload {
  name?: string;
  description?: string;
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// PATCH /api/instructor/cohorts/[cohortId] — Update cohort
// ============================================================================

export async function PATCH(
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

    // Validate cohort ID
    if (!isValidUUID(cohortId)) {
      return apiError('VALIDATION_ERROR', 400, 'Invalid cohort ID format');
    }

    const payload: UpdateCohortPayload = await req.json();

    // Validate input
    if (payload.name !== undefined) {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (name.length === 0) {
        return apiError('VALIDATION_ERROR', 400, 'Cohort name cannot be empty');
      }
      if (name.length > 255) {
        return apiError('VALIDATION_ERROR', 400, 'Cohort name must be 255 characters or less');
      }
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

    // Prepare update object
    const updateData: any = {};
    if (payload.name !== undefined) {
      updateData.name = payload.name.trim();
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('VALIDATION_ERROR', 400, 'No fields to update');
    }

    // Update cohort
    const { data: updated, error: updateError } = await supabase
      .from('student_cohorts')
      .update(updateData)
      .eq('id', cohortId)
      .select()
      .single();

    if (updateError) {
      // Check if it's a unique constraint violation (duplicate name)
      if (updateError.code === '23505') {
        log.warn(`Duplicate cohort name for instructor ${authenticatedInstructor.email}`);
        return apiError('CONFLICT', 409, 'A cohort with this name already exists');
      }

      log.error('Failed to update cohort:', updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to update cohort');
    }

    // Get updated cohort with member count
    const { data: cohortWithCount } = await supabase
      .from('cohort_summary')
      .select('*')
      .eq('id', cohortId)
      .single();

    log.info(`Cohort ${cohortId} updated by instructor ${authenticatedInstructor.email}`);

    return apiSuccess({
      success: true,
      data: {
        cohort: cohortWithCount || updated,
      },
    });
  } catch (error) {
    log.error('Error updating cohort:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to update cohort');
  }
}

// ============================================================================
// DELETE /api/instructor/cohorts/[cohortId] — Delete cohort
// ============================================================================

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

    // Validate cohort ID
    if (!isValidUUID(cohortId)) {
      return apiError('VALIDATION_ERROR', 400, 'Invalid cohort ID format');
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
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} tried to delete cohort ${cohortId}`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to delete this cohort');
    }

    // Soft delete: Mark as inactive instead of hard delete
    const { error: deleteError } = await supabase
      .from('student_cohorts')
      .update({ is_active: false })
      .eq('id', cohortId);

    if (deleteError) {
      log.error('Failed to delete cohort:', deleteError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to delete cohort');
    }

    log.info(`Cohort ${cohortId} deleted by instructor ${authenticatedInstructor.email}`);

    return apiSuccess({
      success: true,
    });
  } catch (error) {
    log.error('Error deleting cohort:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to delete cohort');
  }
}
