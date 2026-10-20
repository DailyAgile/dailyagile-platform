/**
 * Quiz Submissions API
 * GET: Fetch all submissions for a classroom with answer details
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize, canManage, requireStudentOrStaff } from '@/lib/server/route-guards';
import { requireInstructor } from '@/lib/server/auth-middleware';
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

    const caller = await authorize(req, requireInstructor);
    if (caller instanceof NextResponse) return caller;
    const { data: classroom } = await getSupabaseClient()
      .from('classrooms')
      .select('instructor_id')
      .eq('id', classroomId)
      .single();
    if (!canManage(caller, classroom?.instructor_id)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Create Supabase client

    // Fetch submissions for classroom with answers
    // Attempts live in student_quiz_history. A classroom's submissions are the attempts on its quizzes.
    const supabase = getSupabaseClient();
    const { data: classQuizzes } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('classroom_id', classroomId);
    const quizIds = (classQuizzes || []).map((q: { id: string }) => q.id);
    const titleById = new Map((classQuizzes || []).map((q: { id: string; title: string }) => [q.id, q.title]));

    const { data: attempts, error: submissionsError } = quizIds.length
      ? await supabase
          .from('student_quiz_history')
          .select('id, student_id, quiz_id, score, percentage, attempted_at, answers')
          .in('quiz_id', quizIds)
          .order('attempted_at', { ascending: false })
      : { data: [], error: null };

    if (submissionsError) {
      log.error('Failed to fetch submissions:', submissionsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch submissions');
    }

    const submissions = (attempts || []).map((a: {
      id: string; student_id: string; quiz_id: string; score: number; percentage: number | null; attempted_at: string;
      answers: Array<{ question_id: string; user_answer: string | null; is_correct: boolean }> | null;
    }) => ({
      id: a.id,
      classroom_id: classroomId,
      student_id: a.student_id,
      scene_id: titleById.get(a.quiz_id) ?? a.quiz_id,
      submitted_at: a.attempted_at,
      score: a.score,
      percentage: a.percentage,
      quiz_answers: (Array.isArray(a.answers) ? a.answers : []).map((ans, index) => ({
        id: `${a.id}-${index}`,
        question_id: ans.question_id,
        question_type: 'single',
        user_answer: ans.user_answer,
        points: 10,
        points_earned: ans.is_correct ? 10 : 0,
        feedback: null,
        ai_score: null,
        ai_feedback: null,
        ai_graded_at: null,
        instructor_score: null,
        instructor_feedback: null,
        graded_by: null,
        reviewed_at: null,
        is_instructor_graded: false,
      })),
    }));

    // Transform data to match expected interface
    const formattedSubmissions: QuizSubmission[] = submissions.map((sub: any) => ({
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
