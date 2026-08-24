/**
 * Get Quiz Results by Quiz ID
 * GET /api/instructor/quiz/quiz-results?quiz_id=Q001
 *
 * Returns all student attempts for a specific quiz
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('QuizResults');

interface QuizResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  course_name: string;
  lesson_name?: string;
  quiz_title: string;
  quiz_code: string;
  score: number;
  total_points: number;
  percentage: number;
  taken_at: string;
  session_id: string;
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const quizId = searchParams.get('quiz_id');

    if (!quizId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'quiz_id parameter is required');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Get quiz info
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .select('id, title, quiz_code, total_points')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return apiError('INVALID_REQUEST', 404, 'Quiz not found');
    }

    // Get all sessions for this quiz
    const { data: sessions, error: sessionsError } = await getSupabaseClient()
      .from('quiz_sessions')
      .select('id, quiz_id, student_email, score, percentage, created_at')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      log.error('Failed to fetch sessions:', sessionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz results');
    }

    // Transform results to match frontend expectations
    const results: QuizResult[] = (sessions || []).map((session: any) => ({
      id: session.id,
      first_name: 'Student', // TODO: Store in student_emails table
      last_name: session.student_email?.split('@')[0] || 'Unknown', // Placeholder
      email: session.student_email || 'unknown@example.com',
      course_name: 'Self-Paced Course', // TODO: Link to courses table
      lesson_name: undefined,
      quiz_title: quiz.title,
      quiz_code: quiz.quiz_code,
      score: session.score || 0,
      total_points: quiz.total_points || 0,
      percentage: session.percentage || 0,
      taken_at: session.created_at,
      session_id: session.id,
    }));

    log.info(`✅ Fetched ${results.length} results for quiz ${quizId}`);

    return apiSuccess({
      quiz_id: quizId,
      quiz_title: quiz.title,
      quiz_code: quiz.quiz_code,
      results,
      total_attempts: results.length,
    });
  } catch (error) {
    log.error('Quiz results error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz results');
  }
}
