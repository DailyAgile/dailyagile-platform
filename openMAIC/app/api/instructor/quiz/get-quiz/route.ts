/**
 * Get Quiz with All Questions
 * GET /api/instructor/quiz/get-quiz?quiz_id=<id>
 * Returns full quiz details including all questions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('GetQuiz');


export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const quizId = searchParams.get('quiz_id');

    if (!quizId) {
      return NextResponse.json(
        { error: { message: 'Missing quiz_id parameter' } },
        { status: 400 }
      );
    }

    // Fetch quiz
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError) {
      log.error('Error fetching quiz:', quizError);
      return NextResponse.json(
        { error: { message: 'Quiz not found' } },
        { status: 404 }
      );
    }

    // Fetch all questions for this quiz
    const { data: questions, error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError) {
      log.error('Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch quiz questions' } },
        { status: 500 }
      );
    }

    // Transform questions to match frontend format
    const transformedQuestions = (questions || []).map((q: any) => ({
      id: q.id,
      question_number: q.question_number,
      question: q.question,
      options: {
        a: q.option_a || '',
        b: q.option_b || '',
        c: q.option_c || '',
        d: q.option_d || '',
        e: q.option_e || '',
      },
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      source_link: q.source_link || '',
      timer_seconds: q.timer_seconds || 30,
      points: q.points || 10,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: quiz.id,
        quiz_code: quiz.quiz_code,
        title: quiz.title,
        total_questions: questions?.length || 0,
        total_points: (questions || []).reduce((sum: number, q: any) => sum + (q.points || 10), 0),
        questions: transformedQuestions,
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
