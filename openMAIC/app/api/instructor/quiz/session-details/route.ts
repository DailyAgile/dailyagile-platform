/**
 * Get Detailed Quiz Session Information
 * GET /api/instructor/quiz/session-details?session_id=xxx
 *
 * Returns complete quiz attempt data including all answers and explanations
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('SessionDetails');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'session_id parameter is required');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Get session info
    const { data: session, error: sessionError } = await getSupabaseClient()
      .from('quiz_sessions')
      .select(
        `
        id,
        quiz_id,
        student_email,
        score,
        percentage,
        created_at,
        quizzes:quiz_id (
          id,
          title,
          quiz_code,
          total_points
        )
      `,
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return apiError('INVALID_REQUEST', 404, 'Session not found');
    }

    // Get all questions for this quiz (optional - may not exist yet)
    const { data: questions, error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .select('id, question_number, question, options, correct_answer, explanation, source_link, points')
      .eq('quiz_id', session.quiz_id)
      .order('question_number', { ascending: true });

    // Questions are optional - continue even if there are none
    if (questionsError) {
      log.warn('Could not fetch questions:', questionsError);
    }

    // Get student answers for this session (stored in localStorage data from quiz-view)
    // For now, we'll construct the response based on what we have
    // TODO: When quiz answers are persisted to DB, fetch from there

    log.info(`✅ Fetched session details: ${sessionId}`);

    const quiz = Array.isArray(session.quizzes) ? session.quizzes[0] : session.quizzes;
    return apiSuccess({
      session: {
        id: session.id,
        student_email: session.student_email,
        quiz_title: quiz?.title,
        quiz_code: quiz?.quiz_code,
        score: session.score,
        total_points: quiz?.total_points,
        percentage: session.percentage,
        taken_at: session.created_at,
      },
      questions: questions || [],
      total_questions: (questions || []).length,
    });
  } catch (error) {
    log.error('Session details error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch session details');
  }
}
