/**
 * Student Management Service
 * Handles core business logic for:
 * - Retrieving student lists with filters and pagination
 * - Assigning quizzes to students
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';

interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  status?: 'all' | 'completed' | 'pending';
}

interface Student {
  id: string;
  email: string;
  name?: string;
  enrolled_at: string;
  quizzes_assigned: number;
  quizzes_completed: number;
  completion_percentage: number;
  last_activity?: string;
}

interface StudentListResponse {
  success: boolean;
  data: {
    students: Student[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
  error?: string;
}

interface AssignmentParams {
  quizId: string;
  studentIds: string[];
  instructorId: string;
  deadline?: string;
  notifyStudents?: boolean;
}

interface AssignmentResponse {
  success: boolean;
  data: {
    assigned_count: number;
    message: string;
  };
  error?: string;
}

/**
 * Get list of students for an instructor with pagination and filtering
 */
export async function getStudentList(
  params: PaginationParams,
  instructorId: string
): Promise<StudentListResponse> {
  try {
    if (!instructorId || instructorId.trim() === '') {
      return {
        success: false,
        data: { students: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } },
        error: 'Instructor ID is required',
      };
    }

    // Validate pagination parameters
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const offset = (page - 1) * limit;

    const supabase = getSupabaseClient();

    // Get total count of students assigned to this instructor's quizzes
    const { count: totalCount, error: countError } = await supabase
      .from('quiz_assignments')
      .select('student_id', { count: 'exact', head: true })
      .eq('instructor_id', instructorId)
      .not('student_id', 'is', null);

    if (countError) {
      console.error('Error counting students:', countError);
      return {
        success: false,
        data: { students: [], pagination: { total: 0, page, limit, pages: 0 } },
        error: 'Failed to count students',
      };
    }

    const total = totalCount || 0;
    const pages = Math.ceil(total / limit);

    // Get student list with assignment data
    let query = supabase
      .from('quiz_assignments')
      .select(
        `
        student_id,
        students!inner (
          id,
          email,
          first_name,
          last_name
        ),
        created_at
      `,
        { count: 'exact' }
      )
      .eq('instructor_id', instructorId)
      .not('student_id', 'is', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data: assignments, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching students:', queryError);
      return {
        success: false,
        data: { students: [], pagination: { total: 0, page, limit, pages: 0 } },
        error: 'Failed to fetch students',
      };
    }

    // Build unique student map to avoid duplicates
    const studentMap = new Map<string, any>();

    if (assignments && Array.isArray(assignments)) {
      for (const assignment of assignments) {
        const studentId = assignment.student_id;
        if (studentId && assignment.students) {
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              id: assignment.students.id,
              email: assignment.students.email,
              name: [assignment.students.first_name, assignment.students.last_name].filter(Boolean).join(' ') || 'N/A',
              enrolled_at: assignment.created_at,
              assigned: 0,
              completed: 0,
            });
          }
          studentMap.get(studentId)!.assigned += 1;
        }
      }
    }

    // Get completion stats for each student
    for (const [studentId, student] of studentMap) {
      const { count: completedCount } = await supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId);

      student.completed = completedCount || 0;
    }

    // Convert to array and apply filters
    let students = Array.from(studentMap.values());

    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      students = students.filter(
        s =>
          s.email.toLowerCase().includes(searchLower) ||
          (s.name && s.name.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (params.status === 'completed') {
      students = students.filter(s => s.completed > 0);
    } else if (params.status === 'pending') {
      students = students.filter(s => s.completed === 0 && s.assigned > 0);
    }

    // Calculate completion percentage and format response
    const formattedStudents: Student[] = students.map(s => ({
      id: s.id,
      email: s.email,
      name: s.name,
      enrolled_at: s.enrolled_at,
      quizzes_assigned: s.assigned,
      quizzes_completed: s.completed,
      completion_percentage: s.assigned > 0 ? Math.round((s.completed / s.assigned) * 100) : 0,
    }));

    return {
      success: true,
      data: {
        students: formattedStudents,
        pagination: {
          total: students.length,
          page,
          limit,
          pages: Math.ceil(students.length / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error in getStudentList:', error);
    return {
      success: false,
      data: { students: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Assign quiz to one or more students
 */
export async function assignQuizToStudents(
  params: AssignmentParams
): Promise<AssignmentResponse> {
  try {
    const { quizId, studentIds, instructorId, deadline, notifyStudents } = params;

    // Validate inputs
    if (!quizId || quizId.trim() === '') {
      return {
        success: false,
        data: { assigned_count: 0, message: '' },
        error: 'Quiz ID is required',
      };
    }

    if (!studentIds || studentIds.length === 0) {
      return {
        success: false,
        data: { assigned_count: 0, message: '' },
        error: 'At least one student must be selected',
      };
    }

    if (!instructorId || instructorId.trim() === '') {
      return {
        success: false,
        data: { assigned_count: 0, message: '' },
        error: 'Instructor ID is required',
      };
    }

    // Validate deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (deadlineDate <= new Date()) {
        return {
          success: false,
          data: { assigned_count: 0, message: '' },
          error: 'Deadline must be in the future',
        };
      }
    }

    const supabase = getSupabaseClient();

    // Verify instructor owns this quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, instructor_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz || quiz.instructor_id !== instructorId) {
      return {
        success: false,
        data: { assigned_count: 0, message: '' },
        error: 'Quiz not found or you do not have permission to assign it',
      };
    }

    // Calculate expiry date (30 days from now if no deadline specified)
    const expiryDate =
      deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create assignments for each student
    const assignments = studentIds
      .filter(id => id && id.trim() !== '')
      .map(studentId => ({
        quiz_id: quizId,
        student_id: studentId,
        instructor_id: instructorId,
        assignment_code: `QA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        assignment_url: `/student/quiz/${quizId}`,
        expires_at: expiryDate,
        status: 'active',
      }));

    if (assignments.length === 0) {
      return {
        success: false,
        data: { assigned_count: 0, message: '' },
        error: 'No valid students to assign',
      };
    }

    const { error: insertError } = await supabase
      .from('quiz_assignments')
      .insert(assignments);

    if (insertError) {
      console.error('Error creating assignments:', insertError);
      return {
        success: false,
        data: { assigned_count: 0, message: '' },
        error: 'Failed to create assignments',
      };
    }

    // TODO: Send email notifications if notifyStudents is true
    // This would call an email service to notify selected students

    return {
      success: true,
      data: {
        assigned_count: assignments.length,
        message: `Quiz assigned to ${assignments.length} student${assignments.length === 1 ? '' : 's'}`,
      },
    };
  } catch (error) {
    console.error('Error in assignQuizToStudents:', error);
    return {
      success: false,
      data: { assigned_count: 0, message: '' },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
