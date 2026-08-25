import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireAuth } from '@/lib/student/auth-utils';

const log = createLogger('API:GetAttempt');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const { attemptId, quizId } = await params;

    const supabase = getSupabaseClient();

    // Fetch the anonymous quiz attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('anonymous_quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      log.warn(`Attempt not found: ${attemptId}`);
      return apiError('NOT_FOUND', 404, 'Quiz attempt not found');
    }

    // Use quiz_id from attempt (which is the actual UUID)
    const actualQuizId = attempt.quiz_id;

    // Fetch quiz metadata
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('title, description, total_questions')
      .eq('id', actualQuizId)
      .single();

    if (quizError) {
      log.error('Error fetching quiz:', quizError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz data');
    }

    // Fetch all questions for this quiz to match with answers
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select(
        `
        id,
        question_number,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        option_e,
        correct_answer,
        explanation,
        source_link
      `
      )
      .eq('quiz_id', actualQuizId)
      .order('question_number', { ascending: true });

    if (questionsError || !questions) {
      log.error('Error fetching questions:', questionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz questions');
    }

    // Build formatted answers by comparing stored answers with questions
    const studentAnswers = attempt.answers || {};
    const formattedAnswers = questions.map((q: any) => {
      const studentAnswer = studentAnswers[q.question_number];
      const isCorrect = studentAnswer === q.correct_answer;
      const optionMap: any = {
        'A': q.option_a,
        'B': q.option_b,
        'C': q.option_c,
        'D': q.option_d,
        'E': q.option_e,
      };

      return {
        questionId: q.id,
        questionNumber: q.question_number,
        question: q.question,
        studentAnswer: studentAnswer || null,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation,
        sourceLink: q.source_link,
        studentAnswerText: studentAnswer ? optionMap[studentAnswer] : 'Not answered',
        correctAnswerText: optionMap[q.correct_answer],
      };
    });

    const result = {
      attemptId,
      quizId,
      quizTitle: quiz?.title,
      quizDescription: quiz?.description,
      submittedAt: attempt.created_at,
      scorePercentage: attempt.score_percentage,
      correctCount: attempt.correct_count,
      totalQuestions: attempt.total_questions,
      passed: attempt.score_percentage >= 70,
      answers: formattedAnswers,
    };

    log.info(`Fetched attempt ${attemptId}: ${attempt.score_percentage}%`);
    return apiSuccess(result);
  } catch (error) {
    log.error('Get attempt error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch attempt details');
  }
}
