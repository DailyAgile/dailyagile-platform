/**
 * POST /api/quiz/check-answer
 * Immediate feedback for one answer (game mode). Requires a signed-in student.
 * Returns only the one question's result, never the full answer key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { authorize, requireStudentOrStaff } from '@/lib/server/route-guards';

export async function POST(req: NextRequest): Promise<Response> {
  const caller = await authorize(req, requireStudentOrStaff);
  if (caller instanceof NextResponse) return caller;

  const { quizCode, questionIndex, answer } = (await req.json()) as {
    quizCode?: string;
    questionIndex?: number;
    answer?: string;
  };
  if (!quizCode || typeof questionIndex !== 'number' || !answer) {
    return NextResponse.json({ error: { message: 'quizCode, questionIndex and answer are required' } }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('quiz_code', quizCode).single();
  if (!quiz) return NextResponse.json({ error: { message: 'Quiz not found' } }, { status: 404 });

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('correct_answer')
    .eq('quiz_id', quiz.id)
    .order('question_number', { ascending: true });
  const question = questions?.[questionIndex];
  if (!question) return NextResponse.json({ error: { message: 'Question not found' } }, { status: 404 });

  const isCorrect = answer === question.correct_answer;
  return NextResponse.json({
    success: true,
    data: { isCorrect, correct_answer: isCorrect ? answer : question.correct_answer },
  });
}
