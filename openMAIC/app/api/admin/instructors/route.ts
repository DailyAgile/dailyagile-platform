/**
 * GET /api/admin/instructors
 * List all instructors with pagination, search, and filtering
 * REQUIRES: Admin authentication
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 * - sort: string (default: created_at | options: created_at, email, rating)
 * - order: asc|desc (default: asc)
 * - search: string (search by email or name)
 * - status: string (filter by status)
 *
 * Returns:
 * {
 *   success: true,
 *   data: [{ id, email, name, status, courses_teaching, active_cohorts, rating, created_at }],
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

const log = createLogger('AdminInstructors');

interface InstructorRecord {
  id: string;
  email: string;
  name?: string;
  status: string;
  courses_teaching: number;
  active_cohorts: number;
  rating?: number;
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
    const validSortColumns = ['created_at', 'email', 'rating'];
    const sortColumn = validSortColumns.includes(sort || '') ? sort : 'created_at';

    // Build the base query
    let query = supabase
      .from('instructors')
      .select(
        `
        id,
        email,
        name,
        status,
        courses_they_teach,
        rating,
        created_at,
        cohorts:cohorts(count)
      `,
        { count: 'exact' },
      );

    // Apply search filter
    if (searchQuery) {
      query = query.or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);
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
      log.error('Failed to fetch instructors:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch instructors');
    }

    const total = count || 0;

    // Transform data
    const transformedData: InstructorRecord[] = (data || []).map((instructor: any) => ({
      id: instructor.id,
      email: instructor.email,
      name: instructor.name,
      status: instructor.status || 'active',
      courses_teaching: Array.isArray(instructor.courses_they_teach)
        ? instructor.courses_they_teach.length
        : 0,
      active_cohorts: instructor.cohorts?.[0]?.count || 0,
      rating: instructor.rating,
      created_at: instructor.created_at,
    }));

    const response = createPaginatedResponse(transformedData, page, limit, total);
    return apiSuccess(response);
  } catch (error) {
    log.error('Error fetching instructors:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to process request');
  }
}
