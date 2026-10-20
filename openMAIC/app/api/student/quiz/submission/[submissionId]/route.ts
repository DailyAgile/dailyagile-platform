/**
 * GET /api/student/quiz/submission/[submissionId]
 *
 * Fetch quiz submission results from Supabase
 * Resolves data loss risk: results now loaded from DB instead of localStorage
 *
 * Response includes:
 * - Submission metadata (score, max_score, percentage)
 * - Individual answers with correct answers
 * - Calculated statistics (correct, incorrect, passed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { authorize, canManage, requireStudentOrStaff } from '@/lib/server/route-guards';
import { requireInstructor } from '@/lib/server/auth-middleware';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizSubmissionFetch');

interface SubmissionResponse {
  success: boolean;
  data?: {
    id: string;
    score: number;
    max_score: number;
    percentage: number;
    correct: number;
    incorrect: number;
    passed: boolean;
    submitted_at: string;
    answers: Array<{
      id: string;
      question_id: string;
      user_answer: string | null;
      correct_answer: string;
      is_correct: boolean;
      points_earned: number;
      max_points: number;
    }>;
  };
  error?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
): Promise<Response> {
  try {
    const caller = await authorize(req, requireStudentOrStaff);
    if (caller instanceof NextResponse) return caller;

    const { submissionId } = await params;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Attempts are stored in student_quiz_history (see /api/quiz/submit).
    const { data: attempt, error: attemptError } = await supabase
      .from('student_quiz_history')
      .select('id, score, percentage, passed, attempted_at, student_id, quiz_id, answers')
      .eq('id', submissionId)
      .single();

    if (attemptError || !attempt) {
      log.warn(`Submission not found: ${submissionId}`, attemptError);
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    // The student who took the quiz, the quiz's instructor, or an admin may view it.
    let allowed = caller.role === 'admin' || caller.id === attempt.student_id;
    if (!allowed && caller.role === 'instructor') {
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('instructor_id')
        .eq('id', attempt.quiz_id)
        .single();
      allowed = quiz?.instructor_id === caller.id;
    }
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const answerList: Array<{
      question_id: string;
      user_answer: string | null;
      correct_answer: string;
      is_correct: boolean;
    }> = Array.isArray(attempt.answers) ? attempt.answers : [];
    const POINTS_PER_QUESTION = 10;
    const correct = answerList.filter((a) => a.is_correct).length;
    const incorrect = answerList.length - correct;
    const maxScore = answerList.length * POINTS_PER_QUESTION;

    const response: SubmissionResponse = {
      success: true,
      data: {
        id: attempt.id,
        score: parseFloat(attempt.score),
        max_score: maxScore,
        percentage: parseFloat(attempt.percentage),
        correct,
        incorrect,
        passed: Boolean(attempt.passed),
        submitted_at: attempt.attempted_at,
        answers: answerList.map((a, index) => ({
          id: `${attempt.id}-${index}`,
          question_id: a.question_id,
          user_answer: a.user_answer,
          correct_answer: a.correct_answer,
          is_correct: a.is_correct,
          points_earned: a.is_correct ? POINTS_PER_QUESTION : 0,
          max_points: POINTS_PER_QUESTION,
        })),
      },
    };

    log.info(`Submission fetched: ${submissionId}, score: ${attempt.score}/${maxScore}`);

    return NextResponse.json(response);
  } catch (error) {
    log.error('Error fetching submission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}
