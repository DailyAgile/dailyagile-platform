/**
 * Session Service
 * Shared business logic for quiz session operations (start, submit, complete)
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('SessionService');

/**
 * Start quiz session
 * Validates assignment expiry and attempt limits
 */
export async function startQuizSession(
  assignmentId: string,
  studentId: string
) {
  try {
    const supabase = getSupabaseClient();

    // Get assignment with quiz info
    const { data: assignment, error: assignError } = await supabase
      .from('quiz_assignments')
      .select(
        `
        *,
        quizzes!inner(
          id,
          attempt_limit,
          time_limit_minutes
        )
      `
      )
      .eq('id', assignmentId)
      .eq('is_active', true)
      .single();

    if (assignError || !assignment) {
      log.warn(`Assignment not found: ${assignmentId}`);
      return { error: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment not found' };
    }

    // Check expiry
    const now = new Date();
    const expiryDate = new Date(assignment.expires_at);
    if (now >= expiryDate) {
      log.warn(`Assignment expired: ${assignmentId}`);
      return { error: 'ASSIGNMENT_EXPIRED', message: 'This assignment has expired' };
    }

    // Check attempt limit
    const { count: attemptCount, error: countError } = await supabase
      .from('quiz_sessions')
      .select('id', { count: 'exact' })
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .eq('status', 'completed');

    if (countError) {
      log.error('Error counting attempts:', countError);
      return { error: 'INTERNAL_ERROR', message: 'Failed to check attempt limit' };
    }

    const attemptLimit = assignment.quizzes[0]?.attempt_limit || 1;
    if ((attemptCount || 0) >= attemptLimit) {
      log.warn(`Attempt limit exceeded for student ${studentId} on assignment ${assignmentId}`);
      return { error: 'ATTEMPT_LIMIT_EXCEEDED', message: 'You have reached the maximum number of attempts' };
    }

    // Get next attempt number
    const { data: attempts, error: attemptNumError } = await supabase
      .from('quiz_sessions')
      .select('attempt_number')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (attemptNumError) {
      log.error('Error getting attempt number:', attemptNumError);
      return { error: 'INTERNAL_ERROR', message: 'Failed to start session' };
    }

    const nextAttempt = ((attempts?.[0]?.attempt_number) || 0) + 1;

    // Get quiz snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('quiz_snapshots')
      .select('*')
      .eq('assignment_id', assignmentId)
      .single();

    if (snapError || !snapshot) {
      log.error('Error fetching snapshot:', snapError);
      return { error: 'INTERNAL_ERROR', message: 'Failed to load quiz' };
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        assignment_id: assignmentId,
        quiz_id: assignment.quiz_id,
        student_id: studentId,
        quiz_snapshot_id: snapshot.id,
        status: 'in_progress',
        attempt_number: nextAttempt,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (assignment.quizzes[0]?.time_limit_minutes || 60) * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      log.error('Error creating session:', sessionError);
      return { error: 'SESSION_CREATION_FAILED', message: 'Failed to start quiz' };
    }

    log.info(`✅ Quiz session started: ${session.id} (attempt ${nextAttempt})`);

    return {
      success: true,
      data: {
        session_id: session.id,
        attempt_number: nextAttempt,
        time_limit_minutes: assignment.quizzes[0]?.time_limit_minutes || 60,
        quiz_snapshot: snapshot.quiz_definition,
      },
    };
  } catch (error) {
    log.error('Error in startQuizSession:', error);
    return { error: 'INTERNAL_ERROR', message: 'Internal server error' };
  }
}

/**
 * Get active quiz session
 */
export async function getActiveSession(sessionId: string, studentId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .select(
        `
        *,
        quiz_snapshots(
          quiz_definition
        )
      `
      )
      .eq('id', sessionId)
      .eq('student_id', studentId)
      .eq('status', 'in_progress')
      .single();

    if (error || !session) {
      log.warn(`Active session not found: ${sessionId}`);
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const expiryDate = new Date(session.expires_at);
    if (now >= expiryDate) {
      log.warn(`Session expired: ${sessionId}`);
      return null;
    }

    return session;
  } catch (error) {
    log.error('Error in getActiveSession:', error);
    return null;
  }
}

/**
 * Submit answer to question
 */
export async function submitAnswer(
  sessionId: string,
  studentId: string,
  questionId: string,
  userAnswer: string | string[],
  timeSpentSeconds?: number
) {
  try {
    const supabase = getSupabaseClient();

    // Verify session is active
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, assignment_id, status')
      .eq('id', sessionId)
      .eq('student_id', studentId)
      .eq('status', 'in_progress')
      .single();

    if (sessionError || !session) {
      log.warn(`Session not active: ${sessionId}`);
      return null;
    }

    // Get snapshot to find the question
    const { data: snapshot, error: snapError } = await supabase
      .from('quiz_snapshots')
      .select('quiz_definition')
      .eq('assignment_id', session.assignment_id)
      .single();

    if (snapError || !snapshot) {
      log.error('Error fetching snapshot:', snapError);
      return null;
    }

    const quizDef = snapshot.quiz_definition;
    const question = quizDef.questions.find((q: any) => q.id === questionId);

    if (!question) {
      log.warn(`Question not found in snapshot: ${questionId}`);
      return null;
    }

    // Determine if answer is correct
    const normalizedAnswer = Array.isArray(userAnswer)
      ? userAnswer.map(a => String(a).toUpperCase()).sort()
      : String(userAnswer).toUpperCase();

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
        session_id: sessionId,
        question_id: questionId,
        question_text: question.question,
        user_answer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
        correct_answer: String(question.correct_answer),
        is_correct: isCorrect,
        points_earned: pointsEarned,
        max_points: question.points || 10,
        feedback: question.explanation || null,
        time_spent_seconds: timeSpentSeconds,
      })
      .select()
      .single();

    if (answerError) {
      log.error('Error inserting answer:', answerError);
      return null;
    }

    log.info(`✅ Answer submitted: ${sessionId} - Q${questionId} (correct: ${isCorrect})`);

    return {
      answer_id: answer.id,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      feedback: answer.feedback,
    };
  } catch (error) {
    log.error('Error in submitAnswer:', error);
    return null;
  }
}

