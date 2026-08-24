/**
 * API: Student Roster Management
 * GET: List students in classroom
 * POST: Add a student to classroom
 * PATCH: Update student status
 * DELETE: Remove student from classroom
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { z } from 'zod';
import {
  listClassroomStudents,
  addStudentToClassroom,
  removeStudentFromClassroom,
  updateStudentStatus,
} from '@/lib/ilt/db/students';
import type { RosterListQuery, AddStudentRequest } from '@/lib/ilt/types/models';


// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AddStudentSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255),
  student_id: z.string().max(255).optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'dropped', 'unenrolled']),
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
    {
      error: errorObj,
    },
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

// ============================================================================
// GET: List Students in Classroom
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> },
) {
  const { classroomId } = await params;
  try {
    const user = await getAuthUser(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query: RosterListQuery = {
      status: (searchParams.get('status') || 'active') as any,
      sort: (searchParams.get('sort') || 'name') as any,
      order: (searchParams.get('order') || 'asc') as any,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: Math.min(parseInt(searchParams.get('limit') || '50', 10), 500), // Cap at 500
      search: searchParams.get('search') || undefined,
    };

    // Validate pagination
    if (!query.page || !query.limit || query.page < 1 || query.limit < 1) {
      return errorResponse('INVALID_PAGINATION', 'Page and limit must be positive integers', 400);
    }

    // Get students
    const result = await listClassroomStudents(classroomId, user.id, query);

    // Add audit log for data access
    await getSupabaseClient()
      .from('audit_logs')
      .insert({
        classroom_id: classroomId,
        actor_id: user.id,
        action: 'roster_viewed',
        resource_type: 'classroom',
        resource_id: classroomId,
        details: { filter: query.status, search: query.search },
      })
      .select();

    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list students';

    if (message.includes('permission')) {
      return errorResponse('FORBIDDEN', 'You do not have access to this classroom', 403);
    }

    console.error('[GET /classrooms/:id/students]', error);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

// ============================================================================
// POST: Add Single Student to Classroom
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> },
) {
  const { classroomId } = await params;
  try {
    const user = await getAuthUser(request);
    const body = await request.json();

    // Validate request
    const validData = AddStudentSchema.parse(body);

    // Add student
    const result = await addStudentToClassroom(
      classroomId,
      validData as AddStudentRequest,
      user.id,
    );

    // Send enrollment invite email
    let invitationSent = false;
    try {
      const { sendNotificationEmail } = await import('@/lib/email/send-notification');
      const firstName = validData.name.split(' ')[0] || validData.name;

      // Get classroom name from database
      const supabase = getSupabaseClient();
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('name, instructor_id')
        .eq('id', classroomId)
        .single();

      let instructorName = 'Your Instructor';
      if (classroom?.instructor_id) {
        const { data: instructor } = await supabase
          .from('users')
          .select('first_name')
          .eq('id', classroom.instructor_id)
          .single();
        instructorName = instructor?.first_name || 'Your Instructor';
      }

      await sendNotificationEmail('enrollment-invite', {
        email: validData.email,
        firstName,
        classroomName: classroom?.name || 'Your Classroom',
        instructorName,
        joinLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com'}/classrooms/${classroomId}`,
      });
      invitationSent = true;
    } catch (emailError) {
      // Log but continue - enrollment still succeeds even if email fails
      console.error('[Enrollment Email Error]', emailError);
    }

    return successResponse(
      {
        student: result.student,
        roster: result.roster,
        invitation_sent: invitationSent,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add student';

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        400,
        error.issues[0],
      );
    }

    if (message.includes('permission')) {
      return errorResponse('FORBIDDEN', 'You do not have access to this classroom', 403);
    }

    if (message.includes('already enrolled')) {
      return errorResponse('CONFLICT', message, 409);
    }

    if (message.includes('already exists')) {
      return errorResponse('CONFLICT', 'A student with this email already exists in this classroom', 409);
    }

    console.error('[POST /classrooms/:id/students]', error);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

// ============================================================================
// PATCH: Update Student Status
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> },
) {
  const { classroomId } = await params;
  try {
    const user = await getAuthUser(request);
    const body = await request.json();

    // Validate request
    const validData = UpdateStatusSchema.parse(body);

    // Get student ID from query param
    const studentId = request.nextUrl.searchParams.get('student_id');
    if (!studentId) {
      return errorResponse('MISSING_PARAMETER', 'student_id query parameter is required', 400);
    }

    // Update status
    const result = await updateStudentStatus(
      classroomId,
      studentId,
      validData.status,
      user.id,
    );

    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update student';

    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid status value', 400, error.issues[0]);
    }

    if (message.includes('permission')) {
      return errorResponse('FORBIDDEN', 'You do not have access to this classroom', 403);
    }

    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', 'Student not found in this classroom', 404);
    }

    console.error('[PATCH /classrooms/:id/students]', error);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

// ============================================================================
// DELETE: Remove Student from Classroom
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> },
) {
  const { classroomId } = await params;
  try {
    const user = await getAuthUser(request);

    // Get student ID from query param
    const studentId = request.nextUrl.searchParams.get('student_id');
    if (!studentId) {
      return errorResponse('MISSING_PARAMETER', 'student_id query parameter is required', 400);
    }

    // Remove student
    await removeStudentFromClassroom(classroomId, studentId, user.id);

    return successResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove student';

    if (message.includes('permission')) {
      return errorResponse('FORBIDDEN', 'You do not have access to this classroom', 403);
    }

    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', 'Student not found', 404);
    }

    console.error('[DELETE /classrooms/:id/students]', error);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
