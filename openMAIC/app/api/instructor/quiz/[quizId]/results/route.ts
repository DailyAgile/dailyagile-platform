/**
 * GET /api/instructor/quiz/[quizId]/results
 * Get all quiz results and completion stats
 * REQUIRES: Instructor authentication
 *
 * Query params:
 * - limit?: number (default: 50, max: 100)
 * - offset?: number (default: 0)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     quiz: { id, title, total_questions, total_points },
 *     results: [
 *       {
 *         id: string,
 *         assignment_id: string,
 *         student: { id, email, first_name, last_name },
 *         status: 'pending' | 'in_progress' | 'completed',
 *         score?: number,
 *         percentage?: number,
 *         attempted_at: string,
 *         duration_seconds?: number
 *       }
 *     ],
 *     stats: {
 *       total_assignments: number,
 *       total_completed: number,
 *       average_score: number,
 *       pass_rate: number (percentage)
 *     },
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

const log = createLogger('GetQuizResults');

interface StudentInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface QuizAttempt {
  id: string;
  assignment_id: string;
  status: string;
  score: number | null;
  attempted_at: string;
  duration_seconds: number | null;
  quiz_assignments: {
    id: string;
    students: StudentInfo;
  };
}

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz belongs to this instructor
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, total_questions, total_points, instructor_id, passing_score_percentage')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to view results for quiz ${quizId} they don't own`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to view this quiz');
    }

    // Attempts are stored in student_quiz_history (see /api/quiz/submit).
    const { data: historyRows, error: attemptsError } = await supabase
      .from('student_quiz_history')
      .select('id, student_id, score, percentage, passed, attempted_at, time_taken_seconds')
      .eq('quiz_id', quizId)
      .order('attempted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const studentIds = [...new Set((historyRows || []).map((r: { student_id: string }) => r.student_id))];
    const { data: studentRows } = studentIds.length
      ? await supabase.from('students').select('id, email, first_name, last_name').in('id', studentIds)
      : { data: [] as Array<{ id: string }> };
    const studentById = new Map((studentRows || []).map((st: { id: string }) => [st.id, st]));

    const attempts = (historyRows || []).map((r: { id: string; student_id: string; score: number; attempted_at: string; time_taken_seconds: number | null }) => ({
      id: r.id,
      assignment_id: null,
      status: 'completed',
      score: r.score,
      attempted_at: r.attempted_at,
      duration_seconds: r.time_taken_seconds,
      quiz_assignments: { id: null, students: studentById.get(r.student_id) ?? null },
    })) as QuizAttempt[];

    if (attemptsError) {
      log.error('Failed to fetch attempts:', attemptsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch results');
    }

    // Transform results
    const results = (attempts || []).map((attempt: QuizAttempt) => {
      const percentage =
        attempt.score !== null && quiz.total_points > 0
          ? Math.round((attempt.score / quiz.total_points) * 100)
          : null;

      return {
        id: attempt.id,
        assignment_id: attempt.assignment_id,
        student: attempt.quiz_assignments?.students,
        status: attempt.status,
        score: attempt.score,
        percentage,
        attempted_at: attempt.attempted_at,
        duration_seconds: attempt.duration_seconds,
      };
    });

    // Calculate stats
    const completedAttempts = (attempts || []).filter((a: QuizAttempt) => a.status === 'completed');
    // Percentages, so the average and pass rate match the student's results screen.
    const percentOf = (score: number | null) =>
      score !== null && quiz.total_points > 0 ? (score / quiz.total_points) * 100 : null;
    const passMark = quiz.passing_score_percentage ?? 70;
    const percents = completedAttempts
      .map((a: QuizAttempt) => percentOf(a.score))
      .filter((p: number | null): p is number => p !== null);

    const stats = {
      total_attempts: attempts?.length || 0,
      completed_count: completedAttempts.length,
      average_score:
        percents.length > 0
          ? Math.round(percents.reduce((a: number, b: number) => a + b, 0) / percents.length)
          : 0,
      pass_rate:
        percents.length > 0
          ? Math.round((percents.filter((p: number) => p >= passMark).length / percents.length) * 100)
          : 0,
    };

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('student_quiz_history')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quizId);

    log.info(
      `Fetched ${results.length} results for quiz ${quizId} by instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          total_questions: quiz.total_questions,
          total_points: quiz.total_points,
        },
        results,
        stats,
        total: totalCount || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    log.error('Error getting quiz results:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get results');
  }
}
