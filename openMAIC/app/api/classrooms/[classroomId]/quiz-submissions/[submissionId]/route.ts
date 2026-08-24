/**
 * API: Specific Quiz Submission
 * GET: Retrieve submission details with answers
 * PATCH: Update submission status (instructor only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { z } from 'zod';
import {
  getSubmission,
  updateSubmissionStatus,
  getSubmissionGradingStatus,
} from '@/lib/ilt/db/submissions';
import type { QuizSubmissionStatus } from '@/lib/ilt/types/models';


// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateStatusSchema = z.object({
  status: z.enum(['in_progress', 'submitted', 'graded']),
});

// ============================================================================
// ERROR HELPERS
// ============================================================================

function errorResponse(code: string, message: string, status: number = 400, details?: unknown) {
  const errorObj: any = { code, message };
  if (details) {
    errorObj.details = details;
  }
  return NextResponse.json(
    { error: errorObj },
    { status },
  );
}

function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.split('Bearer ')[1];
  if (!token) {
    throw new Error('Missing authorization header');
  }

  const {
    data: { user },
    error,
  } = await getSupabaseClient().auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

/**
 * Check if user is instructor of the classroom
 */
async function isInstructor(classroomId: string, userId: string): Promise<boolean> {
  const { data } = await getSupabaseClient()
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('instructor_id', userId)
    .single();

  return !!data;
}

// ============================================================================
// GET: Retrieve Specific Submission
// ============================================================================

/**
 * GET /api/classrooms/[id]/quiz-submissions/[submissionId]
 * Retrieve submission details with all answers
 * Students can see their own, instructors can see all
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string; submissionId: string }> },
) {
  const { classroomId, submissionId } = await params;
  try {
    const user = await getAuthUser(request);

    // Fetch submission
    const result = await getSubmission(submissionId);

    // Check authorization
    const isOwnSubmission = result.submission.student_id === user.id;
    const isInstructorOfClass = await isInstructor(classroomId, user.id);

    if (!isOwnSubmission && !isInstructorOfClass) {
      return errorResponse(
        'FORBIDDEN',
        'You do not have access to this submission',
        403,
      );
    }

    // Verify submission belongs to this classroom
    if (result.submission.classroom_id !== classroomId) {
      return errorResponse(
        'NOT_FOUND',
        'Submission not found in this classroom',
        404,
      );
    }

    // Get grading status
    const gradingStatus = await getSubmissionGradingStatus(submissionId);

    // Log access
    await getSupabaseClient()
      .from('audit_logs')
      .insert({
        classroom_id: classroomId,
        actor_id: user.id,
        action: 'submission_details_viewed',
        resource_type: 'quiz_submission',
        resource_id: submissionId,
        details: {
          is_owner: isOwnSubmission,
          is_instructor: isInstructorOfClass,
          accessed_at: new Date().toISOString(),
        },
      });

    return successResponse({
      submission: result.submission,
      answers: result.answers,
      grading_status: gradingStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Submission not found';

    if (message.includes('permission')) {
      return errorResponse('FORBIDDEN', 'You do not have access to this classroom', 403);
    }

    console.error('[GET /classrooms/:id/quiz-submissions/:submissionId]', error);
    return errorResponse('NOT_FOUND', message, 404);
  }
}

// ============================================================================
// PATCH: Update Submission Status
// ============================================================================

/**
 * PATCH /api/classrooms/[id]/quiz-submissions/[submissionId]
 * Update submission status (instructor only)
 * Used to mark as graded after AI grading completes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string; submissionId: string }> },
) {
  const { classroomId, submissionId } = await params;
  try {
    const user = await getAuthUser(request);
    const body = await request.json();

    // Validate request
    const validData = UpdateStatusSchema.parse(body);

    // Check authorization: instructor only
    const isInstructorOfClass = await isInstructor(classroomId, user.id);
    if (!isInstructorOfClass) {
      return errorResponse(
        'FORBIDDEN',
        'Only instructors can update submission status',
        403,
      );
    }

    // Fetch submission to verify it exists and belongs to classroom
    const { data: submission } = await getSupabaseClient()
      .from('quiz_submissions')
      .select('id, classroom_id, status')
      .eq('id', submissionId)
      .single();

    if (!submission || submission.classroom_id !== classroomId) {
      return errorResponse('NOT_FOUND', 'Submission not found in this classroom', 404);
    }

    // Validate status transition
    const validTransitions: Record<string, QuizSubmissionStatus[]> = {
      in_progress: ['submitted', 'graded'],
      submitted: ['in_progress', 'graded'],
      graded: [],
    };

    if (!validTransitions[submission.status].includes(validData.status)) {
      return errorResponse(
        'INVALID_STATE',
        `Cannot transition from ${submission.status} to ${validData.status}`,
        409,
      );
    }

    // Update status
    const updated = await updateSubmissionStatus(submissionId, validData.status);

    // Log audit event
    await getSupabaseClient()
      .from('audit_logs')
      .insert({
        classroom_id: classroomId,
        actor_id: user.id,
        action: 'submission_status_updated',
        resource_type: 'quiz_submission',
        resource_id: submissionId,
        details: {
          from_status: submission.status,
          to_status: validData.status,
          updated_by: 'instructor',
        },
      });

    return successResponse({
      submission: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update submission';

    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid status value', 400, error.issues[0]);
    }

    if (message.includes('permission')) {
      return errorResponse('FORBIDDEN', 'You do not have access to this classroom', 403);
    }

    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', 'Submission not found', 404);
    }

    console.error('[PATCH /classrooms/:id/quiz-submissions/:submissionId]', error);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
