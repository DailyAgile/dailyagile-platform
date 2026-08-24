/**
 * Assignment Detail & Extend Endpoints
 * GET /api/quiz/assignments/[assignmentId] — Get assignment details
 * PATCH /api/quiz/assignments/[assignmentId]/extend — Extend deadline
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { getAssignmentWithQuiz, extendAssignment } from '@/lib/quiz/assignment-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('AssignmentDetailRoute');

/**
 * GET /api/quiz/assignments/[assignmentId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION
    let user;
    try {
      user = await requireAuth(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { assignmentId } = await params;

    // 💾 DATABASE
    const supabase = getSupabaseClient();

    const { data: assignment, error } = await supabase
      .from('quiz_assignments')
      .select(
        `
        *,
        quizzes!inner(
          id,
          title,
          description,
          total_questions,
          total_points,
          time_limit_minutes,
          attempt_limit,
          pass_threshold
        ),
        students(
          id,
          email,
          first_name,
          last_name
        )
      `
      )
      .eq('id', assignmentId)
      .eq('is_active', true)
      .single();

    if (error || !assignment) {
      return apiError('NOT_FOUND', 404, 'Assignment not found');
    }

    // 🔍 AUTHORIZATION
    if (user.role === 'instructor' || user.role === 'admin') {
      // Instructor can view their own assignments
      if (assignment.instructor_id !== user.email) {
        log.warn(`Unauthorized assignment access by ${user.email}`);
        return apiError('FORBIDDEN', 403, 'You do not have permission to view this assignment');
      }

      // Get student attempt stats
      const { count: attemptCount } = await supabase
        .from('quiz_sessions')
        .select('id', { count: 'exact' })
        .eq('assignment_id', assignmentId)
        .eq('status', 'completed');

      log.info(`Instructor ${user.email} viewing assignment ${assignmentId}`);

      return apiSuccess({
        data: {
          assignment_id: assignment.id,
          assignment_code: assignment.assignment_code,
          quiz: assignment.quizzes[0],
          student: assignment.students ? {
            id: assignment.students.id,
            email: assignment.students.email,
            name: `${assignment.students.first_name} ${assignment.students.last_name}`,
          } : null,
          expires_at: assignment.expires_at,
          status: assignment.status,
          created_at: assignment.created_at,
          completion_stats: {
            total_attempts: attemptCount || 0,
            attempt_limit: assignment.quizzes[0]?.attempt_limit,
          },
        },
      });
    } else if (user.role === 'student') {
      // Student can view assignments assigned to them
      if (assignment.student_id && assignment.student_id !== user.id) {
        log.warn(`Unauthorized assignment access by student ${user.email}`);
        return apiError('FORBIDDEN', 403, 'You do not have access to this assignment');
      }

      log.info(`Student ${user.email} viewing assignment ${assignmentId}`);

      return apiSuccess({
        data: {
          assignment_id: assignment.id,
          assignment_code: assignment.assignment_code,
          quiz: assignment.quizzes[0],
          expires_at: assignment.expires_at,
          is_expired: new Date() >= new Date(assignment.expires_at),
        },
      });
    }

    return apiError('FORBIDDEN', 403, 'Invalid user role');
  } catch (error) {
    log.error('Error in GET /api/quiz/assignments/[assignmentId]:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}

interface ExtendAssignmentRequest {
  new_expiry_date: string; // ISO timestamp
  student_ids?: string[]; // Optional: extend for specific students only
}

/**
 * PATCH /api/quiz/assignments/[assignmentId]/extend
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let instructor;
    try {
      instructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { assignmentId } = await params;
    const body = (await req.json()) as ExtendAssignmentRequest;

    // 📥 VALIDATION
    if (!body.new_expiry_date) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'new_expiry_date is required'
      );
    }

    const newExpiryDate = new Date(body.new_expiry_date);
    if (isNaN(newExpiryDate.getTime())) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'new_expiry_date must be a valid ISO timestamp'
      );
    }

    if (newExpiryDate <= new Date()) {
      return apiError(
        'INVALID_TIME',
        400,
        'New expiry date must be in the future'
      );
    }

    // 💾 DATABASE: Extend assignment
    log.info(`Extending assignment ${assignmentId} by ${instructor.email}`);

    const supabase = getSupabaseClient();

    // Verify instructor owns the assignment
    const { data: assignment, error: checkError } = await supabase
      .from('quiz_assignments')
      .select('id, instructor_id')
      .eq('id', assignmentId)
      .single();

    if (checkError || !assignment || assignment.instructor_id !== instructor.email) {
      return apiError(
        'FORBIDDEN',
        403,
        'You do not have permission to modify this assignment'
      );
    }

    // Extend assignment
    const updated = await extendAssignment(
      assignmentId,
      instructor.email,
      body.new_expiry_date
    );

    if (!updated) {
      return apiError(
        'UPDATE_FAILED',
        500,
        'Failed to extend assignment'
      );
    }

    log.info(`✅ Assignment extended: ${assignmentId}`);

    return apiSuccess({
      data: {
        assignment_id: updated.id,
        new_expiry_date: updated.expires_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    log.error('Error in PATCH /api/quiz/assignments/[assignmentId]:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
