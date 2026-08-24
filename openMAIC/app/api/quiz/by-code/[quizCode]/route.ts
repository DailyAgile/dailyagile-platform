/**
 * GET /api/quiz/by-code/[quizCode]
 * Fetch quiz by 8-digit numeric code
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('QuizByCode');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizCode: string }> }
): Promise<Response> {
  try {
    const { quizCode } = await params;

    // Validate quiz code is numeric
    const code = parseInt(quizCode, 10);
    if (isNaN(code) || code < 10000000 || code > 99999999) {
      return apiError('INVALID_REQUEST', 400, 'Invalid quiz code format');
    }

    log.info(`Fetching quiz with code: ${code}`);

    const supabase = getSupabaseClient();

    // Fetch quiz by numeric code - compare as string since column is VARCHAR
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(
        `
        id,
        quiz_code,
        title,
        description,
        total_questions,
        total_points,
        created_at
        `
      )
      .eq('quiz_code', code.toString())
      .single();

    if (quizError || !quiz) {
      log.warn(`Quiz not found with code: ${code}`);
      return apiError('NOT_FOUND', 404, 'Quiz not found');
    }

    log.info(`Quiz found: ${quiz.title} (ID: ${quiz.id})`);

    return apiSuccess({
      success: true,
      data: {
        id: quiz.id,
        quiz_code: quiz.quiz_code,
        title: quiz.title,
        description: quiz.description,
        total_questions: quiz.total_questions,
        total_points: quiz.total_points,
        created_at: quiz.created_at,
      },
    });
  } catch (error) {
    log.error('Error fetching quiz by code:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz');
  }
}
