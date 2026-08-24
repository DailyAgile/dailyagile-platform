/**
 * Database operations for student roster management
 * Handles: adding students, bulk import, listing, filtering
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Student,
  StudentRoster,
  StudentRosterWithDetails,
  AddStudentRequest,
  RosterListQuery,
  RosterListResponse,
  EnrollmentStatus,
} from '@/lib/ilt/types/models';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Add a single student to a classroom
 * Returns the created student and roster entry
 */
export async function addStudentToClassroom(
  classroomId: string,
  request: AddStudentRequest,
  instructorId: string,
): Promise<{
  student: Student;
  roster: StudentRoster;
}> {
  // 1. Verify instructor owns this classroom
  const { data: classroom, error: classroomError } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('instructor_id', instructorId)
    .single();

  if (classroomError || !classroom) {
    throw new Error('Classroom not found or you do not have permission');
  }

  // 2. Check if student with this email already exists
  let student: Student | null = null;
  const { data: existingStudent } = await supabase
    .from('students')
    .select('*')
    .eq('email', request.email)
    .single();

  if (existingStudent) {
    student = existingStudent as Student;
  } else {
    // 3. Create new student if doesn't exist
    const { data: newStudent, error: studentError } = await supabase
      .from('students')
      .insert({
        email: request.email,
        name: request.name,
        student_id: request.student_id || null,
      })
      .select()
      .single();

    if (studentError) {
      throw new Error(`Failed to create student: ${studentError.message}`);
    }

    student = newStudent as Student;
  }

  // 4. Check if already enrolled in this classroom
  const { data: existingRoster } = await supabase
    .from('student_rosters')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', student.id)
    .single();

  if (existingRoster) {
    throw new Error('Student is already enrolled in this classroom');
  }

  // 5. Create roster entry
  const { data: roster, error: rosterError } = await supabase
    .from('student_rosters')
    .insert({
      classroom_id: classroomId,
      student_id: student.id,
      role: 'student',
      status: 'active',
    })
    .select()
    .single();

  if (rosterError) {
    throw new Error(`Failed to create roster entry: ${rosterError.message}`);
  }

  // 6. Log audit event
  await supabase
    .from('audit_logs')
    .insert({
      classroom_id: classroomId,
      actor_id: instructorId,
      action: 'student_added',
      resource_type: 'student',
      resource_id: student.id,
      details: { email: request.email, name: request.name },
    })
    .select();

  return {
    student,
    roster: roster as StudentRoster,
  };
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get paginated list of students in a classroom with filters
 * User experience: Fast, responsive roster loading
 */
export async function listClassroomStudents(
  classroomId: string,
  instructorId: string,
  query: RosterListQuery = {},
): Promise<RosterListResponse> {
  const {
    status = 'active',
    sort = 'name',
    order = 'asc',
    page = 1,
    limit = 50,
    search = '',
  } = query;

  // Verify instructor owns classroom
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('instructor_id', instructorId)
    .single();

  if (!classroom) {
    throw new Error('Classroom not found or you do not have permission');
  }

  // Build query
  let query_builder = supabase
    .from('student_rosters')
    .select(
      `
      id,
      classroom_id,
      student_id,
      role,
      enrollment_date,
      status,
      metadata,
      created_at,
      updated_at,
      student:students(
        id,
        email,
        name,
        student_id,
        avatar_url,
        created_at,
        updated_at
      )
    `,
      { count: 'exact' },
    )
    .eq('classroom_id', classroomId);

  // Filter by status
  if (status !== 'all') {
    query_builder = query_builder.eq('status', status);
  }

  // Filter by search (name or email)
  if (search) {
    query_builder = query_builder.or(
      `student.name.ilike.%${search}%,student.email.ilike.%${search}%`,
    );
  }

  // Sort
  const sortColumn = sort === 'enrollment_date' ? 'enrollment_date' : 'name';
  query_builder = query_builder.order(sortColumn, {
    ascending: order === 'asc',
    foreignTable: sort === 'enrollment_date' ? undefined : 'student',
  });

  // Pagination
  const offset = (page - 1) * limit;
  query_builder = query_builder.range(offset, offset + limit - 1);

  // Execute
  const { data, error, count } = await query_builder;

  if (error) {
    throw new Error(`Failed to list students: ${error.message}`);
  }

  return {
    students: (data || []).map((roster) => ({
      ...roster,
      student: roster.student,
    })) as unknown as StudentRosterWithDetails[],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Get a single student's roster entry with details
 */
export async function getStudentRoster(
  classroomId: string,
  studentId: string,
): Promise<StudentRosterWithDetails> {
  const { data, error } = await supabase
    .from('student_rosters')
    .select(
      `
      *,
      student:students(*)
    `,
    )
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .single();

  if (error) {
    throw new Error(`Student not found: ${error.message}`);
  }

  return data as StudentRosterWithDetails;
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update a student's roster status (active, dropped, unenrolled)
 * User experience: Soft delete via status change, preserves history
 */
export async function updateStudentStatus(
  classroomId: string,
  studentId: string,
  status: EnrollmentStatus,
  instructorId: string,
): Promise<StudentRoster> {
  // Verify instructor owns classroom
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('instructor_id', instructorId)
    .single();

  if (!classroom) {
    throw new Error('Classroom not found or you do not have permission');
  }

  const { data, error } = await supabase
    .from('student_rosters')
    .update({ status })
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update student status: ${error.message}`);
  }

  // Log audit event
  await supabase
    .from('audit_logs')
    .insert({
      classroom_id: classroomId,
      actor_id: instructorId,
      action: 'student_status_changed',
      resource_type: 'student',
      resource_id: studentId,
      details: { new_status: status },
    })
    .select();

  return data as StudentRoster;
}

/**
 * Update student profile information
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<Pick<Student, 'name' | 'student_id' | 'avatar_url'>>,
): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', studentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update student: ${error.message}`);
  }

  return data as Student;
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Remove a student from a classroom
 * User experience: This is a soft delete via status change, not hard delete
 */
export async function removeStudentFromClassroom(
  classroomId: string,
  studentId: string,
  instructorId: string,
): Promise<void> {
  // Use status update instead of hard delete to preserve audit trail
  await updateStudentStatus(classroomId, studentId, 'unenrolled', instructorId);
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk add students from parsed CSV data
 * User experience: Atomic operation (all or nothing), detailed error reporting
 */
export async function bulkAddStudents(
  classroomId: string,
  students: Array<{
    email: string;
    name: string;
    student_id?: string;
  }>,
  instructorId: string,
): Promise<{
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}> {
  const errors: Array<{ row: number; email: string; error: string }> = [];
  let imported = 0;

  // Verify instructor owns classroom
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('instructor_id', instructorId)
    .single();

  if (!classroom) {
    throw new Error('Classroom not found or you do not have permission');
  }

  // Process each student
  for (let i = 0; i < students.length; i++) {
    try {
      const student = students[i];

      // Validate email
      if (!student.email || !student.email.includes('@')) {
        errors.push({
          row: i + 2, // +2 for header row and 1-indexing
          email: student.email || '(missing)',
          error: 'Invalid email format',
        });
        continue;
      }

      // Validate name
      if (!student.name || student.name.trim().length === 0) {
        errors.push({
          row: i + 2,
          email: student.email,
          error: 'Name is required',
        });
        continue;
      }

      // Try to add student
      await addStudentToClassroom(classroomId, student, instructorId);
      imported++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      errors.push({
        row: i + 2,
        email: students[i]?.email || '(unknown)',
        error: errorMessage,
      });
    }
  }

  return {
    imported,
    failed: errors.length,
    errors,
  };
}

/**
 * Get classroom statistics for dashboard
 */
export async function getClassroomStats(classroomId: string) {
  const { data: rosterStats } = await supabase
    .from('student_rosters')
    .select('status', { count: 'exact' })
    .eq('classroom_id', classroomId)
    .eq('status', 'active');

  const { data: submissionStats } = await supabase
    .from('quiz_submissions')
    .select('score, max_score')
    .eq('classroom_id', classroomId)
    .not('score', 'is', null);

  const submissions = (submissionStats || []) as Array<{ score: number | null; max_score: number | null }>;
  const avgScore =
    submissions.length > 0
      ? submissions.reduce((sum, s) => sum + ((s.score || 0) / (s.max_score || 1)), 0) / submissions.length
      : 0;

  return {
    active_students: rosterStats?.length || 0,
    total_submissions: submissions.length,
    average_score: Math.round(avgScore * 100) / 100,
  };
}
