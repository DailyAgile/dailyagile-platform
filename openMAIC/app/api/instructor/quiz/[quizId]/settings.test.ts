/**
 * Quiz Settings API Tests
 * Comprehensive tests for GET and PATCH endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './settings/route';

// Mock Supabase client
vi.mock('@/lib/server/supabase-client', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { getSupabaseClient } from '@/lib/server/supabase-client';

describe('Quiz Settings API', () => {
  const mockQuizId = 'test-quiz-123';
  const mockInstructorId = 'instructor-123';

  const mockSettings = {
    id: mockQuizId,
    instructor_id: mockInstructorId,
    time_limit_minutes: 30,
    allow_retakes: true,
    max_retakes: 3,
    passing_score_percentage: 70,
    show_answers_after_submit: true,
  };

  const mockRequest = (method: string, headers?: Record<string, string>) => {
    return {
      headers: {
        get: (key: string) => headers?.[key] || (key === 'authorization' ? 'Bearer token' : null),
      },
      json: vi.fn(),
    } as unknown as NextRequest;
  };

  const mockContext = {
    params: { quizId: mockQuizId },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // GET ENDPOINT TESTS
  // ========================================================================

  describe('GET /api/instructor/quiz/{quizId}/settings', () => {
    it('returns 401 when no auth header provided', async () => {
      const req = {
        headers: {
          get: () => null,
        },
      } as unknown as NextRequest;

      const response = await GET(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error.message).toBe('Unauthorized');
    });

    it('returns 400 when quiz ID is missing', async () => {
      const req = mockRequest('GET');
      const context = { params: { quizId: '' } };

      const response = await GET(req, context);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.message).toBe('Missing quiz ID');
    });

    it('returns 404 when quiz not found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('GET');
      const response = await GET(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.message).toBe('Quiz not found');
    });

    it('returns 500 on database error', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error'),
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('GET');
      const response = await GET(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error.message).toBe('Failed to fetch quiz settings');
    });

    it('successfully retrieves quiz settings', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettings,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('GET');
      const response = await GET(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.quizId).toBe(mockQuizId);
      expect(json.data.timeLimitMinutes).toBe(30);
      expect(json.data.allowRetakes).toBe(true);
      expect(json.data.maxRetakes).toBe(3);
      expect(json.data.passingScorePercentage).toBe(70);
      expect(json.data.showAnswersAfterSubmit).toBe(true);
    });

    it('returns default values when columns are NULL', async () => {
      const defaultSettings = {
        ...mockSettings,
        time_limit_minutes: null,
        allow_retakes: true,
        max_retakes: 3,
        passing_score_percentage: 70,
        show_answers_after_submit: true,
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: defaultSettings,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('GET');
      const response = await GET(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.timeLimitMinutes).toBeNull();
    });
  });

  // ========================================================================
  // PATCH ENDPOINT TESTS
  // ========================================================================

  describe('PATCH /api/instructor/quiz/{quizId}/settings', () => {
    it('returns 401 when no auth header provided', async () => {
      const req = {
        headers: {
          get: () => null,
        },
      } as unknown as NextRequest;

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error.message).toBe('Unauthorized');
    });

    it('returns 400 when quiz ID is missing', async () => {
      const req = mockRequest('PATCH');
      req.json = vi.fn().mockResolvedValue({});

      const context = { params: { quizId: '' } };
      const response = await PATCH(req, context);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.message).toBe('Missing quiz ID');
    });

    it('returns 400 on invalid JSON body', async () => {
      const req = mockRequest('PATCH');
      req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.message).toBe('Invalid JSON body');
    });

    it('returns 404 when quiz not found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('PATCH');
      req.json = vi.fn().mockResolvedValue({ timeLimitMinutes: 30 });

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.message).toBe('Quiz not found');
    });

    it('validates time_limit_minutes range (0-120)', async () => {
      const req = mockRequest('PATCH');

      // Test invalid: > 120
      req.json = vi.fn().mockResolvedValue({ timeLimitMinutes: 121 });

      let response = await PATCH(req, mockContext);
      let json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Time limit must be between 0 and 120');

      // Test invalid: < 0
      req.json = vi.fn().mockResolvedValue({ timeLimitMinutes: -1 });

      response = await PATCH(req, mockContext);
      json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Time limit must be between 0 and 120');

      // Test invalid: not a number
      req.json = vi.fn().mockResolvedValue({ timeLimitMinutes: 'invalid' });

      response = await PATCH(req, mockContext);
      json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Time limit must be between 0 and 120');
    });

    it('validates passing_score_percentage range (0-100)', async () => {
      const req = mockRequest('PATCH');

      // Test invalid: > 100
      req.json = vi.fn().mockResolvedValue({ passingScorePercentage: 101 });

      let response = await PATCH(req, mockContext);
      let json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Passing score must be between 0 and 100');

      // Test invalid: < 0
      req.json = vi.fn().mockResolvedValue({ passingScorePercentage: -1 });

      response = await PATCH(req, mockContext);
      json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Passing score must be between 0 and 100');

      // Test invalid: not a number
      req.json = vi.fn().mockResolvedValue({ passingScorePercentage: 'invalid' });

      response = await PATCH(req, mockContext);
      json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Passing score must be between 0 and 100');
    });

    it('validates max_retakes range (0-20)', async () => {
      const req = mockRequest('PATCH');

      // Test invalid: > 20
      req.json = vi.fn().mockResolvedValue({ maxRetakes: 21 });

      let response = await PATCH(req, mockContext);
      let json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Max retakes must be between 0 and 20');

      // Test invalid: < 0
      req.json = vi.fn().mockResolvedValue({ maxRetakes: -1 });

      response = await PATCH(req, mockContext);
      json = await response.json();
      expect(response.status).toBe(400);
      expect(json.error.message).toContain('Max retakes must be between 0 and 20');
    });

    it('successfully updates time_limit_minutes', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn()
              .mockReturnValueOnce({
                single: vi.fn().mockResolvedValue({
                  data: mockSettings,
                  error: null,
                }),
              })
              .mockReturnValueOnce({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockSettings, time_limit_minutes: 45 },
                  error: null,
                }),
              }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockSettings, time_limit_minutes: 45 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('PATCH');
      req.json = vi.fn().mockResolvedValue({ timeLimitMinutes: 45 });

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.timeLimitMinutes).toBe(45);
    });

    it('successfully updates allow_retakes and max_retakes', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettings,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...mockSettings,
                    allow_retakes: false,
                    max_retakes: 0,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('PATCH');
      req.json = vi.fn().mockResolvedValue({
        allowRetakes: false,
        maxRetakes: 0,
      });

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.allowRetakes).toBe(false);
      expect(json.data.maxRetakes).toBe(0);
    });

    it('successfully updates passing_score_percentage', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettings,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...mockSettings,
                    passing_score_percentage: 80,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('PATCH');
      req.json = vi.fn().mockResolvedValue({ passingScorePercentage: 80 });

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.passingScorePercentage).toBe(80);
    });

    it('successfully updates show_answers_after_submit', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettings,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...mockSettings,
                    show_answers_after_submit: false,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('PATCH');
      req.json = vi.fn().mockResolvedValue({ showAnswersAfterSubmit: false });

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.showAnswersAfterSubmit).toBe(false);
    });

    it('handles database error on update', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettings,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Database error'),
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('PATCH');
      req.json = vi.fn().mockResolvedValue({ timeLimitMinutes: 30 });

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error.message).toBe('Failed to update quiz settings');
    });

    it('allows partial updates', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettings,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...mockSettings,
                    time_limit_minutes: 60,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);

      const req = mockRequest('PATCH');
      // Only update time limit, others should remain unchanged
      req.json = vi.fn().mockResolvedValue({ timeLimitMinutes: 60 });

      const response = await PATCH(req, mockContext);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.timeLimitMinutes).toBe(60);
      expect(json.data.passingScorePercentage).toBe(70); // unchanged
      expect(json.data.maxRetakes).toBe(3); // unchanged
    });
  });
});
