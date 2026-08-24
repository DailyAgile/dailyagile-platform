/**
 * GET /api/instructor/quiz/[quizId]/assignments
 * Get all assignments for a quiz
 * REQUIRES: Instructor authentication
 *
 * Query params:
 * - status?: 'active' | 'expired' | 'archived' (default: all)
 * - limit?: number (default: 50, max: 100)
 * - offset?: number (default: 0)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     assignments: [
 *       {
 *         id: string,
 *         assignment_code: string,
 *         student: { id: string, email: string, first_name: string, last_name: string },
 *         expires_at: string,
 *         status: 'active' | 'expired' | 'archived',
 *         attempts: number,
 *         completed: boolean,
 *         score?: number,
 *         created_at: string
 *       }
 *     ],
 *     total: number,
 *     limit: number,
 *     offset: number
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('GetQuizAssignments');

export async function GET(
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
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz belongs to this instructor
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to view assignments for quiz ${quizId} they don't own`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to view this quiz');
    }

    // Build query with optional status filter
    let query = supabase
      .from('quiz_assignments')
      .select(
        `
        id,
        assignment_code,
        expires_at,
        status,
        created_at,
        students!inner (
          id,
          email,
          first_name,
          last_name
        )
      `,
      )
      .eq('quiz_id', quizId)
      .eq('is_active', true);

    if (status && ['active', 'expired', 'archived'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: assignments, error: assignError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (assignError) {
      log.error('Failed to fetch assignments:', assignError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch assignments');
    }

    // For each assignment, get attempt count and completion status
    const enrichedAssignments = await Promise.all(
      (assignments || []).map(async (assignment: any) => {
        const { count: attemptCount } = await supabase
          .from('quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id);

        const { data: lastAttempt } = await supabase
          .from('quiz_attempts')
          .select('status, score')
          .eq('assignment_id', assignment.id)
          .eq('status', 'completed')
          .order('attempted_at', { ascending: false })
          .limit(1)
          .single();

        return {
          id: assignment.id,
          assignment_code: assignment.assignment_code,
          student: assignment.students,
          expires_at: assignment.expires_at,
          status: assignment.status,
          attempts: attemptCount || 0,
          completed: !!lastAttempt,
          score: lastAttempt?.score,
          created_at: assignment.created_at,
        };
      }),
    );

    // Get total count
    let countQuery = supabase
      .from('quiz_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('is_active', true);

    if (status && ['active', 'expired', 'archived'].includes(status)) {
      countQuery = countQuery.eq('status', status);
    }

    const { count: totalCount } = await countQuery;

    log.info(
      `Fetched ${enrichedAssignments.length} assignments for quiz ${quizId} by instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
      data: {
        assignments: enrichedAssignments,
        total: totalCount || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    log.error('Error getting quiz assignments:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get assignments');
  }
}
