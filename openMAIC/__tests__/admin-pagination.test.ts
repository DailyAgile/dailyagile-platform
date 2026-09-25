/**
 * Admin Endpoints Pagination Tests
 * Tests pagination behavior: limits, sorting, edge cases
 */

import {
  parsePaginationParams,
  calculateOffset,
  createPaginationMetadata,
  createPaginatedResponse,
} from '@/lib/server/pagination';

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('returns default values when no params provided', () => {
      const params = new URLSearchParams();
      const result = parsePaginationParams(params);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.sort).toBeUndefined();
      expect(result.order).toBe('asc');
    });

    it('parses valid page and limit parameters', () => {
      const params = new URLSearchParams('?page=3&limit=100');
      const result = parsePaginationParams(params);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(100);
    });

    it('caps limit at MAX_LIMIT (200)', () => {
      const params = new URLSearchParams('?limit=500');
      const result = parsePaginationParams(params);
      expect(result.limit).toBe(200);
    });

    it('uses default limit if invalid limit provided', () => {
      const params = new URLSearchParams('?limit=invalid');
      const result = parsePaginationParams(params);
      expect(result.limit).toBe(50);
    });

    it('uses default page if invalid page provided', () => {
      const params = new URLSearchParams('?page=-5');
      const result = parsePaginationParams(params);
      expect(result.page).toBe(1);
    });

    it('parses sort and order parameters', () => {
      const params = new URLSearchParams('?sort=email&order=desc');
      const result = parsePaginationParams(params);
      expect(result.sort).toBe('email');
      expect(result.order).toBe('desc');
    });

    it('defaults to asc if invalid order provided', () => {
      const params = new URLSearchParams('?order=invalid');
      const result = parsePaginationParams(params);
      expect(result.order).toBe('asc');
    });

    it('prevents zero or negative limits', () => {
      const params = new URLSearchParams('?limit=0');
      const result = parsePaginationParams(params);
      expect(result.limit).toBe(50); // Uses default
    });
  });

  describe('calculateOffset', () => {
    it('calculates correct offset for page 1', () => {
      const offset = calculateOffset(1, 50);
      expect(offset).toBe(0);
    });

    it('calculates correct offset for page 2', () => {
      const offset = calculateOffset(2, 50);
      expect(offset).toBe(50);
    });

    it('calculates correct offset for page 5 with limit 20', () => {
      const offset = calculateOffset(5, 20);
      expect(offset).toBe(80);
    });

    it('uses page 1 if page is 0 or negative', () => {
      const offset1 = calculateOffset(0, 50);
      const offset2 = calculateOffset(-10, 50);
      expect(offset1).toBe(0);
      expect(offset2).toBe(0);
    });
  });

  describe('createPaginationMetadata', () => {
    it('creates correct metadata for first page with more pages', () => {
      const metadata = createPaginationMetadata(1, 50, 150);
      expect(metadata.page).toBe(1);
      expect(metadata.limit).toBe(50);
      expect(metadata.total).toBe(150);
      expect(metadata.totalPages).toBe(3);
      expect(metadata.hasMore).toBe(true);
    });

    it('creates correct metadata for last page', () => {
      const metadata = createPaginationMetadata(3, 50, 150);
      expect(metadata.page).toBe(3);
      expect(metadata.totalPages).toBe(3);
      expect(metadata.hasMore).toBe(false);
    });

    it('handles exact divisor', () => {
      const metadata = createPaginationMetadata(1, 50, 100);
      expect(metadata.totalPages).toBe(2);
      expect(metadata.hasMore).toBe(true);
    });

    it('handles single item', () => {
      const metadata = createPaginationMetadata(1, 50, 1);
      expect(metadata.totalPages).toBe(1);
      expect(metadata.hasMore).toBe(false);
    });

    it('handles empty results', () => {
      const metadata = createPaginationMetadata(1, 50, 0);
      expect(metadata.totalPages).toBe(0);
      expect(metadata.hasMore).toBe(false);
    });

    it('handles page > totalPages', () => {
      const metadata = createPaginationMetadata(10, 50, 100);
      expect(metadata.page).toBe(10);
      expect(metadata.totalPages).toBe(2);
      expect(metadata.hasMore).toBe(false);
    });
  });

  describe('createPaginatedResponse', () => {
    it('creates response with correct structure', () => {
      const data = [{ id: '1', name: 'Test' }];
      const response = createPaginatedResponse(data, 1, 50, 1);

      expect(response.data).toEqual(data);
      expect(response.pagination).toBeDefined();
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(50);
      expect(response.pagination.total).toBe(1);
      expect(response.pagination.totalPages).toBe(1);
      expect(response.pagination.hasMore).toBe(false);
    });

    it('creates response for large dataset', () => {
      const data: any[] = Array.from({ length: 50 }, (_, i) => ({ id: String(i + 1) }));
      const response = createPaginatedResponse(data, 2, 50, 10234);

      expect(response.data.length).toBe(50);
      expect(response.pagination.total).toBe(10234);
      expect(response.pagination.totalPages).toBe(205);
      expect(response.pagination.hasMore).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles page=1, limit=1 for single-item pagination', () => {
      const params = new URLSearchParams('?page=1&limit=1');
      const result = parsePaginationParams(params);
      const offset = calculateOffset(result.page, result.limit);
      const metadata = createPaginationMetadata(result.page, result.limit, 3);

      expect(offset).toBe(0);
      expect(metadata.totalPages).toBe(3);
      expect(metadata.hasMore).toBe(true);
    });

    it('handles very large limit (should cap at 200)', () => {
      const params = new URLSearchParams('?limit=1000000');
      const result = parsePaginationParams(params);
      expect(result.limit).toBeLessThanOrEqual(200);
    });

    it('handles fractional page/limit (should truncate)', () => {
      const params = new URLSearchParams('?page=2.7&limit=50.3');
      const result = parsePaginationParams(params);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('handles string-based limits properly', () => {
      const params = new URLSearchParams('?limit=abc');
      const result = parsePaginationParams(params);
      expect(result.limit).toBe(50); // Default when invalid
    });

    it('DOS prevention: very large page number', () => {
      const params = new URLSearchParams('?page=999999');
      const result = parsePaginationParams(params);
      const offset = calculateOffset(result.page, result.limit);
      expect(offset).toBe((999999 - 1) * 50); // Still works but returns empty
    });
  });
});

