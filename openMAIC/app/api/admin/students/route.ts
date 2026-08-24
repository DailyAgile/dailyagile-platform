/**
 * GET /api/admin/students
 * List all students with pagination, search, and filtering
 * REQUIRES: Admin authentication
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 * - sort: string (default: created_at | options: created_at, email, last_active)
 * - order: asc|desc (default: asc)
 * - search: string (search by email or name)
 * - status: string (filter by account status)
 *
 * Returns:
 * {
 *   success: true,
 *   data: [{ id, email, name, status, enrollments, total_spent, created_at, last_active }],
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

const log = createLogger('AdminStudents');

interface StudentRecord {
  id: string;
  email: string;
  name?: string;
  status: string;
  enrollments: number;
  total_spent: number;
  created_at: string;
  last_active?: string;
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
    const validSortColumns = ['created_at', 'email', 'last_active'];
    const sortColumn = validSortColumns.includes(sort || '') ? sort : 'created_at';

    // Build the base query
    let query = supabase
      .from('students')
      .select(
        `
        id,
        email,
        name,
        status,
        enrollments:enrollments(count),
        created_at,
        last_active
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
      log.error('Failed to fetch students:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch students');
    }

    const total = count || 0;

    // Transform data to include enrollment counts and totals
    const transformedData: StudentRecord[] = (data || []).map((student: any) => ({
      id: student.id,
      email: student.email,
      name: student.name,
      status: student.status || 'active',
      enrollments: student.enrollments?.[0]?.count || 0,
      total_spent: 0, // Will be calculated from orders table if needed
      created_at: student.created_at,
      last_active: student.last_active,
    }));

    const response = createPaginatedResponse(transformedData, page, limit, total);
    return apiSuccess(response);
  } catch (error) {
    log.error('Error fetching students:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to process request');
  }
}
