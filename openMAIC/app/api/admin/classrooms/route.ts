/**
 * GET /api/admin/classrooms
 * List all classrooms/cohorts with pagination, search, and filtering
 * REQUIRES: Admin authentication
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 * - sort: string (default: created_at | options: created_at, course_id, status)
 * - order: asc|desc (default: asc)
 * - search: string (search by course name)
 * - status: string (filter by status: scheduled, active, completed)
 *
 * Returns:
 * {
 *   success: true,
 *   data: [{ id, course_id, course_name, instructor_name, students_count, status, start_date, created_at }],
 *   pagination: { page, limit, total, totalPages, hasMore }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireAdmin, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  parsePaginationParams,
  calculateOffset,
  createPaginatedResponse,
} from '@/lib/server/pagination';

const log = createLogger('AdminClassrooms');

interface ClassroomRecord {
  id: string;
  course_id: string;
  course_name: string;
  instructor_name?: string;
  students_count: number;
  status: string;
  start_date?: string;
  created_at: string;
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify admin is logged in
    let authenticatedAdmin;
    try {
      authenticatedAdmin = await requireAdmin(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const supabase = getSupabaseClient();
    const searchParams = req.nextUrl.searchParams;

    // Parse pagination parameters
    const { page, limit, sort, order } = parsePaginationParams(searchParams);
    const offset = calculateOffset(page, limit);

    // Parse search and filter parameters
    const searchQuery = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';

    // Validate sort column (prevent SQL injection)
    const validSortColumns = ['created_at', 'course_id', 'status'];
    const sortColumn = validSortColumns.includes(sort || '') ? sort : 'created_at';

    // Build the base query (assuming 'cohorts' table)
    let query = supabase
      .from('cohorts')
      .select(
        `
        id,
        course_id,
        courses(name),
        instructor_id,
        instructors(name),
        status,
        start_date,
        created_at,
        enrollments:enrollments(count)
      `,
        { count: 'exact' },
      );

    // Apply search filter on course name
    if (searchQuery) {
      query = query.ilike('courses.name', `%${searchQuery}%`);
    }

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Apply sorting and pagination
    const { data, count, error } = await query
      .order(sortColumn, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      log.error('Failed to fetch classrooms:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch classrooms');
    }

    const total = count || 0;

    // Transform data
    const transformedData: ClassroomRecord[] = (data || []).map((classroom: any) => ({
      id: classroom.id,
      course_id: classroom.course_id,
      course_name: classroom.courses?.name || 'Unknown Course',
      instructor_name: classroom.instructors?.name,
      students_count: classroom.enrollments?.[0]?.count || 0,
      status: classroom.status || 'scheduled',
      start_date: classroom.start_date,
      created_at: classroom.created_at,
    }));

    const response = createPaginatedResponse(transformedData, page, limit, total);
    return apiSuccess(response as unknown as Record<string, unknown>);
  } catch (error) {
    log.error('Error fetching classrooms:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to process request');
  }
}
