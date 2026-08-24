/**
 * GET /api/admin/quizzes
 * List all quizzes with pagination, search, and filtering
 * REQUIRES: Admin authentication
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 * - sort: string (default: created_at | options: created_at, title, course_id)
 * - order: asc|desc (default: asc)
 * - search: string (search by title or course)
 * - type: string (filter by type: self-paced, live)
 *
 * Returns:
 * {
 *   success: true,
 *   data: [{ id, title, course_id, type, question_count, attempts_total, avg_score, created_at }],
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

const log = createLogger('AdminQuizzes');

interface QuizRecord {
  id: string;
  title: string;
  course_id: string;
  type: string;
  question_count: number;
  attempts_total: number;
  avg_score?: number;
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

    // Validate sort column (prevent SQL injection)
    const validSortColumns = ['created_at', 'title', 'course_id'];
    const sortColumn = validSortColumns.includes(sort || '') ? sort : 'created_at';

    // Build the base query
    let query = supabase
      .from('quizzes')
      .select(
        `
        id,
        title,
        course_id,
        type,
        questions(count),
        quiz_attempts(count),
        created_at
      `,
        { count: 'exact' },
      );

    // Apply search filter
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,course_id.ilike.%${searchQuery}%`);
    }

    // Apply type filter (self-paced, live)
    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    // Apply sorting and pagination
    const { data, count, error } = await query
      .order(sortColumn, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      log.error('Failed to fetch quizzes:', error);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch quizzes');
    }

    const total = count || 0;

    // Transform data
    const transformedData: QuizRecord[] = (data || []).map((quiz: any) => ({
      id: quiz.id,
      title: quiz.title,
      course_id: quiz.course_id,
      type: quiz.type || 'self-paced',
      question_count: quiz.questions?.[0]?.count || 0,
      attempts_total: quiz.quiz_attempts?.[0]?.count || 0,
      avg_score: undefined, // Can be calculated from quiz_attempts if needed
      created_at: quiz.created_at,
    }));

    const response = createPaginatedResponse(transformedData, page, limit, total);
    return apiSuccess(response);
  } catch (error) {
    log.error('Error fetching quizzes:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to process request');
  }
}
