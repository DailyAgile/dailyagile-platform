/**
 * GET /api/instructor/students/[studentId]/performance
 * Get student performance across all quizzes
 * REQUIRES: Instructor authentication
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     student: { id, email, first_name, last_name },
 *     stats: {
 *       total_quizzes_assigned: number,
 *       total_quizzes_completed: number,
 *       completion_percentage: number,
 *       average_score: number,
 *       last_activity: string (ISO date)
 *     },
 *     quizzes: [
 *       {
 *         quiz_id: string,
 *         quiz_title: string,
 *         score: number | null,
 *         percentage: number | null,
 *         passed: boolean | null,
 *         attempted_at: string | null,
 *         duration_seconds: number | null,
 *         status: 'pending' | 'in_progress' | 'completed'
 *       }
 *     ]
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('StudentPerformance');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
): Promise<Response> {
  try {
    // Authentication
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { studentId } = await params;
    const supabase = getSupabaseClient();

    // 1. Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, email, first_name, last_name')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      log.warn(`Student ${studentId} not found`);
      return apiError('NOT_FOUND', 404, 'Student not found');
    }

    // 2. Get all quizzes assigned to this student by this instructor
    // First, get all quiz_assignments for this student
    const { data: assignments, error: assignmentsError } = await supabase
      .from('quiz_assignments')
      .select(
        `
        id,
        quiz_id,
        quizzes!inner (
          id,
          title,
          total_points,
          instructor_id
        )
      `,
      )
      .eq('student_id', studentId);

    if (assignmentsError) {
      log.error('Failed to fetch assignments:', assignmentsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch assignments');
    }

    // Filter to only quizzes owned by this instructor
    const instructorAssignments = (assignments || []).filter(
      (a: any) => a.quizzes?.instructor_id === authenticatedInstructor.id,
    );

    if (instructorAssignments.length === 0) {
      // No assignments from this instructor for this student
      return apiSuccess({
        data: {
          student,
          stats: {
            total_quizzes_assigned: 0,
            total_quizzes_completed: 0,
            completion_percentage: 0,
            average_score: 0,
            last_activity: null,
          },
          quizzes: [],
        },
      });
    }

    const quizIds = instructorAssignments.map((a: any) => a.quizzes.id);

    // 3. Get all quiz sessions (attempts) for this student on these quizzes
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, quiz_id, score, percentage, status, submitted_at, time_spent_seconds, started_at')
      .eq('student_id', studentId)
      .in('quiz_id', quizIds)
      .order('submitted_at', { ascending: false });

    if (sessionsError) {
      log.error('Failed to fetch sessions:', sessionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch sessions');
    }

    // 4. Map quiz assignments to results
    const quizResultsMap = new Map<string, any>();

    // First, initialize all assignments with pending status
    instructorAssignments.forEach((assignment: any) => {
      const quizId = assignment.quizzes.id;
      if (!quizResultsMap.has(quizId)) {
        quizResultsMap.set(quizId, {
          quiz_id: quizId,
          quiz_title: assignment.quizzes.title,
          score: null,
          percentage: null,
          passed: null,
          attempted_at: null,
          duration_seconds: null,
          status: 'pending',
        });
      }
    });

    // Then, update with actual session data
    (sessions || []).forEach((session: any) => {
      const quizId = session.quiz_id;
      if (quizResultsMap.has(quizId)) {
        const existing = quizResultsMap.get(quizId);
        // Only update if this is a completed session and we haven't seen one yet
        if (session.status === 'completed' && !existing.attempted_at) {
          quizResultsMap.set(quizId, {
            ...existing,
            score: session.score,
            percentage: session.percentage,
            passed: session.percentage !== null && session.percentage >= 60,
            attempted_at: session.submitted_at || session.started_at,
            duration_seconds: session.time_spent_seconds,
            status: session.status,
          });
        }
      }
    });

    const quizzes = Array.from(quizResultsMap.values());

    // 5. Calculate stats
    const completedQuizzes = quizzes.filter((q) => q.status === 'completed');
    const scores = completedQuizzes.filter((q) => q.score !== null).map((q: any) => q.score);

    const stats = {
      total_quizzes_assigned: quizzes.length,
      total_quizzes_completed: completedQuizzes.length,
      completion_percentage:
        quizzes.length > 0 ? Math.round((completedQuizzes.length / quizzes.length) * 100) : 0,
      average_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      last_activity: completedQuizzes.length > 0 ? completedQuizzes[0].attempted_at : null,
    };

    log.info(
      `Fetched performance for student ${student.email} by instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      data: {
        student,
        stats,
        quizzes,
      },
    });
  } catch (error) {
    log.error('Error getting student performance:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get student performance');
  }
}
