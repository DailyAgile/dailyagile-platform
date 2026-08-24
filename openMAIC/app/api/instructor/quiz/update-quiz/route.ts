/**
 * Update Quiz and Questions
 * POST /api/instructor/quiz/update-quiz
 * Updates quiz title and all question details
 * 🚩 Feature Flag: quiz_editing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdateQuizRequest;

    if (!body.id) {
      return NextResponse.json(
        { error: { message: 'Missing quiz ID' } },
        { status: 400 }
      );
    }

    // Update quiz title
    const { error: updateError } = await getSupabaseClient()
      .from('quizzes')
      .update({ title: body.title })
      .eq('id', body.id);

    if (updateError) {
      log.error('Error updating quiz title:', updateError);
      return NextResponse.json(
        { error: { message: 'Failed to update quiz title' } },
        { status: 500 }
      );
    }

    // Update all questions
    for (const question of body.questions) {
      const { error: questionError } = await getSupabaseClient()
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
        return NextResponse.json(
          { error: { message: `Failed to update question ${question.question_number}` } },
          { status: 500 }
        );
      }
    }

    log.info(`Quiz ${body.id} updated successfully`);

    return NextResponse.json({
      success: true,
      data: {
        quiz_id: body.id,
        title: body.title,
        questions_updated: body.questions.length,
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
