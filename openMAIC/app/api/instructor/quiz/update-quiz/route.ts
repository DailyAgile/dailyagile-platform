/**
 * Update Quiz and Questions
 * POST /api/instructor/quiz/update-quiz
 * Updates quiz title and all question details
 * 🚩 Feature Flag: quiz_editing
 * REQUIRES: Instructor authentication (verified) + quiz ownership
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('UpdateQuiz');


interface UpdateQuizRequest {
  id: string;
  quiz_code: string;
  title: string;
  questions: Array<{
    id: string;
    question_number: number;
    question: string;
    options: {
      a: string;
      b: string;
      c: string;
      d: string;
      e: string;
    };
    correct_answer: string;
    explanation: string;
    source_link: string;
    timer_seconds: number;
    points: number;
  }>;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const body = (await req.json()) as UpdateQuizRequest;

    if (!body.id) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'Missing quiz ID'
      );
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz exists AND instructor owns it
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id, title')
      .eq('id', body.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to update non-existent quiz ${body.id}`
      );
      return apiError('NOT_FOUND', 404, 'Quiz not found');
    }

    if (quiz.instructor_id !== authenticatedInstructor.id) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to update quiz ${body.id} owned by ${quiz.instructor_id}`
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to edit this quiz');
    }

    // Update quiz title
    const { error: updateError } = await supabase
      .from('quizzes')
      .update({ title: body.title })
      .eq('id', body.id);

    if (updateError) {
      log.error('Error updating quiz title:', updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to update quiz title');
    }

    // Update all questions
    for (const question of body.questions) {
      const { error: questionError } = await supabase
        .from('quiz_questions')
        .update({
          question: question.question,
          option_a: question.options.a,
          option_b: question.options.b,
          option_c: question.options.c,
          option_d: question.options.d,
          option_e: question.options.e,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          source_link: question.source_link,
          timer_seconds: question.timer_seconds,
          points: question.points,
        })
        .eq('id', question.id);

      if (questionError) {
        log.error(`Error updating question ${question.id}:`, questionError);
        return apiError('INTERNAL_ERROR', 500, `Failed to update question ${question.question_number}`);
      }
    }

    log.info(`Quiz ${body.id} updated successfully by instructor ${authenticatedInstructor.email}`);

    return apiSuccess({
      success: true,
      data: {
        quiz_id: body.id,
        title: body.title,
        questions_updated: body.questions.length,
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
