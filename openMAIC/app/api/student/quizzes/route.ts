/**
 * GET /api/student/quizzes
 * Returns quizzes purchased by the current student
 * Used by student dashboard to show available quizzes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentQuizzesAPI');

interface StudentQuizzesResponse {
  success: boolean;
  data?: {
    quizzes: Array<{
      id: string;
      quiz_code: string;
      title: string;
      description?: string;
      total_questions: number;
      created_by?: string;
      is_published: boolean;
      created_at: string;
      course_id?: string;
      course_name?: string;
    }>;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse<StudentQuizzesResponse>> {
  try {
    const supabase = getSupabaseClient();

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      log.info('No authenticated session');
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHENTICATED' },
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // For now, return empty array since student quiz purchases aren't fully set up yet
    // In a full implementation, this would query quiz_purchases table
    log.info(`Fetching quizzes for student: ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        quizzes: [],
      },
    });
  } catch (error) {
    log.error('Error fetching student quizzes:', error);
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
