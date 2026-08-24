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
      user_answer: string;
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
    const { submissionId } = await params;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch submission record
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .select('id, score, max_score, percentage, submitted_at, student_id')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      log.warn(`Submission not found: ${submissionId}`, submissionError);
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Fetch individual answers for this submission
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('id, question_id, user_answer, correct_answer, is_correct, points_earned, max_points')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (answersError) {
      log.warn(`Failed to fetch answers for submission ${submissionId}:`, answersError);
    }

    // Calculate statistics
    const answerList = answers || [];
    const correct = answerList.filter((a: any) => a.is_correct).length;
    const incorrect = answerList.length - correct;
    const passed = submission.percentage >= 70;

    const response: SubmissionResponse = {
      success: true,
      data: {
        id: submission.id,
        score: parseFloat(submission.score),
        max_score: parseFloat(submission.max_score),
        percentage: parseFloat(submission.percentage),
        correct,
        incorrect,
        passed,
        submitted_at: submission.submitted_at,
        answers: answerList.map((a: any) => ({
          id: a.id,
          question_id: a.question_id,
          user_answer: a.user_answer,
          correct_answer: a.correct_answer,
          is_correct: a.is_correct,
          points_earned: parseFloat(a.points_earned),
          max_points: parseFloat(a.max_points),
        })),
      },
    };

    log.info(`Submission fetched: ${submissionId}, score: ${submission.score}/${submission.max_score}`);

    return NextResponse.json(response);
  } catch (error) {
    log.error('Error fetching submission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}
