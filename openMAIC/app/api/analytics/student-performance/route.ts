/**
 * Student Performance Tracking Analytics Endpoint
 * GET /api/analytics/student-performance?classroomId={classroomId}
 * Returns: StudentPerformanceData[]
 * Requires: Instructor authentication + ownership of classroom
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireInstructor } from '@/lib/server/auth-middleware';
import { getStudentPerformanceTracking } from '@/lib/analytics/quiz-reports';
import { getSupabaseClient } from '@/lib/server/supabase-client';

export async function GET(req: NextRequest) {
  try {
    // Verify instructor authentication
    const instructor = await requireInstructor(req);

    const classroomId = req.nextUrl.searchParams.get('classroomId');

    // If classroomId is provided, verify instructor owns it
    if (classroomId) {
      const supabase = getSupabaseClient();
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('instructor_id')
        .eq('id', classroomId)
        .single();

      if (classroomError || !classroom) {
        return NextResponse.json(
          { error: 'Classroom not found' },
          { status: 404 }
        );
      }

      if (classroom.instructor_id !== instructor.id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this classroom' },
          { status: 403 }
        );
      }
    }

    const data = await getStudentPerformanceTracking(classroomId || undefined);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student performance data' },
      { status: 500 }
    );
  }
}
