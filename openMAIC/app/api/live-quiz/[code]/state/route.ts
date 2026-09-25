/**
 * GET /api/live-quiz/[code]/state
 *
 * Returns the current state of a live quiz session.
 * Route parameter: code (8-char join code)
 * Query params: optional studentId (for personalization)
 *
 * No authentication required — clients poll this every 500ms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizStateAPI');

interface CurrentQuestion {
  id: string;
  number: number;
  text: string;
  options: Array<{
    id: string;
    label: string;
    text: string;
  }>;
  points?: number;
}

interface LiveQuizStateResponse {
  sessionId: string;
  status: 'pending' | 'live' | 'paused' | 'ended';
  currentQuestionIndex: number;
  currentQuestion: CurrentQuestion | null;
  totalQuestions: number;
  questionStartedAt: string | null; // ISO timestamp
  questionDurationSeconds: number;
  timeRemaining: number; // seconds
  participantCount: number;
  studentAlreadyAnswered?: boolean; // only if studentId provided
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    // Validate code format (must be 8 alphanumeric characters)
    if (!code || !/^[a-zA-Z0-9]{8}$/.test(code)) {
      log.warn(`Invalid code format: ${code}`);
      return apiError('INVALID_REQUEST', 400, 'Invalid join code format');
    }

    const supabase = getSupabaseClient();

    // 1. Look up live_quiz_sessions by join_code
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('*')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found for code: ${code}`, sessionError);
      return apiError('SESSION_NOT_FOUND', 404, 'Live quiz session not found');
    }

    // 2. Fetch the quiz metadata
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, total_questions')
      .eq('id', session.quiz_id)
      .single();

    if (quizError || !quiz) {
      log.warn(`Quiz not found: ${session.quiz_id}`, quizError);
      return apiError('QUIZ_NOT_FOUND', 404, 'Associated quiz not found');
    }

    // 3. Fetch the current question (if available)
    let currentQuestion: CurrentQuestion | null = null;

    if (session.current_question_index !== null && session.current_question_index >= 0) {
      const { data: question, error: questionError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', session.quiz_id)
        .eq('question_number', session.current_question_index + 1)
        .single();

      if (!questionError && question) {
        const options = [];
        if (question.option_a) options.push({ id: 'a', label: 'A', text: question.option_a });
        if (question.option_b) options.push({ id: 'b', label: 'B', text: question.option_b });
        if (question.option_c) options.push({ id: 'c', label: 'C', text: question.option_c });
        if (question.option_d) options.push({ id: 'd', label: 'D', text: question.option_d });
        if (question.option_e) options.push({ id: 'e', label: 'E', text: question.option_e });

        currentQuestion = {
          id: question.id,
          number: question.question_number,
          text: question.question,
          options,
          points: question.points,
        };
      }
    }

    // 4. Calculate time remaining
    let timeRemaining = 0;
    if (session.question_started_at && session.question_duration_seconds) {
      const startedAt = new Date(session.question_started_at).getTime();
      const now = Date.now();
      const elapsedMs = now - startedAt;
      const remainingMs = (session.question_duration_seconds * 1000) - elapsedMs;
      timeRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
    }

    // 5. Get participant count
    const { count: participantCount, error: participantCountError } = await supabase
      .from('live_quiz_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    if (participantCountError) {
      log.warn(`Failed to count participants for session ${session.id}:`, participantCountError);
    }

    // 6. Check if student has answered current question (if studentId provided)
    let studentAlreadyAnswered = false;
    if (studentId && session.current_question_index !== null) {
      const { data: response, error: responseError } = await supabase
        .from('live_quiz_responses')
        .select('id')
        .eq('session_id', session.id)
        .eq('student_id', studentId)
        .eq('question_id', currentQuestion?.id || '')
        .maybeSingle();

      if (!responseError && response) {
        studentAlreadyAnswered = true;
      }
    }

    const responseData: LiveQuizStateResponse = {
      sessionId: session.id,
      status: session.status,
      currentQuestionIndex: session.current_question_index ?? -1,
      currentQuestion,
      totalQuestions: quiz.total_questions || 0,
      questionStartedAt: session.question_started_at,
      questionDurationSeconds: session.question_duration_seconds || 0,
      timeRemaining,
      participantCount: participantCount ?? 0,
    };

    if (studentId) {
      responseData.studentAlreadyAnswered = studentAlreadyAnswered;
    }

    log.info(`State retrieved for session: ${session.id}, code: ${code}`);

    return apiSuccess(responseData);
  } catch (error) {
    log.error('Error retrieving live quiz state:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to retrieve live quiz state',
      error instanceof Error ? error.message : undefined
    );
  }
}
