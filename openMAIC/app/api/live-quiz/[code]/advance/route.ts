/**
 * POST /api/live-quiz/[code]/advance
 * Advance to the next question in a live quiz session
 * REQUIRES: Instructor authentication
 *
 * Route param: code (8-char join code)
 * Response: { currentQuestionIndex, currentQuestion, timeToSubmit }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizAdvance');

interface QuizQuestion {
  id: string;
  question_number: number;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer?: string;
  explanation?: string;
  timer_seconds?: number;
  points?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { code } = await params;

    if (!code || code.length !== 8) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Invalid join code format (must be 8 characters)',
      );
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Look up session by join_code and verify instructor owns it
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, quiz_id, instructor_id, current_question_index, question_duration_seconds')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found for code: ${code}`);
      return apiError('SESSION_NOT_FOUND', 404, 'Invalid or expired join code');
    }

    // Verify instructor owns this session
    if (session.instructor_id !== authenticatedInstructor.id) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to advance session owned by ${session.instructor_id}`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to advance this session');
    }

    // Fetch quiz to get total number of questions
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', session.quiz_id)
      .single();

    if (quizError || !quiz) {
      log.error('Quiz not found:', quizError);
      return apiError('QUIZ_NOT_FOUND', 404, 'Quiz not found');
    }

    // Fetch total question count
    const { data: allQuestions, error: countError } = await supabase
      .from('quiz_questions')
      .select('id', { count: 'exact' })
      .eq('quiz_id', session.quiz_id);

    if (countError) {
      log.error('Error fetching question count:', countError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch questions');
    }

    const totalQuestions = allQuestions?.length || 0;
    const newQuestionIndex = session.current_question_index + 1;

    // Check if we've reached the end
    if (newQuestionIndex >= totalQuestions) {
      log.info(`Quiz session ${session.id} has no more questions (index ${newQuestionIndex} >= total ${totalQuestions})`);
      return apiError('INVALID_REQUEST', 400, 'No more questions in this quiz');
    }

    // Update session: increment question index, reset timer, hide leaderboard
    const { error: updateError } = await supabase
      .from('live_quiz_sessions')
      .update({
        current_question_index: newQuestionIndex,
        question_started_at: new Date().toISOString(),
        show_leaderboard: false,
      })
      .eq('id', session.id);

    if (updateError) {
      log.error('Failed to update session:', updateError);
      return apiError('SESSION_UPDATE_FAILED', 500, 'Failed to advance question');
    }

    // Fetch the new current question
    const { data: questions, error: questionError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', session.quiz_id)
      .order('question_number', { ascending: true })
      .range(newQuestionIndex, newQuestionIndex);

    if (questionError || !questions || questions.length === 0) {
      log.error('Error fetching current question:', questionError);
      return apiError('QUESTION_NOT_FOUND', 404, 'Failed to load current question');
    }

    const q = questions[0] as QuizQuestion;

    // Transform question to frontend format (hide correct answer from instructor)
    const currentQuestion = {
      id: q.id,
      question_number: q.question_number,
      question: q.question,
      options: {
        a: q.option_a || '',
        b: q.option_b || '',
        c: q.option_c || '',
        d: q.option_d || '',
        e: q.option_e || '',
      },
      explanation: q.explanation || '',
      timer_seconds: q.timer_seconds || 30,
      points: q.points || 10,
      // Note: correct_answer is NOT sent to instructor in real-time to avoid cheating
    };

    const timeToSubmit = session.question_duration_seconds || 60;

    log.info(
      `✅ Session ${session.id} advanced to question ${newQuestionIndex} by ${authenticatedInstructor.email}`,
    );

    return apiSuccess({
      data: {
        currentQuestionIndex: newQuestionIndex,
        currentQuestion,
        timeToSubmit,
        totalQuestions,
      },
    });
  } catch (error) {
    log.error('Unexpected error in advance endpoint:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to advance quiz');
  }
}
