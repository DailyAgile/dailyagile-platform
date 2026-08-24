/**
 * Complete Quiz Session
 * POST /api/quiz/complete
 * Student finishes quiz - calculates score and marks as completed
 */

import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('CompleteQuizRoute');

interface CompleteQuizRequest {
  session_id: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION
    let user;
    try {
      user = await requireAuth(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // 📥 VALIDATION
    const body = (await req.json()) as CompleteQuizRequest;

    if (!body.session_id) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'session_id is required'
      );
    }

    // 💾 DATABASE: Get session (atomic transaction)
    const supabase = getSupabaseClient();

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(
        `
        *,
        quiz_assignments!inner(
          quiz_id,
          quizzes!inner(
            pass_threshold
          )
        )
      `
      )
      .eq('id', body.session_id)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found: ${body.session_id}`);
      return apiError(
        'SESSION_NOT_FOUND',
        404,
        'Session not found'
      );
    }

    // Check session belongs to user
    if (session.student_id !== 'guest-session' && session.student_id !== user.id) {
      log.warn(`Unauthorized session access: ${user.id} vs ${session.student_id}`);
      return apiError(
        'FORBIDDEN',
        403,
        'You do not have permission to access this session'
      );
    }

    // Check session is in progress
    if (session.status !== 'in_progress') {
      log.warn(`Session not in progress: ${body.session_id} (status: ${session.status})`);
      return apiError(
        'SESSION_NOT_ACTIVE',
        409,
        'Session is not in progress'
      );
    }

    // Calculate total score from answers
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('points_earned, max_points')
      .eq('session_id', body.session_id);

    if (answersError) {
      log.error('Error fetching answers:', answersError);
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to calculate score'
      );
    }

    const totalPoints = answers?.reduce((sum: number, a: any) => sum + (a.max_points || 0), 0) || 0;
    const earnedPoints = answers?.reduce((sum: number, a: any) => sum + (a.points_earned || 0), 0) || 0;
    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Get pass threshold
    const passThreshold = session.quiz_assignments?.[0]?.quizzes?.[0]?.pass_threshold || 70;
    const isPassed = percentage >= passThreshold;

    // Update session with completion info (ATOMIC - single query)
    const { data: updated, error: updateError } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_score: earnedPoints,
        max_score: totalPoints,
        percentage,
        is_passed: isPassed,
      })
      .eq('id', body.session_id)
      .select()
      .single();

    if (updateError) {
      log.error('Error updating session:', updateError);
      return apiError(
        'SESSION_UPDATE_FAILED',
        500,
        'Failed to complete quiz'
      );
    }

    log.info(`✅ Quiz completed: ${body.session_id} (${percentage}% - ${isPassed ? 'PASSED' : 'FAILED'})`);

    return apiSuccess({
      data: {
        session_id: body.session_id,
        status: 'completed',
        total_score: earnedPoints,
        max_score: totalPoints,
        percentage,
        is_passed: isPassed,
        pass_threshold: passThreshold,
        answer_count: answers?.length || 0,
        completed_at: updated.completed_at,
      },
    }, 200);
  } catch (error) {
    log.error('Error in POST /api/quiz/complete:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
