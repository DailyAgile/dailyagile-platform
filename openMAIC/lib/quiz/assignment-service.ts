/**
 * Assignment Service
 * Shared business logic for quiz assignment operations
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger('AssignmentService');

/**
 * Generate a unique assignment code
 */
export function generateAssignmentCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Create quiz snapshot (frozen copy of quiz definition)
 */
export async function createSnapshot(quizId: string, assignmentId: string) {
  try {
    const supabase = getSupabaseClient();

    // Get complete quiz definition
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      log.error('Error fetching quiz for snapshot:', quizError);
      return null;
    }

    // Get all questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);

    if (questionsError) {
      log.error('Error fetching questions for snapshot:', questionsError);
      return null;
    }

    // Create snapshot object
    const quizDefinition = {
      quiz,
      questions: questions || [],
    };

    // Calculate hash for integrity checking
    const snapshotHash = crypto
      .createHash('md5')
      .update(JSON.stringify(quizDefinition))
      .digest('hex');

    // Insert snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('quiz_snapshots')
      .insert({
        original_quiz_id: quizId,
        assignment_id: assignmentId,
        quiz_definition: quizDefinition,
        snapshot_hash: snapshotHash,
      })
      .select()
      .single();

    if (snapError) {
      log.error('Error creating snapshot:', snapError);
      return null;
    }

    log.info(`✅ Snapshot created for assignment: ${assignmentId}`);
    return snapshot;
  } catch (error) {
    log.error('Error in createSnapshot:', error);
    return null;
  }
}

/**
 * Create assignment
 */
export async function createAssignment(
  quizId: string,
  instructorEmail: string,
  expiresAt: string,
  studentId?: string,
  isShareable: boolean = false
) {
  try {
    const supabase = getSupabaseClient();

    // Verify quiz exists and instructor owns it
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz || quiz.instructor_id !== instructorEmail) {
      log.warn(`Unauthorized assignment creation for quiz ${quizId}`);
      return null;
    }

    // Verify expiry is in future
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) {
      log.warn(`Assignment expiry must be in future: ${expiresAt}`);
      return null;
    }

    const assignmentCode = generateAssignmentCode();

    // Create assignment
    const { data: assignment, error: assignError } = await supabase
      .from('quiz_assignments')
      .insert({
        quiz_id: quizId,
        instructor_id: instructorEmail,
        student_id: studentId || null,
        assignment_code: assignmentCode,
        assignment_url: `/quiz/${assignmentCode}`,
        expires_at: expiryDate.toISOString(),
        status: 'active',
        is_active: true,
      })
      .select()
      .single();

    if (assignError) {
      log.error('Error creating assignment:', assignError);
      return null;
    }

    // Create snapshot
    const snapshot = await createSnapshot(quizId, assignment.id);
    if (!snapshot) {
      log.warn(`Failed to create snapshot for assignment ${assignment.id}, but continuing`);
    }

    log.info(`✅ Assignment created: ${assignment.id} (code: ${assignmentCode})`);
    return assignment;
  } catch (error) {
    log.error('Error in createAssignment:', error);
    return null;
  }
}

/**
 * Get assignment with quiz details
 */
export async function getAssignmentWithQuiz(assignmentId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: assignment, error } = await supabase
      .from('quiz_assignments')
      .select(
        `
        *,
        quizzes!inner(
          id,
          title,
          description,
          total_questions,
          total_points,
          time_limit_minutes,
          attempt_limit,
          pass_threshold
        )
      `
      )
      .eq('id', assignmentId)
      .eq('is_active', true)
      .single();

    if (error || !assignment) {
      log.warn(`Assignment not found: ${assignmentId}`);
      return null;
    }

    return assignment;
  } catch (error) {
    log.error('Error in getAssignmentWithQuiz:', error);
    return null;
  }
}

/**
 * Get assignment by code
 */
export async function getAssignmentByCode(code: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: assignment, error } = await supabase
      .from('quiz_assignments')
      .select(
        `
        *,
        quizzes!inner(
          id,
          title,
          total_questions,
          total_points,
          time_limit_minutes,
          attempt_limit,
          pass_threshold
        )
      `
      )
      .eq('assignment_code', code)
      .eq('is_active', true)
      .single();

    if (error || !assignment) {
      log.warn(`Assignment not found by code: ${code}`);
      return null;
    }

    return assignment;
  } catch (error) {
    log.error('Error in getAssignmentByCode:', error);
    return null;
  }
}

/**
 * Extend assignment deadline
 */
