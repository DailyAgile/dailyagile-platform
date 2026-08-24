/**
 * GET /api/instructor/quiz/[quizId]/available-students
 * Get students not yet assigned to this quiz
 * REQUIRES: Instructor authentication
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('AvailableStudents');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
): Promise<Response> {
  try {
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { quizId } = await params;
    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz belongs to this instructor
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      return apiError('FORBIDDEN', 403, 'You do not have permission to view this quiz');
    }

    // Get all students
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select('id, email, first_name, last_name')
      .order('first_name', { ascending: true });

    if (studentsError) {
      log.error('Failed to fetch students:', studentsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch students');
    }

    // Get already-assigned student IDs
    const { data: assignedStudents, error: assignError } = await supabase
      .from('quiz_assignments')
      .select('student_id')
      .eq('quiz_id', quizId)
      .eq('is_active', true);

    if (assignError) {
      log.error('Failed to fetch assignments:', assignError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch assignments');
    }

    const assignedIds = new Set((assignedStudents || []).map((a: any) => a.student_id));

    // Filter out already-assigned students
    const availableStudents = (allStudents || []).filter(
      (student: any) => !assignedIds.has(student.id),
    );

    log.info(
      `Fetched ${availableStudents.length} available students for quiz ${quizId} (${assignedIds.size} already assigned)`,
    );

    return apiSuccess({
      success: true,
      data: {
        students: availableStudents,
        total: availableStudents.length,
        already_assigned: assignedIds.size,
      },
    });
  } catch (error) {
    log.error('Error fetching available students:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch available students');
  }
}
