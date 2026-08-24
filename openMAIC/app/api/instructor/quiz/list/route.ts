/**
 * List Instructor's Quizzes
 * GET /api/instructor/quiz/list
 * Returns all quizzes created by the instructor
 */

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('ListInstructorQuizzes');


export async function GET() {
  try {
    // Fetch all quizzes ordered by creation date (newest first)
    // Exclude soft-deleted quizzes
    const { data: quizzes, error } = await getSupabaseClient()
      .from('quizzes')
      .select('id, quiz_code, title, total_questions, total_points, created_at, is_published')
      .is('deleted_at', null) // Only active quizzes
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching quizzes:', error);
      return NextResponse.json(
        { error: { message: 'Failed to load quizzes' } },
        { status: 500 }
      );
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
    assignmentCounts?.forEach((record: any) => {
      const count = (assignmentCountMap.get(record.quiz_id) || 0) + 1;
      assignmentCountMap.set(record.quiz_id, count);
    });

    // Enrich quiz data with assignment counts
    const enrichedQuizzes = (quizzes || []).map((quiz: any) => ({
      ...quiz,
      assignment_count: assignmentCountMap.get(quiz.id) || 0,
      completed_count: 0, // TODO: Calculate from quiz_submissions
    }));

    log.info(`Loaded ${enrichedQuizzes.length} quizzes`);

    return NextResponse.json({
      success: true,
      data: {
        quizzes: enrichedQuizzes,
        total: enrichedQuizzes.length,
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
