/**
 * GET /api/instructor/requests
 * Get all extension/new-code requests for authenticated instructor
 * REQUIRES: Instructor authentication (JWT token)
 *
 * Query params:
 * - status?: 'pending' | 'approved' | 'denied' (default: 'pending')
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('GetRequests');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const supabase = getSupabaseClient();

    // 🔒 Get only requests for this instructor's assignments
    const { data: requests, error } = await supabase
      .from('assignment_extension_requests')
      .select(
        `
        id,
        assignment_id,
        student_id,
        request_type,
        requested_at,
        status,
        instructor_response,
        new_expiry_date,
        quiz_assignments!inner (
          id,
          quiz_id,
          student_id,
          expires_at,
          instructor_id,
          quizzes!inner (
            id,
            title
          ),
          students!inner (
            id,
            email,
            first_name,
            last_name
          )
        )
      `,
      )
      .eq('quiz_assignments.instructor_id', authenticatedInstructor.id)
      .eq('assignment_extension_requests.status', status)
      .order('requested_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch requests:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch requests');
    }

    log.info(`Fetched ${requests?.length || 0} ${status} requests for ${authenticatedInstructor.email}`);

    return apiSuccess({
      success: true,
      data: {
        requests: requests || [],
        count: requests?.length || 0,
        status,
      },
    });
  } catch (error) {
    log.error('Error getting requests:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get requests');
  }
}
