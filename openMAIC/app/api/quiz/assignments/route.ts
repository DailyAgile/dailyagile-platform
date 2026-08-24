/**
 * GET /api/quiz/assignments
 * Get assignments by code or for current student
 *
 * Query params:
 * - code: string (assignment code to access)
 * - studentId: string (get all assignments for student)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  getAssignmentByCode,
  getStudentAssignments,
} from '@/lib/quiz/assignment-service';
import { getSnapshotForAssignment } from '@/lib/quiz/snapshot-service';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('GetAssignments');

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const studentId = searchParams.get('studentId');

    // Get assignment by code (for clicking shared link)
    if (code) {
      const assignment = await getAssignmentByCode(code);

      if (!assignment) {
        return apiError('NOT_FOUND', 404, 'Assignment code not found');
      }

      // Check if expired
      if (assignment.status === 'expired') {
        return apiSuccess({
          success: true,
          data: {
            assignment,
            expired: true,
            message: `Assignment expired on ${new Date(assignment.expires_at).toLocaleDateString()}`,
          },
        });
      }

      // Get snapshot if it exists
      let snapshot = null;
      try {
        snapshot = await getSnapshotForAssignment(assignment.id);
      } catch (error) {
        log.warn('Failed to fetch snapshot:', error);
      }

      return apiSuccess({
        success: true,
        data: {
          assignment,
          snapshot: snapshot ? { id: snapshot.id } : null,
          expired: false,
        },
      });
    }

    // Get all assignments for student
    if (studentId) {
      const assignments = await getStudentAssignments(studentId);

      // Categorize into active and expired
      const active = assignments.filter(
        (a: any) => new Date(a.expires_at) > new Date() && a.status !== 'archived',
      );
      const expired = assignments.filter((a: any) => new Date(a.expires_at) <= new Date());
      const archived = assignments.filter((a: any) => a.status === 'archived');

      return apiSuccess({
        success: true,
        data: {
          active,
          expired,
          archived,
          total: assignments.length,
        },
      });
    }

    return apiError('MISSING_REQUIRED_FIELD', 400, 'code or studentId query param required');
  } catch (error) {
    log.error('Error getting assignments:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to fetch assignments');
  }
}
