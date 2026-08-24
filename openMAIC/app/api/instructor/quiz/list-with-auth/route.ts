/**
 * GET /api/instructor/quiz/list-with-auth
 * List all quizzes created by the authenticated instructor
 * REQUIRES: Instructor authentication (JWT token)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     quizzes: [
 *       {
 *         id: string,
 *         title: string,
 *         quiz_code: string,
 *         total_questions: number,
 *         total_points: number,
 *         is_published: boolean,
 *         assignment_count: number,
 *         completed_count: number,
 *         created_at: string
 *       }
 *     ],
 *     total: number
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('ListInstructorQuizzesWithAuth');

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Get quizzes created by this instructor only
    // Query with aggregates for assignment count and completion stats
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select(
        `
        id,
        title,
        quiz_code,
        total_questions,
        total_points,
        is_published,
        created_at,
        instructor_id
      `,
      )
      .eq('instructor_id', authenticatedInstructor.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      log.error('Failed to fetch quizzes:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quizzes');
    }

    // For each quiz, get assignment count using separate query
    // (to avoid N+1 queries, could be optimized with RPC in production)
    const enrichedQuizzes = await Promise.all(
      (quizzes || []).map(async (quiz: any) => {
        const { count: assignmentCount } = await supabase
          .from('quiz_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id)
          .eq('is_active', true);

        const { count: completedCount } = await supabase
          .from('quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id)
          .eq('status', 'completed');

        return {
          id: quiz.id,
          title: quiz.title,
          quiz_code: quiz.quiz_code,
          total_questions: quiz.total_questions,
          total_points: quiz.total_points,
          is_published: quiz.is_published || false,
          assignment_count: assignmentCount || 0,
          completed_count: completedCount || 0,
          created_at: quiz.created_at,
        };
      }),
    );

    // Get total count
    const { count: totalCount } = await supabase
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('instructor_id', authenticatedInstructor.id)
      .eq('is_active', true);

    log.info(
      `Fetched ${enrichedQuizzes.length} quizzes for instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
      data: {
        quizzes: enrichedQuizzes,
        total: totalCount || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    log.error('Error listing quizzes:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to list quizzes');
  }
}
