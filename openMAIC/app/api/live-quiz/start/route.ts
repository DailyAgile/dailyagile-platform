/**
 * POST /api/live-quiz/start
 * Start a new live quiz session for an instructor
 * REQUIRES: Instructor authentication (JWT token)
 *
 * Request body:
 * {
 *   quizId: string (UUID)
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     sessionId: string (UUID),
 *     joinCode: string (8-char alphanumeric),
 *     quizTitle: string,
 *     totalQuestions: number
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizStart');

/**
 * Generate a unique 8-character alphanumeric join code
 * Uses Web Crypto API for proper randomness (available in Node.js 15+)
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const randomBytes = new Uint8Array(8);
  // Web Crypto API is available in Node.js runtime
  globalThis.crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

interface StartLiveQuizRequest {
  quizId: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // Parse request body
    let body: StartLiveQuizRequest;
    try {
      body = await req.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, 'Invalid request body');
    }

    const { quizId } = body;

    // Validate required fields
    if (!quizId || typeof quizId !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'quizId is required and must be a string');
    }

    const supabase = getSupabaseClient();

    // Fetch quiz to verify it exists and get its details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, total_questions')
      .eq('id', quizId)
      .eq('is_active', true)
      .single();

    if (quizError || !quiz) {
      log.warn(`Quiz not found or inactive: ${quizId}`);
      return apiError('NOT_FOUND', 404, 'Quiz not found or inactive');
    }

    // Generate unique join code (retry up to 5 times if collision)
    let joinCode = '';
    let codeCollision = true;
    let attempts = 0;
    const maxAttempts = 5;

    while (codeCollision && attempts < maxAttempts) {
      joinCode = generateJoinCode();
      const { data: existingSession } = await supabase
        .from('live_quiz_sessions')
        .select('id')
        .eq('join_code', joinCode)
        .single();

      if (!existingSession) {
        codeCollision = false;
      }
      attempts++;
    }

    if (codeCollision) {
      log.error('Failed to generate unique join code after 5 attempts');
      return apiError('INTERNAL_ERROR', 500, 'Failed to generate session code');
    }

    // Create live quiz session
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .insert({
        quiz_id: quizId,
        instructor_id: authenticatedInstructor.id,
        join_code: joinCode,
        status: 'pending',
        current_question_index: 0,
        question_duration_seconds: 60,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      log.error('Failed to create live quiz session:', sessionError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to create live quiz session');
    }

    log.info(
      `Live quiz session created: ${session.id} for quiz ${quizId} by instructor ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      success: true,
      data: {
        sessionId: session.id,
        joinCode: joinCode,
        quizTitle: quiz.title,
        totalQuestions: quiz.total_questions,
      },
    });
  } catch (error) {
    log.error('Error starting live quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to start live quiz session');
  }
}