export async function extendAssignment(
  assignmentId: string,
  instructorEmail: string,
  newExpiresAt: string
) {
  try {
    const supabase = getSupabaseClient();

    // Verify ownership and get current assignment
    const { data: assignment, error: checkError } = await supabase
      .from('quiz_assignments')
      .select('id, instructor_id')
      .eq('id', assignmentId)
      .single();

    if (checkError || !assignment || assignment.instructor_id !== instructorEmail) {
      log.warn(`Unauthorized extension attempt for assignment ${assignmentId}`);
      return null;
    }

    // Verify new expiry is in future
    const expiryDate = new Date(newExpiresAt);
    if (expiryDate <= new Date()) {
      log.warn(`Extension expiry must be in future: ${newExpiresAt}`);
      return null;
    }

    // Update assignment
    const { data: updated, error: updateError } = await supabase
      .from('quiz_assignments')
      .update({
        expires_at: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) {
      log.error('Error extending assignment:', updateError);
      return null;
    }

    log.info(`✅ Assignment extended: ${assignmentId}`);
    return updated;
  } catch (error) {
    log.error('Error in extendAssignment:', error);
    return null;
  }
}

/**
 * Approve extension
 */
export async function approveExtension(
  requestId: string,
  newExpiryDate: string,
  instructorEmail: string,
  notes?: string
) {
  try {
    const supabase = getSupabaseClient();

    // Get extension request and verify instructor owns quiz
    const { data: request, error: requestError } = await supabase
      .from('assignment_extension_requests')
      .select(
        `
        id,
        assignment_id,
        request_type,
        quiz_assignments!inner(
          id,
          instructor_id,
          quiz_id
        )
      `
      )
      .eq('id', requestId)
      .eq('quiz_assignments.instructor_id', instructorEmail)
      .single();

    if (requestError || !request) {
      log.warn(`Extension request not found or unauthorized: ${requestId}`);
      return null;
    }

    // Update extension request
    const { data: updated, error: updateError } = await supabase
      .from('assignment_extension_requests')
      .update({
        status: 'approved',
        approved_by: instructorEmail,
        approved_at: new Date().toISOString(),
        instructor_response: notes,
        new_expiry_date: new Date(newExpiryDate).toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      log.error('Error approving extension:', updateError);
      return null;
    }

    // Also update the assignment expiry if this is an extension request
    if (request.request_type === 'extension') {
      const { error: assignError } = await supabase
        .from('quiz_assignments')
        .update({
          expires_at: new Date(newExpiryDate).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.assignment_id);

      if (assignError) {
        log.error('Error updating assignment expiry:', assignError);
        return null;
      }
    }

    log.info(`✅ Extension approved: ${requestId}`);
    return updated;
  } catch (error) {
    log.error('Error in approveExtension:', error);
    return null;
  }
}

/**
 * Deny extension
 */
export async function denyExtension(
  requestId: string,
  reason: string,
  instructorEmail: string
) {
  try {
    const supabase = getSupabaseClient();

    // Get extension request and verify instructor owns quiz
    const { data: request, error: requestError } = await supabase
      .from('assignment_extension_requests')
      .select(
        `
        id,
        quiz_assignments!inner(
          instructor_id
        )
      `
      )
      .eq('id', requestId)
      .eq('quiz_assignments.instructor_id', instructorEmail)
      .single();

    if (requestError || !request) {
      log.warn(`Extension request not found or unauthorized: ${requestId}`);
      return null;
    }

    // Update extension request
    const { data: updated, error: updateError } = await supabase
      .from('assignment_extension_requests')
      .update({
        status: 'denied',
        approved_by: instructorEmail,
        approved_at: new Date().toISOString(),
        instructor_response: reason,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      log.error('Error denying extension:', updateError);
      return null;
    }

    log.info(`✅ Extension denied: ${requestId}`);
    return updated;
  } catch (error) {
    log.error('Error in denyExtension:', error);
    return null;
  }
}

/**
 * Check if assignment has expired
 */
export function checkAssignmentExpiry(expiresAt: string): boolean {
  const expiryDate = new Date(expiresAt);
  return expiryDate > new Date();
}

/**
 * Get student assignments
 */
export async function getStudentAssignments(studentId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: assignments, error } = await supabase
      .from('quiz_assignments')
      .select(
        `
        *,
        quizzes!inner(
          id,
          title,
          description,
          total_questions,
          total_points,
          time_limit_minutes,
          attempt_threshold
        )
      `
      )
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('expires_at', { ascending: true });

    if (error) {
      log.warn(`Failed to fetch assignments for student ${studentId}:`, error);
      return [];
    }

    return assignments || [];
  } catch (error) {
    log.error('Error in getStudentAssignments:', error);
    return [];
  }
}

/**
 * Request extension for assignment
 */
export async function requestExtension(
  assignmentId: string,
  studentId: string,
  reason?: string
) {
  try {
    const supabase = getSupabaseClient();

    // Verify student owns assignment
    const { data: assignment, error: checkError } = await supabase
      .from('quiz_assignments')
      .select('id, student_id')
      .eq('id', assignmentId)
      .single();

    if (checkError || !assignment || assignment.student_id !== studentId) {
      log.warn(`Unauthorized extension request for assignment ${assignmentId}`);
      return null;
    }

    // Create extension request
    const { data: request, error } = await supabase
      .from('assignment_extension_requests')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        request_type: 'extension',
        reason: reason || null,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating extension request:', error);
      return null;
    }

    log.info(`✅ Extension requested: ${request.id}`);
    return request;
  } catch (error) {
    log.error('Error in requestExtension:', error);
    return null;
  }
}

/**
 * Request new code for assignment
 */
export async function requestNewCode(
  assignmentId: string,
  studentId: string,
  reason?: string
) {
  try {
    const supabase = getSupabaseClient();

    // Verify student owns assignment
    const { data: assignment, error: checkError } = await supabase
      .from('quiz_assignments')
      .select('id, student_id')
      .eq('id', assignmentId)
      .single();

    if (checkError || !assignment || assignment.student_id !== studentId) {
      log.warn(`Unauthorized new code request for assignment ${assignmentId}`);
      return null;
    }

    // Create new code request
    const { data: request, error } = await supabase
      .from('assignment_extension_requests')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        request_type: 'new_code',
        reason: reason || null,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating new code request:', error);
      return null;
    }

    log.info(`✅ New code requested: ${request.id}`);
    return request;
  } catch (error) {
    log.error('Error in requestNewCode:', error);
    return null;
  }
}
