/**
 * Log Quiz Completion
 * POST /api/student/quiz-complete
 * Records quiz attempt and updates student progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { verifyStudentToken, getStudentTokenFromHeader } from '@/lib/auth/student-auth';

const log = createLogger('QuizComplete');


interface QuizCompleteRequest {
  quizId: string;
  score: number;
  percentage: number;
  timeTakenSeconds: number;
  answers: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    // Verify token
    const token = getStudentTokenFromHeader(req.headers.get('authorization') || '');

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const session = await verifyStudentToken(token);
    if (!session) {
      return NextResponse.json(
        { error: { message: 'Invalid token' } },
        { status: 401 }
      );
    }

    const body = (await req.json()) as QuizCompleteRequest;
    const { quizId, score, percentage, timeTakenSeconds, answers } = body;

    if (!quizId || score === undefined || percentage === undefined) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Determine if passed (70% is passing)
    const passed = percentage >= 70;

    // Create history record
    const { data: historyRecord, error: historyError } = await getSupabaseClient()
      .from('student_quiz_history')
      .insert({
        student_id: session.studentId,
        quiz_id: quizId,
        score,
        percentage,
        time_taken_seconds: timeTakenSeconds,
        passed,
        answers,
        attempted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (historyError) {
      log.error('Error creating history record:', historyError);
      return NextResponse.json(
        { error: { message: 'Failed to record quiz attempt' } },
        { status: 500 }
      );
    }

    // Update or create student progress
    const { data: existingProgress } = await getSupabaseClient()
      .from('student_progress')
      .select('total_quizzes_taken, average_score, streak_days')
      .eq('student_id', session.studentId)
      .single();

    if (existingProgress) {
      // Update existing progress
      const newTotal = existingProgress.total_quizzes_taken + 1;
      const newAverage = Math.round(
        (existingProgress.average_score * existingProgress.total_quizzes_taken + percentage) / newTotal
      );

      await getSupabaseClient()
        .from('student_progress')
        .update({
          total_quizzes_taken: newTotal,
          average_score: newAverage,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('student_id', session.studentId);
    } else {
      // Create new progress record
      await getSupabaseClient()
        .from('student_progress')
        .insert({
          student_id: session.studentId,
          total_quizzes_taken: 1,
          average_score: percentage,
          streak_days: 1,
          last_attempt_at: new Date().toISOString(),
        });
    }

    log.info(`Quiz completed for student ${session.email}: ${quizId} (${percentage}%)`);

    return NextResponse.json({
      success: true,
      data: {
        historyId: historyRecord.id,
        passed,
        percentage,
        message: passed
          ? `Great job! You passed with ${percentage}%`
          : `Keep practicing! You scored ${percentage}%`,
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
