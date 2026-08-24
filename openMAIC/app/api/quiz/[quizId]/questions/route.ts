/**
 * GET /api/quiz/[quizId]/questions
 * Fetch all questions for a quiz
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('QuizQuestions');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    log.info(`Fetching questions for quiz: ${quizId}`);

    const supabase = getSupabaseClient();

    // Fetch questions
    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (error) {
      log.error('Error fetching questions:', error);
      return apiError('QUESTIONS_FETCH_FAILED', 500, 'Failed to fetch questions');
    }

    log.info(`Found ${questions?.length || 0} questions`);

    return apiSuccess({
      success: true,
      data: questions || [],
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch questions');
  }
}
