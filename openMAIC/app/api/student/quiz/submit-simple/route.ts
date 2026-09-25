/**
 * POST /api/student/quiz/submit-simple
 *
 * Simplified quiz submission for student flow (practice mode)
 * Creates session, stores responses, calculates score
 * Returns: { attemptId, scorePercentage, passed }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:SubmitSimple');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, quizCode, answers } = body;

    if (!answers) {
      return apiError('MISSING_PARAM', 400, 'answers required');
    }

    if (!quizId && !quizCode) {
      return apiError('MISSING_PARAM', 400, 'quizId or quizCode required');
    }

    const supabase = getSupabaseClient();

    // Find quiz by ID or code
    let quizQuery = supabase.from('quizzes').select('id, title');

    if (quizId) {
      quizQuery = quizQuery.eq('id', quizId);
    } else {
      quizQuery = quizQuery.ilike('quiz_code', quizCode);
    }

    const { data: quiz, error: quizError } = await quizQuery.single();

    if (quizError || !quiz) {
      const identifier = quizId || quizCode;
      log.warn(`Quiz not found: ${identifier}`);
      return apiError('NOT_FOUND', 404, 'Quiz not found');
    }

    // Get all questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question_number, correct_answer, points')
      .eq('quiz_id', quiz.id)
      .order('question_number', { ascending: true });

    if (questionsError || !questions) {
      log.error('Error fetching questions:', questionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz questions');
    }

    // Calculate score
    let correctCount = 0;

    for (const question of questions) {
      const studentAnswer = answers[question.question_number - 1];
      const isCorrect = studentAnswer === question.correct_answer;
      if (isCorrect) correctCount++;
    }

    const scorePercentage = Math.round((correctCount / questions.length) * 100);

    // Create anonymous quiz attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('anonymous_quiz_attempts')
      .insert({
        quiz_id: quiz.id,
        quiz_code: quizCode,
        answers: Object.fromEntries(
          answers.map((ans: any, idx: number) => [idx + 1, ans])
        ),
        score_percentage: scorePercentage,
        correct_count: correctCount,
        total_questions: questions.length,
      })
      .select('id')
      .single();

    if (attemptError || !attempt) {
      log.error('Error creating attempt:', attemptError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to save quiz attempt');
    }

    log.info(`Quiz ${quizCode} submitted: ${scorePercentage}%`);

    return apiSuccess({
      attemptId: attempt.id,
      quizId: quiz.id,
      quizCode,
      scorePercentage,
      correctCount,
      totalQuestions: questions.length,
      passed: scorePercentage >= 70,
    });
  } catch (error) {
    log.error('Submit simple error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to submit quiz');
  }
}
