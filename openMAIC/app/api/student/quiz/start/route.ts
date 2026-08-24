/**
 * Start Quiz Session
 * POST /api/student/quiz/start
 *
 * Creates a new quiz session for a student
 * Supports both direct quiz_id (legacy) and assignment_code (new)
 *
 * 🔒 SECURITY: studentId extracted from JWT, not request body
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { getAssignmentByCode, checkAssignmentExpiry } from '@/lib/quiz/assignment-service';
import { getSnapshotForAssignment } from '@/lib/quiz/snapshot-service';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireStudent, handleAuthError } from '@/lib/server/auth-middleware';
import { requireStudentConsent } from '@/lib/server/consent-verification';

const log = createLogger('StartQuizSession');

interface StartQuizRequest {
  quiz_id?: string; // Legacy: direct quiz ID
  assignment_code?: string; // New: assignment code
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 SECURITY: Verify student is authenticated (studentId comes from JWT, not request)
    let authenticatedStudent;
    try {
      authenticatedStudent = await requireStudent(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    // 🔒 GDPR: Verify student has given privacy consent
    try {
      await requireStudentConsent(authenticatedStudent.id, 'privacy');
    } catch (consentError: any) {
      if (consentError.code === 'CONSENT_REQUIRED') {
        log.warn(`Consent required for student ${authenticatedStudent.id}`);
        return apiError(
          'CONSENT_REQUIRED',
          403,
          'You must accept our Privacy Policy to start a quiz. Please review and accept our terms before proceeding.'
        );
      }
      throw consentError;
    }

    const body = (await req.json()) as StartQuizRequest;
    const { quiz_id, assignment_code } = body;
    const student_id = authenticatedStudent.id; // Use authenticated student ID, not from request

    if (!quiz_id && !assignment_code) {
      return apiError('MISSING_FIELDS', 400, 'quiz_id or assignment_code is required');
    }

    const supabase = getSupabaseClient();
    let finalQuizId: string;
    let snapshotId: string | null = null;

    // Handle assignment-based access (new flow)
    if (assignment_code) {
      const assignment = await getAssignmentByCode(assignment_code);

      if (!assignment) {
        return apiError('NOT_FOUND', 404, 'Assignment code not found');
      }

      // Check expiry
      const isExpired = await checkAssignmentExpiry(assignment.id);
      if (isExpired) {
        return apiError(
          'FORBIDDEN',
          403,
          `Assignment expired on ${new Date(assignment.expires_at).toLocaleDateString()}`,
        );
      }

      finalQuizId = assignment.quiz_id;

      // Get snapshot for this assignment
      const snapshot = await getSnapshotForAssignment(assignment.id);
      if (snapshot) {
        snapshotId = snapshot.id;
      }
    } else {
      // Legacy: direct quiz_id access
      finalQuizId = quiz_id!;
    }

    // Verify quiz exists
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, total_questions, total_points, settings, classroom_id')
      .eq('id', finalQuizId)
      .single();

    if (quizError || !quiz) {
      return apiError('QUIZ_NOT_FOUND', 404, 'Quiz not found');
    }

    // Create quiz session
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: finalQuizId,
        quiz_snapshot_id: snapshotId || null,
        student_id,
        status: 'in_progress',
      })
      .select('id, started_at')
      .single();

    if (sessionError || !session) {
      log.error('Failed to create session:', sessionError);
      return apiError('SESSION_CREATION_FAILED', 500, 'Failed to start quiz session');
    }

    log.info(
      `Quiz session started: ${session.id} for student ${student_id} ${snapshotId ? '(from snapshot)' : ''}`,
    );

    return apiSuccess({
      session_id: session.id,
      quiz_id: finalQuizId,
      snapshot_id: snapshotId,
      title: quiz.title,
      total_questions: quiz.total_questions,
      total_points: quiz.total_points,
      started_at: session.started_at,
      settings: quiz.settings,
    });
  } catch (error) {
    log.error('Quiz start failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to start quiz');
  }
}
