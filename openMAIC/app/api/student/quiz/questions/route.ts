/**
 * Get Quiz Questions
 * GET /api/student/quiz/questions?session_id=xxx
 *
 * Retrieves all questions for a quiz session
 * Does NOT include correct answers (those are revealed after submission)
 *
 * 🔒 SECURITY: Requires student authentication + session ownership verification
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireStudent, handleAuthError } from '@/lib/server/auth-middleware';

const log = createLogger('GetQuizQuestions');

interface QuizQuestion {
  id: string;
  question_number: number;
  question: string;
  timer_seconds: number;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
  };
  points: number;
  // Note: correct_answer is NOT included here (hidden from student)
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 SECURITY: Verify student is authenticated
    let authenticatedStudent;
    try {
      authenticatedStudent = await requireStudent(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return apiError('MISSING_PARAM', 400, 'session_id parameter is required');
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Verify session exists
    const { data: session, error: sessionError } = await getSupabaseClient()
      .from('quiz_sessions')
      .select('id, quiz_id, student_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return apiError('SESSION_NOT_FOUND', 404, 'Quiz session not found');
    }

    // 🔒 SECURITY: Verify student owns this session (prevent answer leakage)
    if (session.student_id !== authenticatedStudent.id) {
      log.warn(
        `Unauthorized quiz access attempt: student ${authenticatedStudent.id} tried to access session ${sessionId} owned by ${session.student_id}`
      );
      return apiError('FORBIDDEN', 403, 'This quiz session does not belong to you');
    }

    // Verify session is still in progress
    if (session.status !== 'in_progress') {
      return apiError('SESSION_NOT_ACTIVE', 400, 'Quiz session is not active');
    }

    // Fetch questions (WITHOUT correct answers)
    const { data: questions, error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .select('id, question_number, question, timer_seconds, option_a, option_b, option_c, option_d, option_e, points')
      .eq('quiz_id', session.quiz_id)
      .order('question_number', { ascending: true });

    if (questionsError || !questions) {
      log.error('Failed to fetch questions:', questionsError);
      return apiError('QUESTIONS_FETCH_FAILED', 500, 'Failed to load quiz questions');
    }

    // Format questions (without correct answers)
    const formattedQuestions: QuizQuestion[] = questions.map((q: any) => ({
      id: q.id,
      question_number: q.question_number,
      question: q.question,
      timer_seconds: q.timer_seconds,
      options: {
        a: q.option_a,
        b: q.option_b,
        c: q.option_c,
        d: q.option_d,
        e: q.option_e,
      },
      points: q.points,
    }));

    log.info(`Questions retrieved: ${formattedQuestions.length} questions for session ${sessionId}`);

    return apiSuccess({
      session_id: sessionId,
      total_questions: formattedQuestions.length,
      questions: formattedQuestions,
    });
  } catch (error) {
    log.error('Get questions failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to retrieve quiz questions');
  }
}
