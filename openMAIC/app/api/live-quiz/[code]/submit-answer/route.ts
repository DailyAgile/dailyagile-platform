/**
 * POST /api/live-quiz/[code]/submit-answer
 * Submit an answer to the current question in a live quiz
 * NO special auth required — students submit answers for themselves
 *
 * Route param: code (8-char join code)
 * Body: { studentId: UUID, questionId: UUID, answer: string }
 * Response: { isCorrect, correctAnswer, explanation, responseTime }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('LiveQuizSubmitAnswer');

interface SubmitAnswerRequest {
  studentId: string;
  questionId: string;
  answer: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  try {
    const { code } = await params;

    if (!code || code.length !== 8) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Invalid join code format (must be 8 characters)',
      );
    }

    // Parse request body
    let body: SubmitAnswerRequest;
    try {
      body = await req.json();
    } catch {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Invalid request body — must be valid JSON',
      );
    }

    const { studentId, questionId, answer } = body;

    // Validate required fields
    if (!studentId || !questionId || answer === undefined) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'Missing required fields: studentId, questionId, answer',
      );
    }

    if (typeof answer !== 'string') {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Answer must be a string',
      );
    }

    const supabase = getSupabaseClient();

    // Look up session by join_code
    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, quiz_id, current_question_index, question_started_at, question_duration_seconds')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found for code: ${code}`);
      return apiError('SESSION_NOT_FOUND', 400, 'Invalid or expired join code');
    }

    // Server-side timer validation: check if question time has expired
    if (session.question_started_at) {
      const questionStartTime = new Date(session.question_started_at).getTime();
      const now = Date.now();
      const elapsedMs = now - questionStartTime;
      const questionDurationMs = (session.question_duration_seconds || 60) * 1000;

      if (elapsedMs > questionDurationMs) {
        log.info(
          `Answer submission rejected for session ${session.id}: time expired (${elapsedMs}ms > ${questionDurationMs}ms)`,
        );
        return apiError(
          'INVALID_TIME',
          400,
          `Time expired for this question (submitted ${Math.round(elapsedMs - questionDurationMs)}ms late)`,
        );
      }
    }

    // Fetch the quiz question to get correct answer
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer, explanation, points')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      log.warn(`Question not found: ${questionId}`);
      return apiError('QUESTION_NOT_FOUND', 404, 'Question not found');
    }

    // Verify the question belongs to this session's quiz
    const { data: quizCheck, error: quizCheckError } = await supabase
      .from('quiz_questions')
      .select('quiz_id')
      .eq('id', questionId)
      .eq('quiz_id', session.quiz_id)
      .single();

    if (quizCheckError || !quizCheck) {
      log.warn(`Question ${questionId} does not belong to quiz ${session.quiz_id}`);
      return apiError(
        'INVALID_REQUEST',
        400,
        'This question does not belong to the current session',
      );
    }

    // Check if answer is correct (case-sensitive string comparison)
    const isCorrect = answer === question.correct_answer;

    // Calculate response time in milliseconds
    let responseTimeMs = 0;
    if (session.question_started_at) {
      const questionStartTime = new Date(session.question_started_at).getTime();
      responseTimeMs = Math.max(0, Date.now() - questionStartTime);
    }

    // UPSERT into live_quiz_responses (in case of double-submit)
    const { data: responseData, error: upsertError } = await supabase
      .from('live_quiz_responses')
      .upsert(
        {
          session_id: session.id,
          student_id: studentId,
          question_id: questionId,
          answer,
          is_correct: isCorrect,
          response_time_ms: responseTimeMs,
          submitted_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id, student_id, question_id',
        },
      )
      .select()
      .single();

    if (upsertError) {
      log.error('Failed to insert response:', upsertError);
      return apiError('INSERT_FAILED', 500, 'Failed to submit answer');
    }

    // Update participant: increment score if correct, update last_activity
    if (isCorrect) {
      const points = question.points || 100;

      // Fetch current participant record
      const { data: participant, error: fetchError } = await supabase
        .from('live_quiz_participants')
        .select('current_score, questions_answered')
        .eq('session_id', session.id)
        .eq('student_id', studentId)
        .single();

      if (!fetchError && participant) {
        // Calculate new values
        const newScore = (participant.current_score || 0) + points;
        const newQuestionsAnswered = (participant.questions_answered || 0) + 1;

        // Update with new values
        const { error: updateError } = await supabase
          .from('live_quiz_participants')
          .update({
            current_score: newScore,
            questions_answered: newQuestionsAnswered,
            last_activity: new Date().toISOString(),
          })
          .eq('session_id', session.id)
          .eq('student_id', studentId);

        if (updateError) {
          log.warn(`Failed to update score for student ${studentId}:`, updateError);
          // Don't fail the response — answer was recorded, just score wasn't updated
        }
      } else {
        log.warn(`Failed to fetch participant for student ${studentId}:`, fetchError);
      }
    } else {
      // Still update last_activity for incorrect answers
      const { error: activityError } = await supabase
        .from('live_quiz_participants')
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq('session_id', session.id)
        .eq('student_id', studentId);

      if (activityError) {
        log.warn(`Failed to update last_activity for student ${studentId}:`, activityError);
      }
    }

    log.info(
      `✅ Answer submitted for session ${session.id}: student=${studentId}, question=${questionId}, correct=${isCorrect}, responseTime=${responseTimeMs}ms`,
    );

    return apiSuccess(
      {
        data: {
          isCorrect,
          correctAnswer: question.correct_answer,
          explanation: question.explanation || '',
          responseTime: responseTimeMs,
          pointsAwarded: isCorrect ? question.points || 100 : 0,
        },
      },
      200,
    );
  } catch (error) {
    log.error('Unexpected error in submit-answer endpoint:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to submit answer');
  }
}
