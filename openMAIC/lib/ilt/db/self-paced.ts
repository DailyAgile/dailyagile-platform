/**
 * Self-Paced Classroom Management
 * Lazy-provisions and manages self-paced classroom enrollment
 * Allows self-paced quiz submissions to use the same Supabase backend as ILT
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('SelfPacedDB');

// Default instructor ID for self-paced classrooms (platform owner)
const SELF_PACED_INSTRUCTOR_ID = 'self-paced-platform';

/**
 * Ensure a self-paced classroom exists for the given stage
 * Uses UPSERT to prevent race conditions on lazy provisioning
 * Returns the classroom ID
 */
export async function ensureSelfPacedClassroom(
  supabase: SupabaseClient,
  stageId: string,
): Promise<string> {
  const classroomName = `Self-Paced: ${stageId}`;

  const { data, error } = await supabase
    .from('classrooms')
    .upsert(
      {
        name: classroomName,
        stage_id: stageId,
        instructor_id: SELF_PACED_INSTRUCTOR_ID,
        settings: {
          selfPaced: true,
          allowRetakes: true,
          showAnswersAfterSubmit: true,
        },
      },
      {
        onConflict: 'stage_id',
      },
    )
    .select('id')
    .single();

  if (error) {
    log.error(`Failed to ensure self-paced classroom for stage ${stageId}:`, error);
    throw error;
  }

  if (!data) {
    throw new Error(`No classroom returned for stage ${stageId}`);
  }

  log.debug(`Self-paced classroom ensured: ${data.id} for stage ${stageId}`);
  return data.id;
}

/**
 * Ensure a student is enrolled in a classroom
 * Uses UPSERT to prevent duplicate enrollments
 */
export async function ensureSelfPacedEnrollment(
  supabase: SupabaseClient,
  classroomId: string,
  studentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('student_rosters')
    .upsert(
      {
        classroom_id: classroomId,
        student_id: studentId,
        enrollment_status: 'active',
        enrolled_at: new Date().toISOString(),
      },
      {
        onConflict: 'classroom_id,student_id',
      },
    );

  if (error) {
    log.error(
      `Failed to ensure enrollment for student ${studentId} in classroom ${classroomId}:`,
      error,
    );
    throw error;
  }

  log.debug(`Student enrolled: ${studentId} in classroom ${classroomId}`);
}

/**
 * Get or create a student record by email
 * Returns the student ID
 */
export async function ensureStudent(
  supabase: SupabaseClient,
  email: string,
): Promise<string> {
  // First check if student exists
  const { data: existing } = await supabase
    .from('students')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new student
  const { data: newStudent, error } = await supabase
    .from('students')
    .insert({
      email,
      verified_at: new Date().toISOString(),
      is_verified: true,
    })
    .select('id')
    .single();

  if (error) {
    log.error(`Failed to create student with email ${email}:`, error);
    throw error;
  }

  if (!newStudent) {
    throw new Error(`No student record created for ${email}`);
  }

  log.debug(`Student created: ${newStudent.id} (${email})`);
  return newStudent.id;
}
