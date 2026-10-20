/**
 * Quiz Settings API Endpoint
 * GET /api/instructor/quiz/{quizId}/settings - Read quiz settings
 * PATCH /api/instructor/quiz/{quizId}/settings - Update quiz settings
 *
 * Allows instructors to configure:
 * - Time limit (minutes)
 * - Retake policy
 * - Passing score threshold
 * - Show answers after submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize, canManage } from '@/lib/server/route-guards';
import { requireInstructor } from '@/lib/server/auth-middleware';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizSettingsAPI');

// Type definitions
interface QuizSettings {
  timeLimitMinutes: number | null;
  allowRetakes: boolean;
  maxRetakes: number;
  passingScorePercentage: number;
  showAnswersAfterSubmit: boolean;
}

interface UpdateSettingsRequest {
  timeLimitMinutes?: number | null;
  allowRetakes?: boolean;
  maxRetakes?: number;
  passingScorePercentage?: number;
  showAnswersAfterSubmit?: boolean;
}

interface QuizRow {
  id: string;
  instructor_id: string;
  time_limit_minutes: number | null;
  allow_retakes: boolean;
  max_retakes: number;
  passing_score_percentage: number;
  show_answers_after_submit: boolean;
}

/**
 * GET /api/instructor/quiz/{quizId}/settings
 * Retrieve current quiz settings
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ quizId: string }> }
): Promise<NextResponse> {
  try {
    const { quizId } = await context.params;

    if (!quizId) {
      return NextResponse.json(
        { error: { message: 'Missing quiz ID' } },
        { status: 400 }
      );
    }

    // Get user from request (from auth header or session)
    const caller = await authorize(req, requireInstructor);
    if (caller instanceof NextResponse) return caller;

    // Fetch quiz with ownership verification
    const { data: quiz, error: queryError } = await getSupabaseClient()
      .from('quizzes')
      .select(
        'id, instructor_id, time_limit_minutes, allow_retakes, max_retakes, passing_score_percentage, show_answers_after_submit'
      )
      .eq('id', quizId)
      .single();

    if (queryError) {
      log.error('Database error fetching quiz:', queryError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch quiz settings' } },
        { status: 500 }
      );
    }

    if (!quiz) {
      log.warn(`Quiz not found: ${quizId}`);
      return NextResponse.json(
        { error: { message: 'Quiz not found' } },
        { status: 404 }
      );
    }

    if (!canManage(caller, quiz.instructor_id)) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
    }
    log.info(`Settings retrieved for quiz: ${quizId}`);

    const settings: QuizSettings = {
      timeLimitMinutes: quiz.time_limit_minutes,
      allowRetakes: quiz.allow_retakes,
      maxRetakes: quiz.max_retakes,
      passingScorePercentage: quiz.passing_score_percentage,
      showAnswersAfterSubmit: quiz.show_answers_after_submit,
    };

    return NextResponse.json({
      success: true,
      data: {
        quizId: quiz.id,
        ...settings,
      },
    });
  } catch (error) {
    log.error('Unexpected error in GET:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/instructor/quiz/{quizId}/settings
 * Update quiz settings
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ quizId: string }> }
): Promise<NextResponse> {
  try {
    const { quizId } = await context.params;

    if (!quizId) {
      return NextResponse.json(
        { error: { message: 'Missing quiz ID' } },
        { status: 400 }
      );
    }

    // Get user from request
    const caller = await authorize(req, requireInstructor);
    if (caller instanceof NextResponse) return caller;

    // Parse request body
    let body: UpdateSettingsRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }

    // Fetch quiz with ownership verification
    const { data: quiz, error: queryError } = await getSupabaseClient()
      .from('quizzes')
      .select('id, instructor_id')
      .eq('id', quizId)
      .single();

    if (!quiz || !canManage(caller, quiz.instructor_id)) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
    }

    if (queryError) {
      log.error('Database error fetching quiz:', queryError);
      return NextResponse.json(
        { error: { message: 'Failed to update quiz settings' } },
        { status: 500 }
      );
    }

    if (!quiz) {
      log.warn(`Quiz not found: ${quizId}`);
      return NextResponse.json(
        { error: { message: 'Quiz not found' } },
        { status: 404 }
      );
    }

    // Validate time_limit_minutes
    if (
      body.timeLimitMinutes !== undefined &&
      body.timeLimitMinutes !== null &&
      (typeof body.timeLimitMinutes !== 'number' ||
        body.timeLimitMinutes < 0 ||
        body.timeLimitMinutes > 120)
    ) {
      return NextResponse.json(
        { error: { message: 'Time limit must be between 0 and 120 minutes' } },
        { status: 400 }
      );
    }

    // Validate passing_score_percentage
    if (
      body.passingScorePercentage !== undefined &&
      (typeof body.passingScorePercentage !== 'number' ||
        body.passingScorePercentage < 0 ||
        body.passingScorePercentage > 100)
    ) {
      return NextResponse.json(
        {
          error: { message: 'Passing score must be between 0 and 100 percent' },
        },
        { status: 400 }
      );
    }

    // Validate max_retakes
    if (
      body.maxRetakes !== undefined &&
      (typeof body.maxRetakes !== 'number' ||
        body.maxRetakes < 0 ||
        body.maxRetakes > 20)
    ) {
      return NextResponse.json(
        { error: { message: 'Max retakes must be between 0 and 20' } },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Partial<{
      time_limit_minutes: number | null;
      allow_retakes: boolean;
      max_retakes: number;
      passing_score_percentage: number;
      show_answers_after_submit: boolean;
      updated_at: string;
    }> = {
      updated_at: new Date().toISOString(),
    };

    if (body.timeLimitMinutes !== undefined) {
      updateData.time_limit_minutes = body.timeLimitMinutes;
    }
    if (body.allowRetakes !== undefined) {
      updateData.allow_retakes = body.allowRetakes;
    }
    if (body.maxRetakes !== undefined) {
      updateData.max_retakes = body.maxRetakes;
    }
    if (body.passingScorePercentage !== undefined) {
      updateData.passing_score_percentage = body.passingScorePercentage;
    }
    if (body.showAnswersAfterSubmit !== undefined) {
      updateData.show_answers_after_submit = body.showAnswersAfterSubmit;
    }

    // Update database
    const { data: updatedQuiz, error: updateError } = await getSupabaseClient()
      .from('quizzes')
      .update(updateData)
      .eq('id', quizId)
      .select(
        'id, time_limit_minutes, allow_retakes, max_retakes, passing_score_percentage, show_answers_after_submit'
      )
      .single();

    if (updateError) {
      log.error('Database error updating quiz settings:', updateError);
      return NextResponse.json(
        { error: { message: 'Failed to update quiz settings' } },
        { status: 500 }
      );
    }

    if (!updatedQuiz) {
      log.error('Quiz not found after update');
      return NextResponse.json(
        { error: { message: 'Quiz not found' } },
        { status: 404 }
      );
    }

    log.info(`Quiz settings updated: ${quizId}`);

    const settings: QuizSettings = {
      timeLimitMinutes: updatedQuiz.time_limit_minutes,
      allowRetakes: updatedQuiz.allow_retakes,
      maxRetakes: updatedQuiz.max_retakes,
      passingScorePercentage: updatedQuiz.passing_score_percentage,
      showAnswersAfterSubmit: updatedQuiz.show_answers_after_submit,
    };

    return NextResponse.json({
      success: true,
      data: {
        quizId: updatedQuiz.id,
        ...settings,
      },
    });
  } catch (error) {
    log.error('Unexpected error in PATCH:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
