import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('StudentQuizAPI');

/**
 * GET /api/student/quiz/[quizId]
 *
 * Fetches quiz data by ID or code
 * Handles both UUID quiz IDs and quiz codes (like Q006)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = params.quizId;

    if (!quizId) {
      return apiError('MISSING_PARAM', 400, 'quizId is required');
    }

    const supabase = getSupabaseClient();

    // Try to fetch by ID first, or by code if not a UUID
    let query = supabase
      .from('quizzes')
      .select(`
        id,
        quiz_code,
        title,
        description,
        time_limit,
        passing_score,
        total_questions,
        total_points,
        questions:quiz_questions(
          id,
          question_number,
          type,
          text,
          description,
          options:quiz_options(
            id,
            label,
            text,
            is_correct
          ),
          correct_answer
        )
      `);

    // Check if quizId looks like a UUID or is a code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId);

    if (isUuid) {
      query = query.eq('id', quizId);
    } else {
      // Try case-insensitive code lookup
      query = query.ilike('quiz_code', quizId);
    }

    const { data: quiz, error: quizError } = await query.single();

    if (quizError || !quiz) {
      log.warn(`Quiz not found: ${quizId}`);
      return apiError('QUIZ_NOT_FOUND', 404, `Quiz "${quizId}" not found`);
    }

    log.info(`Quiz loaded: ${quiz.id}`);

    return apiSuccess({
      id: quiz.id,
      quiz_code: quiz.quiz_code,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.time_limit,
      passingScore: quiz.passing_score,
      totalQuestions: quiz.total_questions,
      totalPoints: quiz.total_points,
      questions: (quiz.questions || []).map((q: any) => ({
        id: q.id,
        number: q.question_number,
        type: q.type,
        text: q.text,
        description: q.description,
        options: (q.options || []).map((opt: any) => ({
          id: opt.id,
          label: opt.label,
          text: opt.text,
        })),
        correctAnswer: q.correct_answer,
      })),
    });
  } catch (error) {
    log.error('Failed to load quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to load quiz');
  }
}
