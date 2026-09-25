import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';

const log = createLogger('RevealAnswerAPI');

interface RevealAnswerRequest {
  show_answer: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(request);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { code } = await params;

    if (!code || typeof code !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Join code is required');
    }

    let body: RevealAnswerRequest;
    try {
      body = await request.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, 'Invalid request body');
    }

    const supabase = getSupabaseClient();

    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, instructor_id')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      return apiError('NOT_FOUND', 404, 'Session not found');
    }

    if (session.instructor_id !== authenticatedInstructor.id) {
      return apiError('FORBIDDEN', 403, 'You do not own this session');
    }

    const { error: updateError } = await supabase
      .from('live_quiz_sessions')
      .update({ show_answer: body.show_answer })
      .eq('id', session.id);

    if (updateError) {
      log.error(`Failed to update answer visibility for session ${session.id}:`, updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to update answer visibility');
    }

    log.info(`Instructor ${authenticatedInstructor.id} set show_answer=${body.show_answer} for session ${session.id}`);

    return apiSuccess({
      data: {
        show_answer: body.show_answer,
      },
    });
  } catch (error) {
    log.error('Error revealing answer:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to reveal answer');
  }
}
