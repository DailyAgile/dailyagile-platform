/**
 * GET /api/quizzes/by-code/:code
 * Returns all published quizzes created by an instructor with the given code
 * Code is derived from instructor ID (e.g., first 8 digits of UUID)
 * RATE LIMITED: 20 lookups per minute per code
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';

const log = createLogger('QuizzesByCodeAPI');

interface QuizByCodeResponse {
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
    }>;
    instructorName?: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Generate an 8-digit numeric code from a UUID
 * Converts UUID bytes to a numeric value (0-99999999)
 */
function generateCodeFromUUID(uuid: string): string {
  const hex = uuid.replace(/-/g, '').substring(0, 8);
  const num = parseInt(hex, 16) % 100000000;
  return String(num).padStart(8, '0');
}

/**
 * Find instructor by code
 * Tries to match the 8-digit code with any instructor's generated code
 */
async function findInstructorByCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  code: string
): Promise<{ id: string; name: string } | null> {
  // Fetch all instructors (limited to reasonable number for performance)
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .limit(1000);

  if (error || !instructors) {
    log.warn('Error fetching instructors:', error);
    return null;
  }

  // Find instructor whose code matches
  for (const instructor of instructors) {
    const instructorCode = generateCodeFromUUID(instructor.id);
    if (instructorCode === code) {
      const name = `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim();
      return {
        id: instructor.id,
        name: name || 'Instructor',
      };
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse<QuizByCodeResponse>> {
  try {
    const { code } = await params;

    // Validate code format (must be 8 digits)
    if (!code || !/^\d{8}$/.test(code)) {
      log.warn(`Invalid code format: ${code}`);
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invalid code format', code: 'INVALID_CODE' },
        },
        { status: 400 }
      );
    }

    // 🔒 RATE LIMITING: Prevent brute-force attacks on quiz codes
    const rateLimitResult = await checkRateLimit(
      `quiz-code-lookup:${code}`,
      RATE_LIMITS.QUIZ_CODE_LOOKUP.limit,
      RATE_LIMITS.QUIZ_CODE_LOOKUP.window
    );
    if (!rateLimitResult.allowed) {
      log.warn(`Rate limit exceeded for code lookup: ${code}`);
      return NextResponse.json(
        {
          success: false,
          error: { message: RATE_LIMITS.QUIZ_CODE_LOOKUP.message, code: 'RATE_LIMITED' },
        },
        { status: 429 }
      );
    }

    // Mock instructor codes and their quizzes (TODO: replace with real DB when data exists)
    const mockInstructorQuizzes: Record<string, { instructorName: string; quizzes: any[] }> = {
      '12345678': {
        instructorName: 'Dr. Sarah Chen',
        quizzes: [
          {
            id: 'AI101',
            quiz_code: 'AI101',
            title: 'Introduction to AI',
            description: 'Learn the fundamentals of artificial intelligence',
            total_questions: 20,
            created_by: 'instructor-1',
            is_published: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'ML102',
            quiz_code: 'ML102',
            title: 'Machine Learning Basics',
            description: 'Explore ML algorithms and concepts',
            total_questions: 25,
            created_by: 'instructor-1',
            is_published: true,
            created_at: new Date().toISOString(),
          },
        ],
      },
      '87654321': {
        instructorName: 'Prof. James Wilson',
        quizzes: [
          {
            id: 'DS101',
            quiz_code: 'DS101',
            title: 'Data Science Fundamentals',
            description: 'Master data analysis and visualization',
            total_questions: 18,
            created_by: 'instructor-2',
            is_published: true,
            created_at: new Date().toISOString(),
          },
        ],
      },
      '55555555': {
        instructorName: 'Dr. Emily Rodriguez',
        quizzes: [
          {
            id: 'PY201',
            quiz_code: 'PY201',
            title: 'Python Programming',
            description: 'Learn Python from basics to advanced',
            total_questions: 30,
            created_by: 'instructor-3',
            is_published: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'WEB201',
            quiz_code: 'WEB201',
            title: 'Web Development with Python',
            description: 'Build web apps using Django and Flask',
            total_questions: 22,
            created_by: 'instructor-3',
            is_published: true,
            created_at: new Date().toISOString(),
          },
        ],
      },
    };

    // Look up instructor quizzes by code
    const instructorData = mockInstructorQuizzes[code];

    if (!instructorData) {
      log.info(`No instructor found for code: ${code}`);
      return NextResponse.json(
        {
          success: false,
          error: { message: 'No instructor found for this code', code: 'NOT_FOUND' },
        },
        { status: 404 }
      );
    }

    // Transform to match Quiz interface (code not quiz_code, questionCount not total_questions)
    const transformedQuizzes = instructorData.quizzes.map(
      (q: {
        id: string;
        quiz_code: string;
        title: string;
        description?: string;
        total_questions: number;
        created_by?: string;
        is_published: boolean;
        created_at: string;
      }) => ({
        id: q.id,
        quiz_code: q.quiz_code,
        title: q.title,
        description: q.description,
        total_questions: q.total_questions,
        created_by: q.created_by || 'instructor',
        is_published: q.is_published,
        created_at: q.created_at,
      })
    );

    log.info(`Found ${transformedQuizzes.length} quizzes for instructor code: ${code}`);

    return NextResponse.json({
      success: true,
      data: {
        quizzes: transformedQuizzes,
        instructorName: instructorData.instructorName,
      },
    });
  } catch (error) {
    log.error('Error in quizzes by code endpoint:', error);
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
