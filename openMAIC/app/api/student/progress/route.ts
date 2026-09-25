/**
 * GET /api/student/progress
 * Returns student's quiz progress for all their quizzes
 * Used by student dashboard to show completion % and scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentProgressAPI');

interface ProgressItem {
  quiz_id: string;
  completion_percent: number;
  current_score?: number;
  best_score?: number;
  last_attempt_date?: string;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface StudentProgressResponse {
  success: boolean;
  data?: {
    progress: ProgressItem[];
  };
  error?: {
    message: string;
    code?: string;
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse<StudentProgressResponse>> {
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

    // For now, return empty array since progress tracking isn't fully set up yet
    // In a full implementation, this would query quiz_attempts and progress tables
    log.info(`Fetching progress for student: ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        progress: [],
      },
    });
  } catch (error) {
    log.error('Error fetching student progress:', error);
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
