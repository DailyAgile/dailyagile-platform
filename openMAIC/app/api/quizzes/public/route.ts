/**
 * GET /api/quizzes/public
 * Returns publicly available quizzes (no authentication required)
 * Used by public quiz browser to show available quizzes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
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
        id: '1',
        quiz_code: '12345678',
        title: 'Python Basics Quiz',
        description: 'Test your Python fundamentals knowledge',
        total_questions: 10,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'Python',
        difficulty: 'easy',
      },
      {
        id: '2',
        quiz_code: '87654321',
        title: 'JavaScript Advanced Concepts',
        description: 'Challenge yourself with advanced JS concepts',
        total_questions: 15,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'JavaScript',
        difficulty: 'hard',
      },
      {
        id: '3',
        quiz_code: '55555555',
        title: 'React Fundamentals',
        description: 'Learn React basics and best practices',
        total_questions: 12,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'React',
        difficulty: 'medium',
      },
      {
        id: '4',
        quiz_code: '99999999',
        title: 'Web Development Quiz',
        description: 'HTML, CSS, and web development essentials',
        total_questions: 20,
        is_published: true,
        created_at: new Date().toISOString(),
        topic: 'Web Dev',
        difficulty: 'easy',
      },
    ];

    log.info(`Returned ${mockPublicQuizzes.length} public quizzes`);

    return NextResponse.json({
      success: true,
      data: {
        quizzes: mockPublicQuizzes,
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
