/**
 * Quiz Results Endpoints
 * GET /api/quiz/results — Get all results for a quiz (instructor)
 * GET /api/quiz/results/[sessionId] — Get result for specific session (student)
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizResultsRoute');

/**
 * GET /api/quiz/results?quiz_id=X
 * Instructor views all results for their quiz
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION
    let user;
    try {
      user = await requireAuth(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quiz_id');
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status'); // passed, failed, in_progress
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    if (!quizId) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'quiz_id query parameter is required'
      );
    }

    // 🔍 AUTHORIZATION: Check if user is instructor of this quiz
    if (user.role !== 'instructor' && user.role !== 'admin') {
      return apiError('FORBIDDEN', 403, 'Only instructors can view quiz results');
    }

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id, title')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return apiError('QUIZ_NOT_FOUND', 404, 'Quiz not found');
    }

    if (quiz.instructor_id !== user.email) {
      log.warn(`Unauthorized results access by ${user.email}`);
      return apiError('FORBIDDEN', 403, 'You do not have permission to view these results');
    }

    // 💾 DATABASE: Get results
    let query = supabase
      .from('quiz_sessions')
      .select(
        `
        id,
        student_id,
        student_email,
        status,
        attempt_number,
        percentage,
        total_score,
        max_score,
        is_passed,
        started_at,
        completed_at,
        students!inner(
          id,
          email,
          first_name,
          last_name
        )
      `,
        { count: 'exact' }
      )
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (status === 'passed') {
      query = query.eq('is_passed', true).eq('status', 'completed');
    } else if (status === 'failed') {
      query = query.eq('is_passed', false).eq('status', 'completed');
    } else if (status === 'in_progress') {
      query = query.eq('status', 'in_progress');
    }

    const { data: results, error, count } = await query;

    if (error) {
      log.error('Error fetching results:', error);
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to fetch results'
      );
    }

    log.info(`Instructor ${user.email} viewing results for quiz ${quizId}`);

    return apiSuccess({
      data: {
        quiz_title: quiz.title,
        results: (results || []).map((r: any) => ({
          session_id: r.id,
          student: r.students ? {
            id: r.students.id,
            email: r.students.email,
            name: `${r.students.first_name} ${r.students.last_name}`,
          } : null,
          attempt_number: r.attempt_number,
          status: r.status,
          score: r.total_score,
          max_score: r.max_score,
          percentage: r.percentage,
          is_passed: r.is_passed,
          started_at: r.started_at,
          completed_at: r.completed_at,
        })),
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    log.error('Error in GET /api/quiz/results:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
