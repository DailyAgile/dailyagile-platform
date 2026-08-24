/**
 * GET /api/admin/reports
 * List all generated reports with pagination, search, and filtering
 * REQUIRES: Admin authentication
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 * - sort: string (default: created_at | options: created_at, type, status)
 * - order: asc|desc (default: asc)
 * - search: string (search by report name)
 * - type: string (filter by type: revenue, engagement, attendance, performance)
 * - status: string (filter by status: pending, completed, failed)
 *
 * Returns:
 * {
 *   success: true,
 *   data: [{ id, name, type, status, generated_by, date_range, file_url, created_at }],
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

const log = createLogger('AdminReports');

interface ReportRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  generated_by?: string;
  date_range?: string;
  file_url?: string;
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
    const typeFilter = searchParams.get('type') || '';
    const statusFilter = searchParams.get('status') || '';

    // Validate sort column (prevent SQL injection)
    const validSortColumns = ['created_at', 'type', 'status'];
    const sortColumn = validSortColumns.includes(sort || '') ? sort : 'created_at';

    // Build the base query
    let query = supabase
      .from('admin_reports')
      .select(
        `
        id,
        name,
        type,
        status,
        generated_by,
        date_range,
        file_url,
        created_at
      `,
        { count: 'exact' },
      );

    // Apply search filter
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    // Apply type filter
    if (typeFilter) {
      query = query.eq('type', typeFilter);
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
      log.error('Failed to fetch reports:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch reports');
    }

    const total = count || 0;

    // Transform data
    const transformedData: ReportRecord[] = (data || []).map((report: any) => ({
      id: report.id,
      name: report.name,
      type: report.type,
      status: report.status || 'pending',
      generated_by: report.generated_by,
      date_range: report.date_range,
      file_url: report.file_url,
      created_at: report.created_at,
    }));

    const response = createPaginatedResponse(transformedData, page, limit, total);
    return apiSuccess(response);
  } catch (error) {
    log.error('Error fetching reports:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to process request');
  }
}
