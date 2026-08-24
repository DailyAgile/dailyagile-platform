/**
 * Submit Quiz Answer
 * POST /api/student/quiz/submit-answer
 *
 * Records a student's answer for a quiz question
 * Auto-grades based on correct answer
 *
 * 🔒 SECURITY: studentId verified from JWT (not client-supplied)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireStudent, handleAuthError } from '@/lib/server/auth-middleware';
import { requireStudentConsent } from '@/lib/server/consent-verification';

const log = createLogger('SubmitQuizAnswer');

interface SubmitAnswerRequest {
  session_id: string;
  question_id: string;
  selected_answer: string; // A, B, C, D, or E
  time_taken_seconds: number;
}

interface SubmitAnswerResponse {
  success: boolean;
  is_correct: boolean;
  message: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 SECURITY: Verify student is authenticated (studentId comes from JWT, not request)
    let authenticatedStudent;
    try {
      authenticatedStudent = await requireStudent(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // 🔒 GDPR: Verify student has given privacy consent
    try {
      await requireStudentConsent(authenticatedStudent.id, 'privacy');
    } catch (consentError: any) {
      if (consentError.code === 'CONSENT_REQUIRED') {
        log.warn(`Consent required for student ${authenticatedStudent.id}`);
        return apiError(
          'CONSENT_REQUIRED',
          403,
          'You must accept our Privacy Policy to submit quiz answers. Please review and accept our terms before proceeding.'
        );
      }
      throw consentError;
    }

    const body = (await req.json()) as SubmitAnswerRequest;
    const { session_id, question_id, selected_answer, time_taken_seconds } = body;

    // Validate inputs
    if (!session_id || !question_id || !selected_answer) {
      return apiError('MISSING_FIELDS', 400, 'session_id, question_id, and selected_answer are required');
    }

    const upperAnswer = selected_answer.toUpperCase();
    if (!['A', 'B', 'C', 'D', 'E'].includes(upperAnswer)) {
      return apiError('INVALID_ANSWER', 400, 'selected_answer must be A, B, C, D, or E');
    }

    if (time_taken_seconds < 0) {
      return apiError('INVALID_TIME', 400, 'time_taken_seconds must be non-negative');
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Verify session exists and is active
    const { data: session, error: sessionError } = await getSupabaseClient()
      .from('quiz_sessions')
      .select('id, quiz_id, status, student_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return apiError('SESSION_NOT_FOUND', 404, 'Quiz session not found');
    }

    // 🔒 SECURITY: Verify student owns this session (prevent submission spoofing)
    if (session.student_id !== authenticatedStudent.id) {
      log.warn(
        `Unauthorized session access attempt: student ${authenticatedStudent.id} tried to access session ${session_id} owned by ${session.student_id}`
      );
      return apiError('FORBIDDEN', 403, 'This quiz session does not belong to you');
    }

    if (session.status !== 'in_progress') {
      return apiError('SESSION_NOT_ACTIVE', 400, 'Quiz session is not active');
    }

    // Get question and correct answer
    const { data: question, error: questionError } = await getSupabaseClient()
      .from('quiz_questions')
      .select('id, correct_answer, points')
      .eq('id', question_id)
      .eq('quiz_id', session.quiz_id)
      .single();

    if (questionError || !question) {
      return apiError('QUESTION_NOT_FOUND', 404, 'Question not found');
    }

    // Determine if answer is correct
    const isCorrect = upperAnswer === question.correct_answer;

    // Insert response
    const { data: response, error: responseError } = await getSupabaseClient()
      .from('quiz_responses')
      .insert({
        session_id,
        question_id,
        selected_answer: upperAnswer,
        is_correct: isCorrect,
        time_taken_seconds,
      })
      .select('id')
      .single();

    if (responseError || !response) {
      // Handle duplicate answer (student re-answering same question)
      if (responseError?.code === '23505') {
        // Unique constraint violation - update instead of insert
        const { error: updateError } = await getSupabaseClient()
          .from('quiz_responses')
          .update({
            selected_answer: upperAnswer,
            is_correct: isCorrect,
            time_taken_seconds,
          })
          .eq('session_id', session_id)
          .eq('question_id', question_id);

        if (updateError) {
          log.error('Failed to update answer:', updateError);
          return apiError('UPDATE_FAILED', 500, 'Failed to update answer');
        }
      } else {
        log.error('Failed to insert answer:', responseError);
        return apiError('INSERT_FAILED', 500, 'Failed to submit answer');
      }
    }

    log.info(
      `Answer submitted: session ${session_id}, question ${question_id}, answer ${upperAnswer}, correct: ${isCorrect}`,
    );

    return apiSuccess({
      success: true,
      is_correct: isCorrect,
      message: isCorrect ? 'Correct!' : 'Incorrect',
    } as SubmitAnswerResponse);
  } catch (error) {
    log.error('Submit answer failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to submit answer');
  }
}
