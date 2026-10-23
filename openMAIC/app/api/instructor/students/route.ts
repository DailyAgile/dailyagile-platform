/**
 * GET /api/instructor/students
 * List all students assigned to instructor's quizzes with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentList } from '@/lib/student-service';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('GetInstructorStudents');

export async function GET(request: NextRequest) {
  try {
    // Verify instructor authentication
    let instructor;
    try {
      instructor = await requireInstructor(request);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') || 'all') as 'all' | 'completed' | 'pending';

    // Call service function
    const result = await getStudentList(
      { page, limit, search, status },
      instructor.id
    );

    if (!result.success) {
      log.warn(`Failed to get student list: ${result.error || 'Unknown error'}`);
      return apiError('INVALID_REQUEST', 400, result.error || 'Failed to retrieve student list');
    }

    log.info(`Retrieved ${result.data.students.length} students for ${instructor.email}`);
    return apiSuccess(result.data);
  } catch (error) {
    log.error('GET /api/instructor/students error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
}
