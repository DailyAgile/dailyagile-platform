/**
 * Create Quiz Assignment
 * POST /api/quiz/assignments/create
 * Instructor creates assignment for student(s) with expiry date
 */

import { NextRequest } from 'next/server';
import { requireInstructor, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createAssignment } from '@/lib/quiz/assignment-service';
import { isFeatureEnabled } from '@/lib/server/feature-flags';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('CreateAssignmentRoute');

interface CreateAssignmentRequest {
  quiz_id: string;
  expires_at: string; // ISO timestamp
  student_ids?: string[]; // Optional: specific students
  is_shareable?: boolean; // Optional: allow anyone with code to start
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify instructor is logged in
    let instructor;
    try {
      instructor = await requireInstructor(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // ⚠️ FEATURE FLAG
    const assignmentsEnabled = await isFeatureEnabled('quiz_assignments');
    if (!assignmentsEnabled) {
      log.warn(`Quiz assignments disabled for instructor ${instructor.email}`);
      return apiError('PROVIDER_DISABLED', 403, 'Quiz assignments are not enabled');
    }

    // 📥 VALIDATION
    const body = (await req.json()) as CreateAssignmentRequest;

    if (!body.quiz_id) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'quiz_id is required'
      );
    }

    if (!body.expires_at) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'expires_at is required'
      );
    }

    // Validate expiry is ISO timestamp and in future
    const expiryDate = new Date(body.expires_at);
    if (isNaN(expiryDate.getTime())) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'expires_at must be a valid ISO timestamp'
      );
    }

    if (expiryDate <= new Date()) {
      return apiError(
        'INVALID_TIME',
        400,
        'Expiry date must be in the future'
      );
    }

    // 💾 DATABASE: Create assignment(s)
    log.info(`Creating assignment for quiz ${body.quiz_id} by ${instructor.email}`);

    // If student_ids provided, create individual assignments; otherwise create shareable one
    if (body.student_ids && body.student_ids.length > 0) {
      // Create assignment per student
      const supabase = getSupabaseClient();
      const assignments = [];
      const errors = [];

      for (const studentId of body.student_ids) {
        const assignment = await createAssignment(
          body.quiz_id,
          instructor.email,
          body.expires_at,
          studentId,
          false
        );

        if (assignment) {
          assignments.push(assignment);
        } else {
          errors.push(`Failed to create assignment for student ${studentId}`);
        }
      }

      if (assignments.length === 0) {
        return apiError(
          'INTERNAL_ERROR',
          500,
          'Failed to create assignments'
        );
      }

      log.info(`✅ ${assignments.length} assignments created`);

      return apiSuccess({
        data: {
          assignments: assignments.map(a => ({
            assignment_id: a.id,
            assignment_code: a.assignment_code,
            student_id: a.student_id,
            expires_at: a.expires_at,
          })),
          total: assignments.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      }, 201);
    } else {
      // Create shareable assignment
      const assignment = await createAssignment(
        body.quiz_id,
        instructor.email,
        body.expires_at,
        undefined,
        body.is_shareable !== false
      );

      if (!assignment) {
        return apiError(
          'INTERNAL_ERROR',
          500,
          'Failed to create assignment'
        );
      }

      log.info(`✅ Shareable assignment created: ${assignment.id}`);

      return apiSuccess({
        data: {
          assignment_id: assignment.id,
          assignment_code: assignment.assignment_code,
          assignment_url: assignment.assignment_url,
          expires_at: assignment.expires_at,
          is_shareable: true,
        },
      }, 201);
    }
  } catch (error) {
    log.error('Error in POST /api/quiz/assignments/create:', error);
    return apiError('INTERNAL_ERROR', 500, 'Internal server error');
  }
}
