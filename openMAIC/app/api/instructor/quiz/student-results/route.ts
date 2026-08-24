/**
 * Get Student Results by Email
 * GET /api/instructor/quiz/student-results?email=student@example.com
 *
 * Returns all quiz attempts for a specific student email
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('StudentResults');

interface StudentResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  course_name: string;
  lesson_name?: string;
  quiz_title: string;
  quiz_code: string;
  score: number;
  total_points: number;
  percentage: number;
  taken_at: string;
  session_id: string;
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Email parameter is required');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Get all quiz sessions for this student email
    const { data: sessions, error: sessionsError } = await getSupabaseClient()
      .from('quiz_sessions')
      .select(`
        id,
        quiz_id,
        student_email,
        score,
        percentage,
        created_at,
        quizzes:quiz_id (
          id,
          title,
          quiz_code,
          total_points
        )
      `)
      .eq('student_email', email)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      log.error('Failed to fetch sessions:', sessionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch student results');
    }

    // Transform results to match frontend expectations
    const results: StudentResult[] = (sessions || []).map((session: any) => ({
      id: session.id,
      first_name: 'Student', // TODO: Store in student_emails table
      last_name: email.split('@')[0], // Placeholder
      email: email,
      course_name: 'Self-Paced Course', // TODO: Link to courses table
      lesson_name: undefined,
      quiz_title: session.quizzes?.title || 'Unknown Quiz',
      quiz_code: session.quizzes?.quiz_code || '',
      score: session.score || 0,
      total_points: session.quizzes?.total_points || 0,
      percentage: session.percentage || 0,
      taken_at: session.created_at,
      session_id: session.id,
    }));

    log.info(`✅ Fetched ${results.length} results for ${email}`);

    return apiSuccess({
      email,
      results,
      total_attempts: results.length,
    });
  } catch (error) {
    log.error('Student results error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch student results');
  }
}
