/**
 * GET /api/quizzes/public
 * Returns publicly available quizzes (no authentication required)
 * Used by public quiz browser to show available quizzes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('PublicQuizzesAPI');

interface PublicQuiz {
  id: string;
  quiz_code: string;
  title: string;
  description?: string;
  total_questions: number;
  created_by?: string;
  is_published: boolean;
  created_at: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface PublicQuizzesResponse {
  success: boolean;
  data?: {
    quizzes: PublicQuiz[];
  };
  error?: {
    message: string;
    code?: string;
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse<PublicQuizzesResponse>> {
  try {
    // Mock public quizzes (TODO: replace with real Supabase query when data exists)
    const mockPublicQuizzes: PublicQuiz[] = [
      {
        id: 'PY101',
        quiz_code: 'PY101',
        title: 'Python Basics Quiz',
        description: 'Test your Python fundamentals knowledge',
        total_questions: 10,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'Python',
        difficulty: 'easy',
      },
      {
        id: 'JS201',
        quiz_code: 'JS201',
        title: 'JavaScript Advanced Concepts',
        description: 'Challenge yourself with advanced JS concepts',
        total_questions: 15,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'JavaScript',
        difficulty: 'hard',
      },
      {
        id: 'REACT101',
        quiz_code: 'REACT101',
        title: 'React Fundamentals',
        description: 'Learn React basics and best practices',
        total_questions: 12,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'React',
        difficulty: 'medium',
      },
      {
        id: 'WEB101',
        quiz_code: 'WEB101',
        title: 'Web Development Quiz',
        description: 'HTML, CSS, and web development essentials',
        total_questions: 20,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'Web Dev',
        difficulty: 'easy',
      },
    ];

    const transformedQuizzes = mockPublicQuizzes.map((q) => ({
      id: q.id,
      quiz_code: q.quiz_code,
      title: q.title,
      description: q.description,
      total_questions: q.total_questions,
      created_by: 'system',
      is_published: q.is_published,
      created_at: q.created_at,
      topic: q.topic,
      difficulty: q.difficulty,
    }));

    log.info(`Returned ${transformedQuizzes.length} public quizzes`);

    return NextResponse.json({
      success: true,
      data: {
        quizzes: transformedQuizzes,
      },
    });
  } catch (error) {
    log.error('Error in public quizzes endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
