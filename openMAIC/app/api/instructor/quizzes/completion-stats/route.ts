/**
 * Completion Stats Endpoint
 * GET /api/instructor/quizzes/completion-stats
 * Returns completion statistics for all of instructor's quizzes
 * REQUIRES: Instructor authentication (JWT token)
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('CompletionStats');

interface QuizRecord {
  id: string;
  quiz_code: string;
  title: string;
}

interface AssignmentRecord {
  quiz_id: string;
  id: string;
}

interface CompletionRecord {
  quiz_id: string;
  score: number;
  completed_at: string;
}

interface CompletionStats {
  quiz_id: string;
  quiz_code: string;
  title: string;
  assigned_count: number;
  completed_count: number;
  completion_percentage: number;
  avg_score: number | null;
  last_completion_date: string | null;
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let authenticatedInstructor;
    try {
      authenticatedInstructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const supabase = getSupabaseClient();

    // 🔒 AUTHORIZATION: Fetch only quizzes created by this instructor
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('id, quiz_code, title')
      .eq('instructor_id', authenticatedInstructor.id)
      .is('deleted_at', null); // Only active quizzes

    if (quizError) {
      log.error('Error fetching quizzes:', quizError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to load quizzes');
    }

    if (!quizzes || quizzes.length === 0) {
      log.info(`No quizzes found for instructor ${authenticatedInstructor.email}`);
      return apiSuccess({
        success: true,
        data: {
          stats: [],
          total_quizzes: 0,
        },
      });
    }

    const quizIds = quizzes.map((q: any) => (q as QuizRecord).id);

    // Fetch all assignments for these quizzes
    const { data: assignments, error: assignmentError } = await supabase
      .from('quiz_assignments')
      .select('quiz_id, id')
      .in('quiz_id', quizIds);

    if (assignmentError) {
      log.warn('Could not fetch assignments:', assignmentError);
    }

    // Build assignment count map
    const assignmentCountMap = new Map<string, number>();
    assignments?.forEach((record: AssignmentRecord) => {
      const count = (assignmentCountMap.get(record.quiz_id) || 0) + 1;
      assignmentCountMap.set(record.quiz_id, count);
    });

    // Fetch all completed sessions for these quizzes
    const { data: completions, error: completionError } = await supabase
      .from('quiz_sessions')
      .select('quiz_id, score, completed_at')
      .in('quiz_id', quizIds)
      .eq('status', 'completed');

    if (completionError) {
      log.warn('Could not fetch completions:', completionError);
    }

    // Build completion stats maps
    const completionCountMap = new Map<string, number>();
    const completionScoresMap = new Map<string, number[]>();
    const lastCompletionMap = new Map<string, string>();

    completions?.forEach((record: CompletionRecord) => {
      const count = (completionCountMap.get(record.quiz_id) || 0) + 1;
      completionCountMap.set(record.quiz_id, count);

      // Track scores
      const scores = completionScoresMap.get(record.quiz_id) || [];
      if (record.score !== null) {
        scores.push(record.score);
      }
      completionScoresMap.set(record.quiz_id, scores);

      // Track last completion date
      const lastDate = lastCompletionMap.get(record.quiz_id);
      if (!lastDate || new Date(record.completed_at) > new Date(lastDate)) {
        lastCompletionMap.set(record.quiz_id, record.completed_at);
      }
    });

    // Calculate stats for each quiz
    const stats: CompletionStats[] = (quizzes || []).map((quiz: QuizRecord) => {
      const assigned = assignmentCountMap.get(quiz.id) || 0;
      const completed = completionCountMap.get(quiz.id) || 0;
      const scores = completionScoresMap.get(quiz.id) || [];

      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : null;

      const completionPercentage =
        assigned > 0
          ? Math.round((completed / assigned) * 100)
          : 0;

      return {
        quiz_id: quiz.id,
        quiz_code: quiz.quiz_code,
        title: quiz.title,
        assigned_count: assigned,
        completed_count: completed,
        completion_percentage: completionPercentage,
        avg_score: avgScore,
        last_completion_date: lastCompletionMap.get(quiz.id) || null,
      };
    });

    log.info(
      `Calculated completion stats for ${stats.length} quizzes for instructor ${authenticatedInstructor.email}`
    );

    return apiSuccess({
      success: true,
      data: {
        stats,
        total_quizzes: stats.length,
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
