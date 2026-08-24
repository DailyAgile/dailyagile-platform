/**
 * Learning Progression & Trends Analytics Endpoint
 * GET /api/analytics/learning-trends
 * GET /api/analytics/learning-trends?studentId={studentId}
 * Returns: LearningTrendsData
 * Requires: Instructor authentication + ownership of student
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireInstructor } from '@/lib/server/auth-middleware';
import { getLearningProgression, getStudentTrends } from '@/lib/analytics/quiz-reports';
import { getSupabaseClient } from '@/lib/server/supabase-client';

export async function GET(req: NextRequest) {
  try {
    // Verify instructor authentication
    const instructor = await requireInstructor(req);

    const studentId = req.nextUrl.searchParams.get('studentId');

    // If studentId is provided, verify instructor is authorized to view this student
    if (studentId) {
      const supabase = getSupabaseClient();

      // Check if student exists and belongs to an instructor's classroom
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('classroom_enrollments')
        .select('classroom_id')
        .eq('student_id', studentId)
        .single();

      if (enrollmentError || !enrollment) {
        return NextResponse.json(
          { error: 'Student enrollment not found' },
          { status: 404 }
        );
      }

      // Verify instructor owns the classroom
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('instructor_id')
        .eq('id', enrollment.classroom_id)
        .single();

      if (classroomError || !classroom || classroom.instructor_id !== instructor.id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this student' },
          { status: 403 }
        );
      }

      const studentTrend = await getStudentTrends(studentId);
      return NextResponse.json({
        progressions: null,
        studentTrend,
      });
    }

    // Return cohort progression data for this instructor's classrooms only
    const progressions = await getLearningProgression(instructor.id);
    return NextResponse.json({
      progressions: progressions || [],
      studentTrend: null,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning trends data' },
      { status: 500 }
    );
  }
}
