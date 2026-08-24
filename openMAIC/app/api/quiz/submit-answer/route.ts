/**
 * Submit Quiz Answer
 * POST /api/quiz/submit-answer
 * Student submits answer to a question during an active quiz session
 */

import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('SubmitAnswerRoute');

interface SubmitAnswerRequest {
  session_id: string;
  question_id: string;
  user_answer: string | string[];
  time_spent_seconds?: number;
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
    const body = (await req.json()) as SubmitAnswerRequest;

    if (!body.session_id) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'session_id is required'
      );
    }

    if (!body.question_id) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'question_id is required'
      );
    }

    if (body.user_answer === undefined || body.user_answer === null ||
        (Array.isArray(body.user_answer) && body.user_answer.length === 0) ||
        (typeof body.user_answer === 'string' && !body.user_answer.trim())) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'user_answer is required'
      );
    }

    // 💾 DATABASE: Get and validate session
    const supabase = getSupabaseClient();

    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(
        `
        id,
        student_id,
        status,
        assignment_id,
        quiz_snapshot_id,
        expires_at,
        quiz_snapshots!inner(
          quiz_definition
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

    // Check session is active
    if (session.status !== 'in_progress') {
      log.warn(`Session not active: ${body.session_id} (status: ${session.status})`);
      return apiError(
        'SESSION_NOT_ACTIVE',
        409,
        'Session is not active'
      );
    }

    // Check session hasn't expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (now >= expiresAt) {
      log.warn(`Session expired: ${body.session_id}`);
      return apiError(
        'CONFLICT',
        409,
        'Quiz session has expired'
      );
    }

    // Find question in snapshot
    const snapshot = session.quiz_snapshots[0];
    const quizDef = snapshot.quiz_definition;
    const question = quizDef.questions.find((q: any) => q.id === body.question_id);

    if (!question) {
      log.warn(`Question not found in snapshot: ${body.question_id}`);
      return apiError(
        'QUESTION_NOT_FOUND',
        404,
        'Question not found'
      );
    }

    // Determine if answer is correct
    const normalizedAnswer = Array.isArray(body.user_answer)
      ? body.user_answer.map((a: any) => String(a).toUpperCase()).sort()
      : String(body.user_answer).toUpperCase().trim();

    const correctAnswer = Array.isArray(question.correct_answer)
      ? question.correct_answer.map((a: string) => String(a).toUpperCase()).sort()
      : String(question.correct_answer).toUpperCase();

    const isCorrect = Array.isArray(normalizedAnswer)
      ? normalizedAnswer.length === (correctAnswer as string[]).length &&
        normalizedAnswer.every((a, i) => a === (correctAnswer as string[])[i])
      : normalizedAnswer === correctAnswer;

    const pointsEarned = isCorrect ? (question.points || 10) : 0;

    // Insert answer
    const { data: answer, error: answerError } = await supabase
      .from('quiz_answers')
      .insert({
        session_id: body.session_id,
        question_id: body.question_id,
        question_text: question.question,
        user_answer: typeof body.user_answer === 'string' ? body.user_answer : JSON.stringify(body.user_answer),
        correct_answer: String(question.correct_answer),
        is_correct: isCorrect,
        points_earned: pointsEarned,
        max_points: question.points || 10,
        feedback: question.explanation || null,
        time_spent_seconds: body.time_spent_seconds,
        grading_status: 'ungraded',
      })
      .select()
      .single();

    if (answerError) {
      log.error('Error inserting answer:', answerError);
      return apiError(
        'INTERNAL_ERROR',
        500,
        'Failed to submit answer'
      );
    }

    log.info(`✅ Answer submitted: ${body.session_id} - Q${body.question_id} (correct: ${isCorrect})`);

    return apiSuccess({
      data: {
        answer_id: answer.id,
        question_id: body.question_id,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        max_points: question.points || 10,
        feedback: answer.feedback,
      },
    }, 201);
  } catch (error) {
    log.error('Error in POST /api/quiz/submit-answer:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
