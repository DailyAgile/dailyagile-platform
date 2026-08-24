/**
 * Quiz Submissions API
 * GET: Fetch all submissions for a classroom with answer details
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('QuizSubmissionsAPI');

interface QuizAnswer {
  id: string;
  question_id: string;
  question_type?: string;
  user_answer: string;
  points: number;
  points_earned?: number;
  feedback?: string;
  ai_score?: number;
  ai_feedback?: string;
  ai_graded_at?: string;
  instructor_score?: number;
  instructor_feedback?: string;
  graded_by?: string;
  reviewed_at?: string;
  is_instructor_graded: boolean;
}

interface QuizSubmission {
  id: string;
  classroom_id: string;
  student_id: string;
  scene_id: string;
  submitted_at: string;
  score?: number;
  percentage?: number;
  answers?: QuizAnswer[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    // Fetch submissions for classroom with answers
    const { data: submissions, error: submissionsError } = await getSupabaseClient()
      .from('quiz_submissions')
      .select(
        `
        id,
        classroom_id,
        student_id,
        scene_id,
        submitted_at,
        score,
        percentage,
        quiz_answers (
          id,
          question_id,
          question_type,
          user_answer,
          points,
          points_earned,
          feedback,
          ai_score,
          ai_feedback,
          ai_graded_at,
          instructor_score,
          instructor_feedback,
          graded_by,
          reviewed_at,
          is_instructor_graded
        )
      `
      )
      .eq('classroom_id', classroomId)
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      log.error('Failed to fetch submissions:', submissionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch submissions');
    }

    // Transform data to match expected interface
    const formattedSubmissions: QuizSubmission[] = (submissions || []).map((sub: any) => ({
      id: sub.id,
      classroom_id: sub.classroom_id,
      student_id: sub.student_id,
      scene_id: sub.scene_id,
      submitted_at: sub.submitted_at,
      score: sub.score,
      percentage: sub.percentage,
      answers: (sub.quiz_answers || []).map((answer: any) => ({
        id: answer.id,
        question_id: answer.question_id,
        question_type: answer.question_type,
        user_answer: answer.user_answer,
        points: answer.points,
        points_earned: answer.points_earned,
        feedback: answer.feedback,
        ai_score: answer.ai_score,
        ai_feedback: answer.ai_feedback,
        ai_graded_at: answer.ai_graded_at,
        instructor_score: answer.instructor_score,
        instructor_feedback: answer.instructor_feedback,
        graded_by: answer.graded_by,
        reviewed_at: answer.reviewed_at,
        is_instructor_graded: answer.is_instructor_graded || false,
      })),
    }));

    log.info(`Fetched ${formattedSubmissions.length} submissions for classroom ${classroomId}`);

    return apiSuccess({
      submissions: formattedSubmissions,
      count: formattedSubmissions.length,
    });
  } catch (error) {
    log.error('Quiz submissions API error:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quiz submissions');
  }
}
