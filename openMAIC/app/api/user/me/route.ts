/**
 * GET /api/user/me
 * Returns the current authenticated user's profile
 * Used by quiz navigation to detect user type (instructor/student/public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('UserMeAPI');

interface UserMeResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    role: 'instructor' | 'student' | 'admin';
    firstName?: string;
    lastName?: string;
    name?: string;
    purchasedQuizzes?: string[];
    purchasedCourses?: string[];
  };
  error?: {
    message: string;
    code?: string;
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse<UserMeResponse>> {
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
    const userEmail = session.user.email || '';

    // Try to fetch from instructors table first
    const { data: instructorData, error: instructorError } = await supabase
      .from('instructors')
      .select('id, email, first_name, last_name, role')
      .eq('id', userId)
      .single();

    if (instructorData && !instructorError) {
      log.info(`Found instructor: ${userEmail}`);
      return NextResponse.json({
        success: true,
        data: {
          id: instructorData.id,
          email: instructorData.email,
          role: instructorData.role || 'instructor',
          firstName: instructorData.first_name,
          lastName: instructorData.last_name,
          name: `${instructorData.first_name || ''} ${instructorData.last_name || ''}`.trim(),
        },
      });
    }

    // Not an instructor, check if student or return public
    log.info(`User is not instructor or not found: ${userEmail}`);
    return NextResponse.json({
      success: false,
      error: { message: 'User not found', code: 'USER_NOT_FOUND' },
    });
  } catch (error) {
    log.error('Error fetching user:', error);
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
