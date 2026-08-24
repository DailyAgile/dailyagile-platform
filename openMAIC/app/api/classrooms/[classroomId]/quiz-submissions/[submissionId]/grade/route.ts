/**
 * Grade Override API — Instructor Grading Enhancement
 * PATCH /api/classrooms/[classroomId]/quiz-submissions/[submissionId]/grade
 * Allows instructors to override AI grades with their assessment
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { verifyAndExtractUserId } from '@/lib/server/jwt-utils';

const log = createLogger('GradeOverride');


interface GradeOverrideRequest {
  question_id: string;
  instructor_score?: number;
  instructor_feedback?: string;
  reason_for_change?: 'grading_error' | 'rubric_clarification' | 'regrade_student_appeal' | 'other';
}

interface GradeOverrideResponse {
  question_id: string;
  before_score: number | null;
  after_score: number;
  graded_by: string;
  reviewed_at: string;
  audit_log_id: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string; submissionId: string }> },
) {
  const { classroomId, submissionId } = await params;
  try {
    const body = (await req.json()) as GradeOverrideRequest;

    // Get current user (instructor)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return apiError('MISSING_REQUIRED_FIELD', 401, 'Authorization header required');
    }

    // Extract user ID from JWT token
    const instructorId = verifyAndExtractUserId(authHeader);
    if (!instructorId) {
      return apiError('INVALID_REQUEST', 401, 'Invalid authorization token - could not extract user ID');
    }

    // Verify instructor owns this classroom
    const { data: classroom, error: classroomError } = await getSupabaseClient()
      .from('classrooms')
      .select('id, instructor_id')
      .eq('id', classroomId)
      .single();

    if (classroomError || !classroom) {
      return apiError('INVALID_REQUEST', 404, 'Classroom not found');
    }

    if (classroom.instructor_id !== instructorId) {
      return apiError('INVALID_REQUEST', 403, 'You do not have permission to grade this classroom');
    }

    // Verify submission exists and belongs to this classroom
    const { data: submission, error: submissionError } = await getSupabaseClient()
      .from('quiz_submissions')
      .select('id, classroom_id, student_id')
      .eq('id', submissionId)
      .eq('classroom_id', classroomId)
      .single();

    if (submissionError || !submission) {
      return apiError('INVALID_REQUEST', 404, 'Submission not found');
    }

    // Get current answer record
    const { data: currentAnswer, error: answerError } = await getSupabaseClient()
      .from('quiz_answers')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('question_id', body.question_id)
      .single();

    if (answerError || !currentAnswer) {
      return apiError('INVALID_REQUEST', 404, 'Answer record not found');
    }

    const beforeScore = currentAnswer.points_earned;

    // Update answer with instructor grade
    const { data: updatedAnswer, error: updateError } = await getSupabaseClient()
      .from('quiz_answers')
      .update({
        instructor_score: body.instructor_score,
        instructor_feedback: body.instructor_feedback,
        graded_by: instructorId,
        reviewed_at: new Date().toISOString(),
        is_instructor_graded: body.instructor_score !== undefined,
        grading_status: body.instructor_score !== undefined ? 'instructor_overridden' : 'instructor_reviewed',
      })
      .eq('id', currentAnswer.id)
      .select()
      .single();

    if (updateError) {
      log.error(`Failed to update grade for ${currentAnswer.id}:`, updateError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to save grade override');
    }

    const afterScore = updatedAnswer.effective_score;

    // Recalculate submission score
    await recalculateSubmissionScore(submissionId);

    // Send notification to student
    await notifyStudentOfGradeOverride(submission.student_id, body.instructor_feedback || '');

    log.info(
      `Grade override: submission ${submissionId}, Q ${body.question_id}, ${beforeScore} → ${afterScore}`,
    );

    return apiSuccess({
      question_id: body.question_id,
      before_score: beforeScore,
      after_score: afterScore,
      graded_by: instructorId,
      reviewed_at: updatedAnswer.reviewed_at,
      audit_log_id: updatedAnswer.id, // Simplified; real implementation tracks audit log ID
    });
  } catch (error) {
    log.error('Unexpected error in grade override:', error);
    return apiError('INTERNAL_ERROR', 500, 'An unexpected error occurred');
  }
}

/**
 * Recalculate submission total score after grade override
 */
async function recalculateSubmissionScore(submissionId: string): Promise<void> {
  // Aggregate all answers for this submission
  const { data: answers, error } = await getSupabaseClient()
    .from('quiz_answers')
    .select('effective_score, max_points')
    .eq('submission_id', submissionId);

  if (error) {
    log.warn(`Failed to recalculate score for ${submissionId}:`, error);
    return;
  }

  const totalScore = (answers || []).reduce((sum: number, a: any) => sum + (a.effective_score || 0), 0);
  const maxScore = (answers || []).reduce((sum: number, a: any) => sum + (a.max_points || 0), 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const { error: updateError } = await getSupabaseClient()
    .from('quiz_submissions')
    .update({
      score: totalScore,
      max_score: maxScore,
      percentage: percentage,
    })
    .eq('id', submissionId);

  if (updateError) {
    log.warn(`Failed to update submission score for ${submissionId}:`, updateError);
  }
}

/**
 * Notify student of grade override (email + in-app)
 */
async function notifyStudentOfGradeOverride(studentId: string, feedback: string): Promise<void> {
  try {
    // Get student email from database
    const { data: student, error: studentError } = await getSupabaseClient()
      .from('students')
      .select('email')
      .eq('id', studentId)
      .single();

    if (studentError || !student?.email) {
      log.warn(`Could not find student email for ${studentId}`);
      return;
    }

    // Send email notification
    await sendGradeOverrideEmail(student.email, studentId, feedback);

    log.info(`Grade override notification sent to ${student.email}`);
  } catch (error) {
    log.error(`Failed to notify student ${studentId}:`, error);
    // Don't throw — notifications are best-effort
  }
}

/**
 * Send grade override notification email
 */
async function sendGradeOverrideEmail(
  studentEmail: string,
  studentId: string,
  feedback: string,
): Promise<void> {
  try {
    // Call email notification API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-grade-notification`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail,
          studentId,
          feedback,
          timestamp: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    log.debug(`Email sent successfully to ${studentEmail}`);
  } catch (error) {
    log.warn(`Failed to send email to ${studentEmail}:`, error);
    // Continue anyway — grade override is already saved
  }
}
