/**
 * Lookup Quiz by Code
 * GET /api/student/quiz/lookup?code=Q001
 *
 * Converts a short quiz code to the quiz ID
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LookupQuiz');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return apiError('MISSING_PARAM', 400, 'code parameter is required');
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Look up quiz by code
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .select('id, quiz_code, title')
      .eq('quiz_code', code)
      .single();

    if (quizError || !quiz) {
      log.warn(`Quiz code not found: ${code}`);
      return apiError('QUIZ_NOT_FOUND', 404, `Quiz code "${code}" not found`);
    }

    log.info(`Quiz lookup: ${code} -> ${quiz.id}`);

    return apiSuccess({
      quiz_id: quiz.id,
      quiz_code: quiz.quiz_code,
      title: quiz.title,
    });
  } catch (error) {
    log.error('Quiz lookup failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to lookup quiz');
  }
}
