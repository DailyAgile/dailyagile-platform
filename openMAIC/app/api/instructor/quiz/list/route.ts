/**
 * List Instructor's Quizzes
 * GET /api/instructor/quiz/list
 * Returns all quizzes created by the authenticated instructor
 * REQUIRES: Instructor authentication (JWT token)
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('ListInstructorQuizzes');

interface QuizRecord {
  id: string;
  quiz_code: string;
  title: string;
  total_questions: number;
  total_points: number;
  created_at: string;
  is_published: boolean;
  instructor_id: string;
}

interface AssignmentRecord {
  quiz_id: string;
  id: string;
}

interface CompletionRecord {
  quiz_id: string;
  id: string;
}

interface EnrichedQuiz {
  id: string;
  quiz_code: string;
  title: string;
  total_questions: number;
  total_points: number;
  created_at: string;
  is_published: boolean;
  assignment_count: number;
  completed_count: number;
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

    // 🔒 AUTHORIZATION: Fetch only quizzes created by this instructor
    // Exclude soft-deleted quizzes
    const { data: quizzes, error } = await getSupabaseClient()
      .from('quizzes')
      .select('id, quiz_code, title, total_questions, total_points, created_at, is_published, instructor_id')
      .eq('instructor_id', authenticatedInstructor.id)
      .is('deleted_at', null) // Only active quizzes
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching quizzes:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to load quizzes');
    }

    // Fetch assignment counts for each quiz
    const { data: assignmentCounts, error: countError } = await getSupabaseClient()
      .from('quiz_assignments')
      .select('quiz_id, id');

    if (countError) {
      log.warn('Could not fetch assignment counts:', countError);
    }

    // Build assignment count map
    const assignmentCountMap = new Map<string, number>();
    assignmentCounts?.forEach((record: AssignmentRecord) => {
      const count = (assignmentCountMap.get(record.quiz_id) || 0) + 1;
      assignmentCountMap.set(record.quiz_id, count);
    });

    // Fetch completion counts from quiz_sessions table
    // Count all quiz_sessions records per quiz (represents completed attempts)
    const { data: completionCounts, error: completionError } = await getSupabaseClient()
      .from('quiz_sessions')
      .select('quiz_id, id')
      .eq('status', 'completed'); // Only count completed sessions

    if (completionError) {
      log.warn('Could not fetch completion counts:', completionError);
    }

    // Build completion count map
    const completionCountMap = new Map<string, number>();
    completionCounts?.forEach((record: CompletionRecord) => {
      const count = (completionCountMap.get(record.quiz_id) || 0) + 1;
      completionCountMap.set(record.quiz_id, count);
    });

    // Enrich quiz data with assignment and completion counts
    const enrichedQuizzes: EnrichedQuiz[] = (quizzes || []).map((quiz: QuizRecord) => ({
      id: quiz.id,
      quiz_code: quiz.quiz_code,
      title: quiz.title,
      total_questions: quiz.total_questions,
      total_points: quiz.total_points,
      created_at: quiz.created_at,
      is_published: quiz.is_published,
      assignment_count: assignmentCountMap.get(quiz.id) || 0,
      completed_count: completionCountMap.get(quiz.id) || 0,
    }));

    log.info(`Loaded ${enrichedQuizzes.length} quizzes for instructor ${authenticatedInstructor.email}`);

    return apiSuccess({
      success: true,
      data: {
        quizzes: enrichedQuizzes,
        total: enrichedQuizzes.length,
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
