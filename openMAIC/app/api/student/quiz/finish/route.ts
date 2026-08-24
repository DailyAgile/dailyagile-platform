/**
 * Finish Quiz & Get Results
 * POST /api/student/quiz/finish
 *
 * Finalizes quiz session and calculates final score
 * Returns all questions with answers, explanations, and source links
 *
 * 🔒 SECURITY: studentId verified from JWT (not client-supplied)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireStudent, handleAuthError } from '@/lib/server/auth-middleware';

const log = createLogger('FinishQuiz');

interface FinishQuizRequest {
  session_id: string;
}

interface QuestionResult {
  question_number: number;
  question: string;
  your_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  total_points: number;
  explanation: string;
  source_link: string;
  time_taken_seconds: number;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
  };
}

interface FinishQuizResponse {
  session_id: string;
  score: number;
  percentage: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  results: QuestionResult[];
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

    const body = (await req.json()) as FinishQuizRequest;
    const { session_id } = body;

    if (!session_id) {
      return apiError('MISSING_FIELDS', 400, 'session_id is required');
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Verify session exists
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

    // Get all responses for this session
    const { data: responses, error: responsesError } = await getSupabaseClient()
      .from('quiz_responses')
      .select('id, question_id, is_correct, quiz_questions(points)')
      .eq('session_id', session_id);

    if (responsesError) {
      log.error('Failed to fetch responses:', responsesError);
      return apiError('RESPONSES_FETCH_FAILED', 500, 'Failed to calculate quiz score');
    }

    // Calculate score
    let score = 0;
    let correctCount = 0;
    const responses_list = responses || [];

    responses_list.forEach((r: any) => {
      if (r.is_correct) {
        correctCount++;
        score += r.quiz_questions?.points || 10;
      }
    });

    // Get total points from quiz
    const { data: quiz_data } = await getSupabaseClient()
      .from('quizzes')
      .select('total_points, total_questions')
      .eq('id', session.quiz_id)
      .single();

    const totalPoints = quiz_data?.total_points || responses_list.length * 10;
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const totalCount = quiz_data?.total_questions || responses_list.length;

    // Update session with final score
    const { error: updateError } = await getSupabaseClient()
      .from('quiz_sessions')
      .update({
        score,
        percentage,
        submitted_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', session_id);

    if (updateError) {
      log.error('Failed to update session:', updateError);
      return apiError('SESSION_UPDATE_FAILED', 500, 'Failed to finalize quiz');
    }

    // Fetch all questions with responses and correct answers
    const { data: questionsWithAnswers, error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .select(
        `
        question_number,
        question,
        correct_answer,
        points,
        option_a,
        option_b,
        option_c,
        option_d,
        option_e,
        explanation,
        source_link,
        quiz_responses(selected_answer, time_taken_seconds)
      `,
      )
      .eq('quiz_id', session.quiz_id)
      .order('question_number', { ascending: true });

    if (questionsError || !questionsWithAnswers) {
      log.error('Failed to fetch questions:', questionsError);
      return apiError('QUESTIONS_FETCH_FAILED', 500, 'Failed to load quiz results');
    }

    // Format results
    const results: QuestionResult[] = questionsWithAnswers.map((q: any) => {
      const responses = q.quiz_responses || [];
      const response = responses.length > 0 ? responses[0] : null;
      const selectedAnswer = response?.selected_answer || null;
      const isCorrect = selectedAnswer === q.correct_answer;

      return {
        question_number: q.question_number,
        question: q.question,
        your_answer: selectedAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        points_earned: isCorrect ? q.points : 0,
        total_points: q.points,
        explanation: q.explanation,
        source_link: q.source_link,
        time_taken_seconds: response?.time_taken_seconds || 0,
        options: {
          a: q.option_a,
          b: q.option_b,
          c: q.option_c,
          d: q.option_d,
          e: q.option_e,
        },
      };
    });

    log.info(`Quiz finished: session ${session_id}, score ${score}/${totalPoints} (${percentage}%)`);

    const response: FinishQuizResponse = {
      session_id,
      score,
      percentage,
      total_points: results.reduce((sum, r) => sum + r.total_points, 0),
      correct_count: correctCount,
      total_questions: totalCount,
      results,
    };

    return apiSuccess(response);
  } catch (error) {
    log.error('Finish quiz failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to finish quiz');
  }
}
