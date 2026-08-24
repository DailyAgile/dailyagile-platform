/**
 * Get Quiz Statistics
 * GET /api/quiz/[quizId]/stats
 * Returns statistics for a specific quiz
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizStats');


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await context.params;

    if (!quizId) {
      return NextResponse.json(
        { error: { message: 'Missing quiz ID' } },
        { status: 400 }
      );
    }

    // Fetch quiz details
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .select('id, title, quiz_code, total_questions, total_points, created_at')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: { message: 'Quiz not found' } },
        { status: 404 }
      );
    }

    // Fetch quiz statistics
    const { data: stats } = await getSupabaseClient()
      .from('quiz_statistics')
      .select('total_attempts, average_score, pass_rate, difficulty_level')
      .eq('quiz_id', quizId)
      .single();

    // Calculate live stats from attempts
    const { data: attempts } = await getSupabaseClient()
      .from('student_quiz_history')
      .select('score, percentage, passed')
      .eq('quiz_id', quizId);

    const totalAttempts = attempts?.length || 0;
    const passedAttempts = attempts?.filter((a: any) => a.passed)?.length || 0;
    const averageScore = attempts && attempts.length > 0
      ? Math.round(attempts.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / attempts.length)
      : 0;
    const passRate = totalAttempts > 0
      ? Math.round((passedAttempts / totalAttempts) * 100)
      : 0;

    log.info(`Fetched stats for quiz: ${quiz.title}`);

    return NextResponse.json({
      success: true,
      data: {
        quizId: quiz.id,
        title: quiz.title,
        quizCode: quiz.quiz_code,
        totalQuestions: quiz.total_questions,
        totalPoints: quiz.total_points,
        createdAt: quiz.created_at,
        statistics: {
          totalAttempts,
          passedAttempts,
          failedAttempts: totalAttempts - passedAttempts,
          averageScore,
          passRate,
          difficulty: stats?.difficulty_level || 'Unknown',
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
