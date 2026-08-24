/**
 * Pagination Utilities for Admin Endpoints
 * Handles query parameter parsing, validation, and response formatting
 */

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MIN_LIMIT = 1;

/**
 * Parse and validate pagination query parameters
 * @param searchParams URL search parameters
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  // Parse page
  let page = DEFAULT_PAGE;
  const pageParam = searchParams.get('page');
  if (pageParam) {
    const parsedPage = parseInt(pageParam, 10);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  // Parse limit
  let limit = DEFAULT_LIMIT;
  const limitParam = searchParams.get('limit');
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit >= MIN_LIMIT) {
      // Cap at MAX_LIMIT to prevent DOS
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }
  }

  // Parse sort
  const sort = searchParams.get('sort') || undefined;

  // Parse order
  let order: 'asc' | 'desc' = 'asc';
  const orderParam = searchParams.get('order');
  if (orderParam === 'desc' || orderParam === 'asc') {
    order = orderParam;
  }

  return { page, limit, sort, order };
}

/**
 * Calculate offset for Supabase LIMIT/OFFSET query
 * @param page 1-based page number
 * @param limit Items per page
 * @returns Offset for SQL OFFSET clause
 */
export function calculateOffset(page: number, limit: number): number {
  return (Math.max(page, 1) - 1) * limit;
}

/**
 * Create pagination metadata from query results
 * @param page Current page
 * @param limit Items per page
 * @param total Total number of items
 * @returns Pagination metadata
 */
export function createPaginationMetadata(
  page: number,
  limit: number,
  total: number,
): PaginationMetadata {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    page: Math.max(page, 1),
    limit,
    total,
    totalPages,
    hasMore,
  };
}

/**
 * Create a paginated response object
 * @param data Array of items
 * @param page Current page
 * @param limit Items per page
 * @param total Total number of items
 * @returns Paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMetadata(page, limit, total),
  };
}
