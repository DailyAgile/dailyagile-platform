import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentEnroll');

interface EnrollmentRequest {
  studentId: string;
  courseId?: number;
  cohortId?: number;
  courseTitle?: string;
  cohortTitle?: string;
  type: 'self-paced' | 'live';
  instructor?: string;
  startDate?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnrollmentRequest;
    const { studentId, courseId, cohortId, courseTitle, cohortTitle, type, instructor, startDate } = body;

    if (!studentId || (!courseId && !cohortId)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Create enrollment record
    const enrollmentData: any = {
      student_id: studentId,
      type,
      enrolled_at: new Date().toISOString(),
    };

    if (courseId) {
      enrollmentData.course_id = courseId;
      enrollmentData.course_title = courseTitle;
    }

    if (cohortId) {
      enrollmentData.cohort_id = cohortId;
      enrollmentData.cohort_title = cohortTitle;
      enrollmentData.instructor = instructor;
      enrollmentData.start_date = startDate;
    }

    // Insert enrollment into database
    const { data, error } = await supabase
      .from('student_enrollments')
      .insert([enrollmentData])
      .select()
      .single();

    if (error) {
      log.error('Enrollment insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save enrollment' },
        { status: 500 }
      );
    }

    log.info(`Student ${studentId} enrolled successfully`, { enrollmentData });

    return NextResponse.json(
      {
        success: true,
        enrollment: data,
        message: 'Enrollment successful',
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('Enrollment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
