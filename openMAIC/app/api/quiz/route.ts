/**
 * Quiz CRUD Endpoints
 * POST /api/quiz — Create quiz (requireInstructor)
 * GET /api/quiz/list — List instructor quizzes (already exists, using this for list)
 */

import { NextRequest } from 'next/server';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess, API_ERROR_CODES } from '@/lib/server/api-response';
import { createQuiz, listInstructorQuizzes } from '@/lib/quiz/quiz-service';
import { isFeatureEnabled } from '@/lib/server/feature-flags';
import { requireCSRFValidation } from '@/lib/server/csrf-token';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizRoute');

interface CreateQuizRequest {
  title: string;
  description?: string;
  questions: Array<{
    question: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    option_e?: string;
    correct_answer: string;
    explanation?: string;
    points?: number;
  }>;
  time_limit_minutes?: number;
  attempt_limit?: number;
  pass_threshold?: number;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let instructor;
    try {
      instructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // 🛡️ CSRF PROTECTION: Validate CSRF token
    const csrfValidation = await requireCSRFValidation(req);
    if (!csrfValidation.valid) {
      log.warn(`CSRF validation failed for instructor ${instructor.email}`);
      return apiError('CSRF_VALIDATION_FAILED', 403, csrfValidation.error || 'CSRF validation failed');
    }

    // ⚠️ FEATURE FLAG: Check if quiz creation is enabled
    const quizEnabled = await isFeatureEnabled('quiz_assignments');
    if (!quizEnabled) {
      log.warn(`Quiz feature disabled for instructor ${instructor.email}`);
      return apiError('PROVIDER_DISABLED', 403, 'Quiz feature is not enabled');
    }

    // 📥 VALIDATION: Parse and validate request body
    const body = (await req.json()) as CreateQuizRequest;

    if (!body.title || !body.title.trim()) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'Quiz title is required'
      );
    }

    if (!body.questions || body.questions.length === 0) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'At least one question is required'
      );
    }

    // Validate each question
    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];
      if (!q.question || !q.question.trim()) {
        return apiError(
          'VALIDATION_ERROR',
          400,
          `Question ${i + 1}: Question text is required`
        );
      }
      if (!q.correct_answer) {
        return apiError(
          'VALIDATION_ERROR',
          400,
          `Question ${i + 1}: Correct answer is required`
        );
      }
    }

    // Validate time and attempt limits
    if (body.time_limit_minutes && body.time_limit_minutes < 1) {
      return apiError(
        'VALIDATION_ERROR',
        400,
        'Time limit must be at least 1 minute'
      );
    }

    if (body.attempt_limit && body.attempt_limit < 1) {
      return apiError(
        'VALIDATION_ERROR',
        400,
        'Attempt limit must be at least 1'
      );
    }

    if (body.pass_threshold && (body.pass_threshold < 0 || body.pass_threshold > 100)) {
      return apiError(
        'VALIDATION_ERROR',
        400,
        'Pass threshold must be between 0 and 100'
      );
    }

    // 💾 DATABASE: Create quiz
    log.info(`Creating quiz for instructor ${instructor.email}: "${body.title}"`);

    const result = await createQuiz(instructor.email, {
      title: body.title.trim(),
      description: body.description?.trim(),
      questions: body.questions,
      time_limit_minutes: body.time_limit_minutes,
      attempt_limit: body.attempt_limit,
      pass_threshold: body.pass_threshold,
    });

    if (!result) {
      log.error('Failed to create quiz');
      return apiError(
        'QUIZ_CREATION_FAILED',
        500,
        'Failed to create quiz'
      );
    }

    // ✅ SUCCESS
    log.info(`✅ Quiz created: ${result.quiz.id}`);

    return apiSuccess({
      data: {
        quiz_id: result.quiz.id,
        quiz_code: result.quiz.quiz_code,
        title: result.quiz.title,
        description: result.quiz.description,
        total_questions: result.questionCount,
        total_points: result.quiz.total_points,
        time_limit_minutes: result.quiz.time_limit_minutes,
        attempt_limit: result.quiz.attempt_limit,
        pass_threshold: result.quiz.pass_threshold,
        created_at: result.quiz.created_at,
      },
    }, 201);
  } catch (error) {
    log.error('Error in POST /api/quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}

/**
 * GET /api/quiz — List instructor's quizzes
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let instructor;
    try {
      instructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // 📥 QUERY PARAMS
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') as any) || undefined;

    // 💾 DATABASE: List quizzes
    log.info(`Listing quizzes for instructor ${instructor.email}`);

    const result = await listInstructorQuizzes(instructor.email, {
      page,
      limit,
      search,
      status,
    });

    if (!result) {
      log.error('Failed to list quizzes');
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to list quizzes'
      );
    }

    // ✅ SUCCESS
    return apiSuccess({
      data: {
        quizzes: result.quizzes,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        },
      },
    });
  } catch (error) {
    log.error('Error in GET /api/quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
