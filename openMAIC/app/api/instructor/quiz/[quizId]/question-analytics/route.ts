/**
 * GET /api/instructor/quiz/[quizId]/question-analytics
 * Get question-level analytics for a quiz
 * REQUIRES: Instructor authentication
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     question_analytics: [
 *       {
 *         question_id: string,
 *         question_text: string,
 *         question_number: number,
 *         total_attempts: number,
 *         correct_count: number,
 *         correct_percentage: number,
 *         average_time_seconds: number
 *       }
 *     ],
 *     avg_time_per_question: number
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('GetQuestionAnalytics');

interface QuestionData {
  question_id: string;
  question_text: string;
  question_number: number;
  correct: number;
  attempted_at: string;
  duration_seconds: number | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
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

    const { quizId } = await params;
    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Verify quiz belongs to this instructor
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id')
      .eq('id', quizId)
      .eq('instructor_id', authenticatedInstructor.id)
      .single();

    if (quizError || !quiz) {
      log.warn(
        `FORBIDDEN: Instructor ${authenticatedInstructor.email} attempted to view analytics for quiz ${quizId} they don't own`,
      );
      return apiError('FORBIDDEN', 403, 'You do not have permission to view this quiz');
    }

    // Get all questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, question_number')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError) {
      log.error('Failed to fetch questions:', questionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch questions');
    }

    if (!questions || questions.length === 0) {
      return apiSuccess({
        success: true,
        data: {
          question_analytics: [],
          avg_time_per_question: 0,
        },
      });
    }

    // Get all responses for questions in this quiz
    const { data: responses, error: responsesError } = await supabase
      .from('question_responses')
      .select(
        `
        id,
        question_id,
        correct,
        quiz_attempts!inner (
          id,
          duration_seconds,
          attempted_at,
          quiz_id
        )
      `,
      )
      .eq('quiz_attempts.quiz_id', quizId);

    if (responsesError) {
      log.error('Failed to fetch responses:', responsesError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch responses');
    }

    // Process analytics for each question
    const questionAnalytics = questions.map((question: any) => {
      const questionResponses = (responses || []).filter(
        (r: any) => r.question_id === question.id && r.quiz_attempts?.quiz_id === quizId,
      );

      const correctCount = questionResponses.filter((r: any) => r.correct === true).length;
      const totalAttempts = questionResponses.length;
      const correctPercentage =
        totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

      // Calculate average time for this specific question
      const timesForQuestion = questionResponses
        .map((r: any) => r.quiz_attempts?.duration_seconds)
        .filter((t: any) => t !== null && t !== undefined);

      const averageTimeSeconds =
        timesForQuestion.length > 0
          ? timesForQuestion.reduce((a: number, b: number) => a + b, 0) / timesForQuestion.length / (question.question_number || 1)
          : 0;

      return {
        question_id: question.id,
        question_text: question.question_text,
        question_number: question.question_number,
        total_attempts: totalAttempts,
        correct_count: correctCount,
        correct_percentage: correctPercentage,
        average_time_seconds: Math.max(0, averageTimeSeconds),
      };
    });

    // Calculate overall average time per question
    const allDurations = (responses || [])
      .map((r: any) => r.quiz_attempts?.duration_seconds)
      .filter((d: any) => d !== null && d !== undefined);

    const avgTimePerQuestion =
      allDurations.length > 0 && questions.length > 0
        ? allDurations.reduce((a: number, b: number) => a + b, 0) / allDurations.length / questions.length
        : 0;

    log.info(`Fetched analytics for ${questions.length} questions in quiz ${quizId}`);

    return apiSuccess({
      success: true,
      data: {
        question_analytics: questionAnalytics,
        avg_time_per_question: Math.max(0, avgTimePerQuestion),
      },
    });
  } catch (error) {
    log.error('Error getting question analytics:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get analytics');
  }
}