/**
 * Complete quiz session and calculate score
 */
export async function completeQuizSession(
  sessionId: string,
  studentId: string
) {
  try {
    const supabase = getSupabaseClient();

    // Verify session exists and belongs to student
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', studentId)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found: ${sessionId}`);
      return null;
    }

    if (session.status !== 'in_progress') {
      log.warn(`Session not in progress: ${sessionId}`);
      return null;
    }

    // Calculate total score from answers
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('points_earned, max_points')
      .eq('session_id', sessionId);

    if (answersError) {
      log.error('Error fetching answers:', answersError);
      return null;
    }

    const totalPoints = answers?.reduce((sum: number, a: any) => sum + (a.max_points || 0), 0) || 0;
    const earnedPoints = answers?.reduce((sum: number, a: any) => sum + (a.points_earned || 0), 0) || 0;
    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Get pass threshold from assignment/quiz
    const { data: assignment, error: assignError } = await supabase
      .from('quiz_assignments')
      .select(
        `
        quiz_id,
        quizzes!inner(
          pass_threshold
        )
      `
      )
      .eq('id', session.assignment_id)
      .single();

    if (assignError) {
      log.error('Error fetching assignment:', assignError);
      return null;
    }

    const passThreshold = assignment?.quizzes?.[0]?.pass_threshold || 70;
    const isPassed = percentage >= passThreshold;

    // Update session with completion info
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
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      log.error('Error updating session:', updateError);
      return null;
    }

    log.info(`✅ Quiz completed: ${sessionId} (${percentage}% - ${isPassed ? 'PASSED' : 'FAILED'})`);

    return {
      session_id: sessionId,
      total_score: earnedPoints,
      max_score: totalPoints,
      percentage,
      is_passed: isPassed,
      pass_threshold: passThreshold,
      answer_count: answers?.length || 0,
    };
  } catch (error) {
    log.error('Error in completeQuizSession:', error);
    return null;
  }
}

/**
 * Get session results (for student)
 */
export async function getSessionResults(sessionId: string, studentId: string) {
  try {
    const supabase = getSupabaseClient();

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', studentId)
      .single();

    if (sessionError || !session) {
      log.warn(`Session not found: ${sessionId}`);
      return null;
    }

    // Get answers
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('session_id', sessionId);

    if (answersError) {
      log.error('Error fetching answers:', answersError);
      return null;
    }

    return {
      session,
      answers: answers || [],
    };
  } catch (error) {
    log.error('Error in getSessionResults:', error);
    return null;
  }
}
