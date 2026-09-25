import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('LiveQuizSessionAPI');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(request);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { sessionId } = await params;
    if (!sessionId) {
      return apiError('INVALID_REQUEST', 400, 'sessionId is required');
    }

    const supabase = getSupabaseClient();

    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, quiz_id, instructor_id, join_code, status, current_question_index')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return apiError('NOT_FOUND', 404, 'Session not found');
    }

    if (session.instructor_id !== authenticatedInstructor.id) {
      return apiError('FORBIDDEN', 403, 'Unauthorized');
    }

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('title, total_questions')
      .eq('id', session.quiz_id)
      .single();

    if (!quiz) {
      return apiError('NOT_FOUND', 404, 'Quiz not found');
    }

    const { data: participants } = await supabase
      .from('live_quiz_participants')
      .select('id', { count: 'exact' })
      .eq('session_id', sessionId);

    log.info(`Session retrieved: ${sessionId}`);

    return apiSuccess({
      success: true,
      data: {
        sessionId: session.id,
        joinCode: session.join_code,
        quizTitle: quiz.title,
        totalQuestions: quiz.total_questions,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        participantCount: participants ? participants.length : 0,
      },
    });
  } catch (error) {
    log.error('Error retrieving session:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to retrieve session');
  }
}
