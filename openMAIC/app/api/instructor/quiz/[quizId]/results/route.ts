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
      .select('id, title, total_questions, total_points, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to view results for quiz ${quizId} they don't own`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to view this quiz');
    }

    // Get all attempts for this quiz with student info
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(
        `
        id,
        assignment_id,
        status,
        score,
        attempted_at,
        duration_seconds,
        quiz_assignments!inner (
          id,
          students!inner (
            id,
            email,
            first_name,
            last_name
          )
        )
      `,
      )
      .eq('quiz_id', quizId)
      .order('attempted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (attemptsError) {
      log.error('Failed to fetch attempts:', attemptsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch results');
    }

    // Transform results
    const results = (attempts || []).map((attempt: any) => {
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
    const completedAttempts = (attempts || []).filter((a: any) => a.status === 'completed');
    const scores = completedAttempts
      .filter((a: any) => a.score !== null)
      .map((a: any) => a.score as number);

    const stats = {
      total_attempts: attempts?.length || 0,
      completed_count: completedAttempts.length,
      average_score:
        scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0,
      pass_rate:
        completedAttempts.length > 0
          ? Math.round(
              (completedAttempts.filter((a: any) => (a.score || 0) >= (quiz.total_points || 0) * 0.6)
                .length /
                completedAttempts.length) *
                100,
            )
          : 0,
    };

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('quiz_attempts')
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
