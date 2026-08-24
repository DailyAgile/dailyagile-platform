/**
 * Create Manual Quiz
 * POST /api/instructor/quiz/create-manual
 * Creates a quiz from manually entered questions
 * 🚩 Feature Flag: quiz_creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('CreateManual');


interface ManualQuizRequest {
  title: string;
  questions: Array<{
    question_number: number;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    option_e: string;
    correct_answer: string;
    explanation: string;
    source_link: string;
    timer_seconds: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ManualQuizRequest;

    const { title, questions } = body;

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: { message: 'Missing title or questions' } },
        { status: 400 }
      );
    }

    log.info(`Creating manual quiz: "${title}" with ${questions.length} questions`);

    // Database will auto-generate unique 8-digit numeric quiz code
    // No need to generate here - let the DB function handle it

    // Default instructor/classroom
    const instructorClassroomId = 'a0000000-0000-0000-0000-000000000001';
    const instructorId = 'a0000000-0000-0000-0000-000000000001';

    // Ensure classroom exists
    await getSupabaseClient()
      .from('classrooms')
      .upsert({
        id: instructorClassroomId,
        name: 'Manual Quizzes',
        instructor_id: instructorId,
        settings: { selfPaced: true },
      }, { onConflict: 'id' });

    // Create quiz - let database function auto-generate numeric quiz_code
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .insert({
        quiz_code: Math.floor(10000000 + Math.random() * 90000000), // DB will ensure uniqueness
        title: title,
        classroom_id: instructorClassroomId,
        instructor_id: instructorId,
        total_questions: questions.length,
        total_points: questions.length * 10,
      })
      .select()
      .single();

    if (quizError) {
      log.error('Error creating quiz:', quizError);
      return NextResponse.json(
        { error: { message: 'Failed to create quiz' } },
        { status: 500 }
      );
    }

    // Insert questions
    const questionsToInsert = questions.map((q) => ({
      quiz_id: quiz.id,
      question_number: q.question_number,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_answer: q.correct_answer.toUpperCase(),
      explanation: q.explanation,
      source_link: q.source_link,
      timer_seconds: parseInt(q.timer_seconds) || 60,
      points: 10,
    }));

    const { error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      log.error('Error inserting questions:', questionsError);
      await getSupabaseClient().from('quizzes').delete().eq('id', quiz.id);

      // Provide more detailed error message
      const errorMsg = questionsError.message || questionsError.details || 'Unknown error';
      return NextResponse.json(
        { error: { message: `Failed to save questions: ${errorMsg}. Check that all fields are filled correctly.` } },
        { status: 500 }
      );
    }

    log.info(`Manual quiz created: ${quiz.id} with code ${quiz.quiz_code} (${questions.length} questions)`);

    return NextResponse.json({
      success: true,
      data: {
        quiz_id: quiz.id,
        quiz_code: quiz.quiz_code,
        title: quiz.title,
        total_questions: questions.length,
        total_points: questions.length * 10,
        shareable_urls: {
          practice: `/learn/quizzes/${quiz.quiz_code}/practice`,
          game_mode: `/teach/quizzes/${quiz.quiz_code}/game-mode`,
          mock_test: `/learn/quizzes/${quiz.quiz_code}/mock-test`,
        },
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