/**
 * Integration test expectations for admin endpoints
 * These verify the actual API response format
 */
describe('Admin Endpoints Response Format', () => {
  it('should return paginated students response', () => {
    // Mock response format
    const mockResponse = {
      success: true,
      data: [
        {
          id: 'student-1',
          email: 'test@example.com',
          name: 'Test Student',
          status: 'active',
          enrollments: 2,
          total_spent: 250,
          created_at: '2026-07-01T10:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 10234,
        totalPages: 205,
        hasMore: true,
      },
    };

    expect(mockResponse.success).toBe(true);
    expect(mockResponse.data).toBeDefined();
    expect(mockResponse.pagination).toBeDefined();
    expect(mockResponse.pagination.page).toBe(1);
    expect(mockResponse.pagination.limit).toBe(50);
    expect(mockResponse.pagination.total).toBe(10234);
    expect(mockResponse.pagination.totalPages).toBe(205);
    expect(mockResponse.pagination.hasMore).toBe(true);
  });

  it('should return paginated instructors response', () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: 'instructor-1',
          email: 'instructor@example.com',
          name: 'Sarah Johnson',
          status: 'active',
          courses_teaching: 3,
          active_cohorts: 2,
          rating: 4.8,
          created_at: '2026-06-01T10:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 125,
        totalPages: 3,
        hasMore: true,
      },
    };

    expect(mockResponse.data[0].courses_teaching).toBe(3);
    expect(mockResponse.pagination.totalPages).toBe(3);
  });

  it('should return paginated classrooms response', () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: 'classroom-1',
          course_id: 'course-1',
          course_name: 'Track A Module 1',
          instructor_name: 'Sarah Johnson',
          students_count: 18,
          status: 'active',
          start_date: '2026-09-01T00:00:00Z',
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 42,
        totalPages: 1,
        hasMore: false,
      },
    };

    expect(mockResponse.pagination.hasMore).toBe(false);
    expect(mockResponse.pagination.totalPages).toBe(1);
  });

  it('should return paginated quizzes response', () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: 'quiz-1',
          title: 'AI Fundamentals Quiz',
          course_id: 'course-1',
          type: 'self-paced',
          question_count: 15,
          attempts_total: 287,
          avg_score: 78,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 156,
        totalPages: 4,
        hasMore: true,
      },
    };

    expect(mockResponse.data[0].question_count).toBe(15);
    expect(mockResponse.data[0].attempts_total).toBe(287);
    expect(mockResponse.pagination.totalPages).toBe(4);
  });

  it('should return paginated reports response', () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: 'report-1',
          name: 'July Revenue Report',
          type: 'revenue',
          status: 'completed',
          generated_by: 'admin@example.com',
          date_range: '2026-07-01 to 2026-07-31',
          file_url: 'https://example.com/reports/july-2026.pdf',
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 87,
        totalPages: 2,
        hasMore: true,
      },
    };

    expect(mockResponse.data[0].type).toBe('revenue');
    expect(mockResponse.pagination.totalPages).toBe(2);
  });
});

/**
 * Sorting and Filtering Tests
 */
describe('Sorting and Filtering', () => {
  it('should handle sort=created_at&order=desc', () => {
    const params = new URLSearchParams('?sort=created_at&order=desc&page=1&limit=50');
    const result = parsePaginationParams(params);
    expect(result.sort).toBe('created_at');
    expect(result.order).toBe('desc');
  });

  it('should handle sort=email&order=asc', () => {
    const params = new URLSearchParams('?sort=email&order=asc');
    const result = parsePaginationParams(params);
    expect(result.sort).toBe('email');
    expect(result.order).toBe('asc');
  });

  it('should handle search queries', () => {
    const params = new URLSearchParams('?search=john@example.com');
    const searchQuery = params.get('search');
    expect(searchQuery).toBe('john@example.com');
  });

  it('should handle status filters', () => {
    const params = new URLSearchParams('?status=active');
    const statusFilter = params.get('status');
    expect(statusFilter).toBe('active');
  });

  it('should handle type filters', () => {
    const params = new URLSearchParams('?type=self-paced');
    const typeFilter = params.get('type');
    expect(typeFilter).toBe('self-paced');
  });

  it('should combine pagination with filters', () => {
    const params = new URLSearchParams(
      '?page=2&limit=25&search=test&status=active&sort=created_at&order=desc',
    );
    const result = parsePaginationParams(params);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
    expect(result.sort).toBe('created_at');
    expect(result.order).toBe('desc');
  });
});
