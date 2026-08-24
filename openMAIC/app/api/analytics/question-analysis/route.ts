/**
 * Question Item Analysis Analytics Endpoint
 * GET /api/analytics/question-analysis?quizId={quizId}
 * Returns: QuestionItemAnalysisData[]
 * Requires: Instructor authentication + ownership of quiz
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireInstructor } from '@/lib/server/auth-middleware';
import { getQuestionItemAnalysis } from '@/lib/analytics/quiz-reports';
import { getSupabaseClient } from '@/lib/server/supabase-client';

export async function GET(req: NextRequest) {
  try {
    // Verify instructor authentication
    const instructor = await requireInstructor(req);

    const quizId = req.nextUrl.searchParams.get('quizId');

    if (!quizId) {
      return NextResponse.json(
        { error: 'quizId is required' },
        { status: 400 }
      );
    }

    // Verify instructor owns this quiz
    const supabase = getSupabaseClient();
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('instructor_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    if (quiz.instructor_id !== instructor.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this quiz' },
        { status: 403 }
      );
    }

    const data = await getQuestionItemAnalysis(quizId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question analysis data' },
      { status: 500 }
    );
  }
}
