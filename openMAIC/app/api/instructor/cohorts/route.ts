/**
 * POST /api/instructor/cohorts — Create a new cohort
 * GET /api/instructor/cohorts — List all cohorts for instructor
 *
 * REQUIRES: Instructor authentication
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('CohortAPI');

interface CreateCohortPayload {
  name: string;
  description?: string;
}

interface CohortResponse {
  id: string;
  instructor_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// POST /api/instructor/cohorts — Create cohort
// ============================================================================

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // Parse payload
    const payload: CreateCohortPayload = await req.json();

    // Validate required fields
    if (!payload.name || typeof payload.name !== 'string') {
      return apiError('VALIDATION_ERROR', 400, 'Cohort name is required and must be a string');
    }

    const name = payload.name.trim();
    if (name.length === 0) {
      return apiError('VALIDATION_ERROR', 400, 'Cohort name cannot be empty');
    }

    if (name.length > 255) {
      return apiError('VALIDATION_ERROR', 400, 'Cohort name must be 255 characters or less');
    }

    const description = payload.description?.trim() || null;

    const supabase = getSupabaseClient();

    // Create cohort
    const { data: cohort, error: createError } = await supabase
      .from('student_cohorts')
      .insert({
        instructor_id: authenticatedInstructor.email,
        name,
        description,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      // Check if it's a unique constraint violation
      if (createError.code === '23505') {
        log.warn(`Duplicate cohort name: ${name} for instructor ${authenticatedInstructor.email}`);
        return apiError('CONFLICT', 409, 'A cohort with this name already exists');
      }

      log.error('Failed to create cohort:', createError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to create cohort');
    }

    log.info(`Cohort created: ${cohort.id} by instructor ${authenticatedInstructor.email}`);

    return apiSuccess({
      success: true,
      data: {
        cohort: {
          id: cohort.id,
          instructor_id: cohort.instructor_id,
          name: cohort.name,
          description: cohort.description,
          is_active: cohort.is_active,
          member_count: 0,
          created_at: cohort.created_at,
          updated_at: cohort.updated_at,
        },
      },
    });
  } catch (error) {
    log.error('Error creating cohort:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to create cohort');
  }
}

// ============================================================================
// GET /api/instructor/cohorts — List cohorts
// ============================================================================

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // Get cohorts with member counts using the view
    const { data: cohorts, error: queryError } = await supabase
      .from('cohort_summary')
      .select(
        `
        id,
        instructor_id,
        name,
        description,
        is_active,
        member_count,
        created_at,
        updated_at
      `,
      )
      .eq('instructor_id', authenticatedInstructor.email)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (queryError) {
      log.error('Failed to fetch cohorts:', queryError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch cohorts');
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('student_cohorts')
      .select('id', { count: 'exact', head: true })
      .eq('instructor_id', authenticatedInstructor.email)
      .eq('is_active', true);

    if (countError) {
      log.error('Failed to count cohorts:', countError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch cohorts');
    }

    log.info(
      `Fetched ${cohorts?.length || 0} cohorts for instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
      data: {
        cohorts: cohorts || [],
        total: totalCount || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    log.error('Error fetching cohorts:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch cohorts');
  }
}
