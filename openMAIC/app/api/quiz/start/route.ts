/**
 * Start Quiz Session
 * POST /api/quiz/start
 * Student starts taking a quiz (validates code, creates session)
 */

import { NextRequest } from 'next/server';
import { requireStudent, handleAuthError, requireAuth } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { isFeatureEnabled } from '@/lib/server/feature-flags';
import { createLogger } from '@/lib/logger';

const log = createLogger('StartQuizRoute');

interface StartQuizRequest {
  assignment_code: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Allow student or guest (anonymous) access
    let user;
    let isGuest = false;

    try {
      user = await requireStudent(req);
    } catch (authError) {
      // Check if this is shareable - allow anonymous
      const body = (await req.json()) as StartQuizRequest;
      if (!body.assignment_code) {
        const { status, message } = handleAuthError(authError);
        return apiError('UNAUTHORIZED', status, message);
      }
      isGuest = true;
    }

    // ⚠️ FEATURE FLAG
    const quizEnabled = await isFeatureEnabled('quiz_submission');
    if (!quizEnabled) {
      log.warn('Quiz submission disabled');
      return apiError('PROVIDER_DISABLED', 403, 'Quiz submission is not enabled');
    }

    // 📥 VALIDATION
    const body = (await req.json()) as StartQuizRequest;

    if (!body.assignment_code) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'assignment_code is required'
      );
    }

    // 💾 DATABASE: Find assignment by code
    const supabase = getSupabaseClient();

    const { data: assignment, error: assignError } = await supabase
      .from('quiz_assignments')
      .select(
        `
        *,
        quizzes!inner(
          id,
          title,
          total_questions,
          total_points,
          time_limit_minutes,
          attempt_limit,
          pass_threshold
        )
      `
      )
      .eq('assignment_code', body.assignment_code)
      .eq('is_active', true)
      .single();

    if (assignError || !assignment) {
      log.warn(`Invalid assignment code: ${body.assignment_code}`);
      return apiError(
        'NOT_FOUND',
        404,
        'Assignment not found or invalid code'
      );
    }

    const quiz = assignment.quizzes[0];

    // Check expiry
    const now = new Date();
    const expiryDate = new Date(assignment.expires_at);
    if (now >= expiryDate) {
      log.warn(`Assignment expired: ${assignment.id}`);
      return apiError(
        'CONFLICT',
        409,
        'This assignment has expired'
      );
    }

    // Get student ID
    let studentId = user?.id;
    let studentEmail = user?.email;

    if (isGuest) {
      // For shareable assignments, use email if provided or generate guest ID
      studentEmail = 'guest';
      studentId = 'guest-session';
    }

    // Check attempt limit
    const { count: attemptCount, error: countError } = await supabase
      .from('quiz_sessions')
      .select('id', { count: 'exact' })
      .eq('assignment_id', assignment.id)
      .eq('student_id', studentId)
      .eq('status', 'completed');

    if (countError) {
      log.error('Error counting attempts:', countError);
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to check attempt limit'
      );
    }

    const attemptLimit = quiz.attempt_limit || 1;
    if ((attemptCount || 0) >= attemptLimit) {
      log.warn(`Attempt limit exceeded for student ${studentId} on assignment ${assignment.id}`);
      return apiError(
        'CONFLICT',
        409,
        `You have reached the maximum number of attempts (${attemptLimit})`
      );
    }

    // Get next attempt number
    const { data: attempts, error: attemptNumError } = await supabase
      .from('quiz_sessions')
      .select('attempt_number')
      .eq('assignment_id', assignment.id)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (attemptNumError) {
      log.error('Error getting attempt number:', attemptNumError);
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to start session'
      );
    }

    const nextAttempt = ((attempts?.[0]?.attempt_number) || 0) + 1;

    // Get quiz snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('quiz_snapshots')
      .select('id, quiz_definition')
      .eq('assignment_id', assignment.id)
      .single();

    if (snapError || !snapshot) {
      log.error('Error fetching snapshot:', snapError);
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to load quiz'
      );
    }

    // Create session
    const timeLimit = quiz.time_limit_minutes || 60;
    const expiresAtTime = new Date(Date.now() + timeLimit * 60 * 1000).toISOString();

    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        assignment_id: assignment.id,
        quiz_id: quiz.id,
        student_id: studentId,
        student_email: studentEmail,
        quiz_snapshot_id: snapshot.id,
        status: 'in_progress',
        attempt_number: nextAttempt,
        started_at: new Date().toISOString(),
        expires_at: expiresAtTime,
      })
      .select()
      .single();

    if (sessionError) {
      log.error('Error creating session:', sessionError);
      return apiError(
        'SESSION_CREATION_FAILED',
        500,
        'Failed to start quiz'
      );
    }

    log.info(`✅ Quiz session started: ${session.id} (attempt ${nextAttempt})`);

    // Return quiz definition without correct answers
    const quizDef = snapshot.quiz_definition;
    const safeQuestions = quizDef.questions.map((q: any) => ({
      id: q.id,
      question_number: q.question_number,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      points: q.points || 10,
    }));

    return apiSuccess({
      data: {
        session_id: session.id,
        quiz_title: quiz.title,
        total_questions: quiz.total_questions,
        total_points: quiz.total_points,
        time_limit_minutes: timeLimit,
        attempt_number: nextAttempt,
        questions: safeQuestions,
      },
    }, 201);
  } catch (error) {
    log.error('Error in POST /api/quiz/start:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
