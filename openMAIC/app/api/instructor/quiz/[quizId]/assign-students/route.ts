/**
 * POST /api/instructor/quiz/[quizId]/assign-students
 * Assign a quiz to one or multiple students
 */

import { NextRequest } from 'next/server';
import { assignQuizToStudents } from '@/lib/student-service';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('AssignStudentsToQuiz');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    // Verify instructor authentication
    let instructor;
    try {
      instructor = await requireInstructor(request);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // Parse request body
    const body = await request.json();
    const { student_ids, deadline, notify_students } = body;

    // Validate input
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'student_ids must be a non-empty array'
      );
    }

    // Call service function
    const result = await assignQuizToStudents({
      quizId,
      studentIds: student_ids,
      instructorId: instructor.email,
      deadline,
      notifyStudents: notify_students,
    });

    if (!result.success) {
      log.warn(`Failed to assign quiz: ${result.error}`);
      return apiError('INVALID_REQUEST', 400, result.error || 'Failed to assign quiz');
    }

    log.info(
      `Quiz ${quizId} assigned to ${result.data.assigned_count} students by ${instructor.email}`
    );
    return apiSuccess(result.data);
  } catch (error) {
    log.error('POST /api/instructor/quiz/[quizId]/assign-students error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
}
