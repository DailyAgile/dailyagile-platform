/**
 * POST /api/live-quiz/[code]/join
 * Join an existing live quiz session using a join code
 * REQUIRES: Student ID provided in request body (no JWT auth)
 *
 * Route parameters:
 * - code: 8-character join code (case-insensitive)
 *
 * Request body:
 * {
 *   studentId: string (UUID)
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     sessionId: string (UUID),
 *     joinCode: string,
 *     quizTitle: string,
 *     currentQuestionIndex: number,
 *     totalQuestions: number,
 *     studentId: string
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizJoin');

interface JoinLiveQuizRequest {
  studentId: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  try {
    // Extract join code from route parameter
    const { code } = await params;

    if (!code || typeof code !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Join code is required');
    }

    // Parse request body
    let body: JoinLiveQuizRequest;
    try {
      body = await req.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, 'Invalid request body');
    }

    const { studentId } = body;

    // Validate studentId
    if (!studentId || typeof studentId !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'studentId is required and must be a string');
    }

    const supabase = getSupabaseClient();

    // Look up session by join code (case-insensitive)
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, quiz_id, join_code, status, current_question_index')
      .ilike('join_code', code)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found for join code: ${code}`);
      return apiError('INVALID_REQUEST', 400, 'Invalid or expired join code');
    }

    // Verify session status is accepting participants
    if (session.status !== 'pending' && session.status !== 'live') {
      log.warn(`Session ${session.id} not accepting participants. Status: ${session.status}`);
      return apiError(
        'INVALID_REQUEST',
        400,
        `Session is not accepting new participants (status: ${session.status})`,
      );
    }

    // Fetch quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, total_questions')
      .eq('id', session.quiz_id)
      .eq('is_active', true)
      .single();

    if (quizError || !quiz) {
      log.error(`Quiz not found for session ${session.id}: ${session.quiz_id}`);
      return apiError('INTERNAL_ERROR', 500, 'Quiz not found');
    }

    // UPSERT student into live_quiz_participants
    const { data: participant, error: participantError } = await supabase
      .from('live_quiz_participants')
      .upsert(
        {
          session_id: session.id,
          student_id: studentId,
          current_score: 0,
          questions_answered: 0,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,student_id',
        },
      )
      .select('id')
      .single();

    if (participantError || !participant) {
      log.error(`Failed to add participant to session ${session.id}:`, participantError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to join session');
    }

    log.info(
      `Student ${studentId} joined session ${session.id} with join code ${code}`,
    );

    return apiSuccess({
      success: true,
      data: {
        sessionId: session.id,
        joinCode: session.join_code,
        quizTitle: quiz.title,
        currentQuestionIndex: session.current_question_index,
        totalQuestions: quiz.total_questions,
        studentId: studentId,
      },
    });
  } catch (error) {
    log.error('Error joining live quiz session:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to join live quiz session');
  }
}
