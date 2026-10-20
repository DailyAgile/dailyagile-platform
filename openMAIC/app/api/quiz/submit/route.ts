/**
 * POST /api/quiz/submit
 * Grades a quiz attempt on the server and stores it for the signed-in student.
 *
 * Correct answers are loaded from the database here. The client only sends the
 * student's selected answers, and the student's identity comes from their token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCSRFValidation } from '@/lib/server/csrf-token';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { authorize, requireStudentOrStaff } from '@/lib/server/route-guards';

const log = createLogger('QuizSubmit');

const POINTS_PER_QUESTION = 10;

interface GradedAnswer {
  question_id: string;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
}

interface SubmitRequest {
  quizCode: string;
  answers: Record<number, string>;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const csrfValidation = await requireCSRFValidation(req);
    if (!csrfValidation.valid) {
      log.warn('CSRF validation failed for quiz submission');
      return NextResponse.json(
        { error: { message: csrfValidation.error || 'CSRF validation failed' } },
        { status: 403 }
      );
    }

    const caller = await authorize(req, requireStudentOrStaff);
    if (caller instanceof NextResponse) return caller;

    const body = (await req.json()) as SubmitRequest;
    const { quizCode, answers } = body;
    if (!quizCode || !answers || typeof answers !== 'object') {
      return NextResponse.json({ error: { message: 'quizCode and answers are required' } }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, quiz_code')
      .eq('quiz_code', quizCode)
      .single();
    if (quizError || !quiz) {
      return NextResponse.json({ error: { message: 'Quiz not found' } }, { status: 404 });
    }

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question_number, correct_answer')
      .eq('quiz_id', quiz.id)
      .order('question_number', { ascending: true });
    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json({ error: { message: 'Quiz has no questions' } }, { status: 500 });
    }

    // Grade every question against the stored answer key.
    const graded: GradedAnswer[] = questions.map((question: { id: string; correct_answer: string }, index: number) => ({
      question_id: question.id,
      correct_answer: question.correct_answer,
      user_answer: answers[index] ?? null,
      is_correct: answers[index] === question.correct_answer,
    }));

    const correct = graded.filter((g: GradedAnswer) => g.is_correct).length;
    const incorrect = graded.length - correct;
    const totalPoints = graded.length * POINTS_PER_QUESTION;
    const score = correct * POINTS_PER_QUESTION;
    const percentage = ((score / totalPoints) * 100).toFixed(1);
    const passed = score >= totalPoints * 0.7;

    log.info(`Quiz graded: ${correct}/${graded.length} correct (${percentage}%)`);

    // Store the attempt under the authenticated student's ID.
    let submissionId: string | undefined;
    const { data: submission, error: submitError } = await supabase
      .from('quiz_submissions')
      .insert({
        student_id: caller.id,
        scene_id: quizCode,
        quiz_id: quiz.id,
        score,
        max_score: totalPoints,
        submitted_at: new Date().toISOString(),
        status: 'graded',
      })
      .select('id')
      .single();

    if (submitError) {
      log.warn('Failed to create submission record:', submitError);
    } else if (submission) {
      submissionId = submission.id;
      const answerRows = graded.map((g: GradedAnswer) => ({
        submission_id: submissionId,
        question_id: g.question_id,
        question_text: null,
        user_answer: g.user_answer,
        correct_answer: g.correct_answer,
        is_correct: g.is_correct,
        points_earned: g.is_correct ? POINTS_PER_QUESTION : 0,
        max_points: POINTS_PER_QUESTION,
      }));
      const { error: answersError } = await supabase.from('quiz_answers').insert(answerRows);
      if (answersError) log.warn('Failed to store individual answers:', answersError);
    }

    return NextResponse.json({
      success: true,
      data: {
        correct,
        incorrect,
        score,
        total_points: totalPoints,
        percentage,
        passed,
        submissionId,
        // Correct answers are returned only after the attempt is graded, for review.
        review: graded.map((g: GradedAnswer) => ({ correct_answer: g.correct_answer, is_correct: g.is_correct })),
      },
    });
  } catch (error) {
    log.error('Error submitting quiz:', error);
    return NextResponse.json({ error: { message: 'Failed to submit quiz' } }, { status: 500 });
  }
}
