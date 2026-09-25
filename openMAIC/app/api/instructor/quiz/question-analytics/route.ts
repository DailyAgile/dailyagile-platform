import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

interface QuestionAnalytic {
  question_id: string;
  question_text: string;
  total_attempts: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
  percentage_correct: number;
  average_time_seconds: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuestionAnalyticsResponse {
  success: boolean;
  data?: {
    quiz_id: string;
    quiz_title: string;
    total_students: number;
    total_attempts: number;
    average_score: number;
    hardest_questions: QuestionAnalytic[];
    easiest_questions: QuestionAnalytic[];
    all_questions: QuestionAnalytic[];
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<QuestionAnalyticsResponse>> {
  try {
    // Get instructor from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get quiz ID from URL
    const url = new URL(request.url);
    const quizId = url.searchParams.get('quiz_id');

    if (!quizId) {
      return NextResponse.json(
        { success: false, error: 'quiz_id parameter required' },
        { status: 400 }
      );
    }

    // Verify instructor owns this quiz
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('id', quizId)
      .eq('instructor_id', user.email)
      .single();

    if (quizError || !quizData) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found or access denied' },
        { status: 404 }
      );
    }

    // Get all quiz questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question_text, question_order')
      .eq('quiz_id', quizId)
      .order('question_order', { ascending: true });

    if (questionsError || !questionsData) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    const questions = questionsData || [];

    // Get analytics for each question
    const questionAnalytics: QuestionAnalytic[] = [];

    for (const question of questions) {
      // Get all responses for this question
      const { data: responsesData, error: responsesError } = await supabase
        .from('quiz_responses')
        .select('is_correct, time_taken_seconds')
        .eq('question_id', question.id);

      if (responsesError) {
        console.error(`Error fetching responses for question ${question.id}:`, responsesError);
        continue;
      }

      const responses = responsesData || [];
      const total_attempts = responses.length;
      const correct_answers = responses.filter((r) => r.is_correct === true).length;
      const incorrect_answers = responses.filter((r) => r.is_correct === false).length;
      const unanswered = responses.filter((r) => r.is_correct === null).length;

      const percentage_correct = total_attempts > 0 ? (correct_answers / total_attempts) * 100 : 0;
      const avg_times = responses
        .filter((r) => r.time_taken_seconds)
        .map((r) => r.time_taken_seconds);
      const average_time_seconds =
        avg_times.length > 0 ? avg_times.reduce((a, b) => a + b, 0) / avg_times.length : 0;

      // Determine difficulty
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
      if (percentage_correct >= 75) {
        difficulty = 'easy';
      } else if (percentage_correct <= 25) {
        difficulty = 'hard';
      }

      questionAnalytics.push({
        question_id: question.id,
        question_text: question.question_text,
        total_attempts,
        correct_answers,
        incorrect_answers,
        unanswered,
        percentage_correct: Math.round(percentage_correct * 100) / 100,
        average_time_seconds: Math.round(average_time_seconds * 100) / 100,
        difficulty,
      });
    }

    // Get overall quiz stats
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, score, status')
      .eq('quiz_id', quizId);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    }

    const sessions = sessionsData || [];
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const avgScore =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / completedSessions.length
        : 0;

    // Sort questions by difficulty
    const sortedByDifficulty = [...questionAnalytics].sort(
      (a, b) => a.percentage_correct - b.percentage_correct
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          quiz_id: quizId,
          quiz_title: quizData.title,
          total_students: new Set(sessions.map((s) => s.id)).size,
          total_attempts: sessions.length,
          average_score: Math.round(avgScore * 100) / 100,
          hardest_questions: sortedByDifficulty.slice(0, 5),
          easiest_questions: sortedByDifficulty.slice(-5).reverse(),
          all_questions: questionAnalytics.sort((a, b) =>
            a.percentage_correct - b.percentage_correct
          ),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Question analytics error:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
