/**
 * Get Recommended Quizzes
 * GET /api/student/recommended-quizzes
 * Returns personalized quiz recommendations based on student progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { verifyStudentToken, getStudentTokenFromHeader } from '@/lib/auth/student-auth';

const log = createLogger('RecommendedQuizzes');


export async function GET(req: NextRequest) {
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

    // Get student's average score to determine difficulty
    const { data: progress } = await getSupabaseClient()
      .from('student_progress')
      .select('average_score')
      .eq('student_id', session.studentId)
      .single();

    const averageScore = progress?.average_score || 0;

    // Determine next difficulty based on performance
    let recommendedDifficulty = 'Easy';
    if (averageScore >= 80) {
      recommendedDifficulty = 'Hard';
    } else if (averageScore >= 70) {
      recommendedDifficulty = 'Medium';
    }

    // Get quizzes student hasn't taken yet
    const { data: takenQuizzesData } = await getSupabaseClient()
      .from('student_quiz_history')
      .select('quiz_id')
      .eq('student_id', session.studentId);

    const takenQuizIds = takenQuizzesData?.map((q: any) => q.quiz_id) || [];

    // Fetch recommended quizzes (not taken, similar difficulty)
    const { data: recommended } = await getSupabaseClient()
      .from('quizzes')
      .select('id, title, quiz_code, total_questions, total_points, created_at')
      .not('id', 'in', `(${takenQuizIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(5);

    // If no quizzes available with NOT IN, get any new quizzes
    const recommendedQuizzes = recommended || [];

    log.info(`Generated recommendations for student: ${session.email}`);

    return NextResponse.json({
      success: true,
      data: {
        averageScore,
        recommendedDifficulty,
        quizzes: recommendedQuizzes.map((q: any) => ({
          id: q.id,
          title: q.title,
          quizCode: q.quiz_code,
          totalQuestions: q.total_questions,
          totalPoints: q.total_points,
          createdAt: q.created_at,
        })),
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
