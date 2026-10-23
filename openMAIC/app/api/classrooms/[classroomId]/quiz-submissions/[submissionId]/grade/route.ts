/**
 * PATCH /api/classrooms/[classroomId]/quiz-submissions/[submissionId]/grade
 * Instructor overrides the points for one answer in a student's attempt.
 *
 * Attempts are stored in student_quiz_history. Each answer in its `answers` array
 * can carry an instructor score; the attempt score is recalculated from those.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { authorize } from '@/lib/server/route-guards';
import { requireInstructor } from '@/lib/server/auth-middleware';

const log = createLogger('GradeOverride');

const POINTS_PER_QUESTION = 10;
const PASS_MARK = 70;

interface GradeOverrideRequest {
  question_id: string;
  instructor_score?: number;
  instructor_feedback?: string;
  reason_for_change?: 'grading_error' | 'rubric_clarification' | 'regrade_student_appeal' | 'other';
}

interface StoredAnswer {
  question_id: string;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  instructor_score?: number;
  instructor_feedback?: string;
  is_instructor_graded?: boolean;
  graded_by?: string;
  reviewed_at?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string; submissionId: string }> },
) {
  const { classroomId, submissionId } = await params;
  try {
    const instructor = await authorize(req, requireInstructor);
    if (instructor instanceof NextResponse) return instructor;

    const body = (await req.json()) as GradeOverrideRequest;
    if (!body.question_id) {
      return apiError('INVALID_REQUEST', 400, 'question_id is required');
    }

    const supabase = getSupabaseClient();

    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id, instructor_id')
      .eq('id', classroomId)
      .single();
    if (classroomError || !classroom) {
      return apiError('INVALID_REQUEST', 404, 'Classroom not found');
    }
    if (classroom.instructor_id !== instructor.id && instructor.role !== 'admin') {
      return apiError('INVALID_REQUEST', 403, 'You do not have permission to grade this classroom');
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('student_quiz_history')
      .select('id, student_id, quiz_id, answers')
      .eq('id', submissionId)
      .single();
    if (attemptError || !attempt) {
      return apiError('INVALID_REQUEST', 404, 'Submission not found');
    }

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('classroom_id')
      .eq('id', attempt.quiz_id)
      .single();
    if (!quiz || quiz.classroom_id !== classroomId) {
      return apiError('INVALID_REQUEST', 404, 'Submission not found');
    }

    const answers: StoredAnswer[] = Array.isArray(attempt.answers) ? attempt.answers : [];
    const index = answers.findIndex((a) => a.question_id === body.question_id);
    if (index === -1) {
      return apiError('INVALID_REQUEST', 404, 'Answer record not found');
    }

    const pointsOf = (a: StoredAnswer) =>
      a.is_instructor_graded && typeof a.instructor_score === 'number'
        ? a.instructor_score
        : a.is_correct
          ? POINTS_PER_QUESTION
          : 0;

    const beforeScore = pointsOf(answers[index]);
    const now = new Date().toISOString();
    const hasScore = typeof body.instructor_score === 'number';
    answers[index] = {
      ...answers[index],
      instructor_score: hasScore ? body.instructor_score : answers[index].instructor_score,
      instructor_feedback: body.instructor_feedback ?? answers[index].instructor_feedback,
      is_instructor_graded: hasScore,
      graded_by: instructor.id,
      reviewed_at: now,
    };
    const afterScore = pointsOf(answers[index]);

    // Recalculate the attempt total from the per-answer points.
    const total = answers.reduce((sum, a) => sum + pointsOf(a), 0);
    const maxScore = answers.length * POINTS_PER_QUESTION;
    const percentage = maxScore > 0 ? Math.round((total / maxScore) * 1000) / 10 : 0;

    const { error: updateError } = await supabase
      .from('student_quiz_history')
      .update({ answers, score: total, percentage, passed: percentage >= PASS_MARK })
      .eq('id', submissionId);
    if (updateError) {
      log.error(`Failed to save grade override for ${submissionId}:`, updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to save grade override');
    }

    log.info(`Grade override: attempt ${submissionId}, question ${body.question_id}, ${beforeScore} → ${afterScore}`);

    return apiSuccess({
      question_id: body.question_id,
      before_score: beforeScore,
      after_score: afterScore,
      attempt_score: total,
      graded_by: instructor.id,
      reviewed_at: now,
    });
  } catch (error) {
    log.error('Unexpected error in grade override:', error);
    return apiError('INTERNAL_ERROR', 500, 'An unexpected error occurred');
  }
}
