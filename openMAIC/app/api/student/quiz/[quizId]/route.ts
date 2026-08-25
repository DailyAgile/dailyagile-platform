import { NextRequest, NextResponse } from 'next/server';
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
  { params }: { params: Promise<{ quizId: string }> }
): Promise<Response> {
  try {
    const { quizId } = await params;

    if (!quizId) {
      return apiError('MISSING_PARAM', 400, 'quizId is required');
    }

    const supabase = getSupabaseClient();

    // Check if quizId looks like a UUID or is a code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId);

    // Fetch quiz metadata
    let quizQuery = supabase.from('quizzes').select('*');
    if (isUuid) {
      quizQuery = quizQuery.eq('id', quizId);
    } else {
      quizQuery = quizQuery.ilike('quiz_code', quizId);
    }

    const { data: quiz, error: quizError } = await quizQuery.single();

    if (quizError || !quiz) {
      log.warn(`Quiz not found: ${quizId}`);
      return apiError('QUIZ_NOT_FOUND', 404, `Quiz "${quizId}" not found`);
    }

    // Fetch questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('question_number', { ascending: true });

    if (questionsError) {
      log.warn(`Failed to fetch questions for quiz ${quiz.id}:`, questionsError);
      return apiError('QUIZ_LOAD_ERROR', 500, 'Failed to load quiz questions');
    }

    log.info(`Quiz loaded: ${quiz.id} with ${(questions || []).length} questions`);

    return apiSuccess({
      id: quiz.id,
      quiz_code: quiz.quiz_code,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.required_pass_score,
      passingScore: quiz.required_pass_score,
      totalQuestions: quiz.total_questions,
      totalPoints: quiz.total_points,
      questions: (questions || []).map((q: any) => {
        const options = [];
        if (q.option_a) options.push({ id: 'a', label: 'A', text: q.option_a });
        if (q.option_b) options.push({ id: 'b', label: 'B', text: q.option_b });
        if (q.option_c) options.push({ id: 'c', label: 'C', text: q.option_c });
        if (q.option_d) options.push({ id: 'd', label: 'D', text: q.option_d });
        if (q.option_e) options.push({ id: 'e', label: 'E', text: q.option_e });

        return {
          id: q.id,
          number: q.question_number,
          type: 'single', // default to single choice
          text: q.question,
          description: null,
          options,
          correctAnswer: q.correct_answer?.toLowerCase(),
          explanation: q.explanation,
          points: q.points,
        };
      }),
    });
  } catch (error) {
    log.error('Failed to load quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to load quiz');
  }
}
