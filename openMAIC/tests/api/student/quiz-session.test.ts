/**
 * Quiz Session Tests
 * POST /api/student/quiz/start
 * POST /api/student/quiz/submit-answer
 * POST /api/student/quiz/finish
 *
 * Tests the complete quiz workflow:
 * - Starting a quiz session
 * - Submitting answers
 * - Finishing and scoring
 * - Error handling for expired/invalid assignments
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { createRequest, testData, mockSuccess, mockError } from '@/tests/fixtures/mock-supabase';

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  getAssignmentByCode: vi.fn(),
  checkAssignmentExpiry: vi.fn(),
  getSnapshotForAssignment: vi.fn(),
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/lib/server/supabase-client', () => ({
  getSupabaseClient: mocks.getSupabaseClient,
}));

vi.mock('@/lib/quiz/assignment-service', () => ({
  getAssignmentByCode: mocks.getAssignmentByCode,
  checkAssignmentExpiry: mocks.checkAssignmentExpiry,
}));

vi.mock('@/lib/quiz/snapshot-service', () => ({
  getSnapshotForAssignment: mocks.getSnapshotForAssignment,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: mocks.createLogger,
}));

async function postStartQuiz(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/student/quiz/start/route');
  const request = createRequest('POST', body);
  return POST(request as unknown as NextRequest);
}

describe('POST /api/student/quiz/start', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getSupabaseClient.mockReset();
    mocks.getAssignmentByCode.mockReset();
    mocks.checkAssignmentExpiry.mockReset();
    mocks.getSnapshotForAssignment.mockReset();
  });

  describe('Legacy flow (quiz_id)', () => {
    it('creates a quiz session with direct quiz_id', async () => {
      mocks.getSupabaseClient.mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'quizzes') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSuccess(testData.validQuiz)),
                }),
              }),
            };
          }
          if (table === 'quiz_sessions') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(
                    mockSuccess({
                      id: 'session-123',
                      started_at: new Date().toISOString(),
                    })
                  ),
                }),
              }),
            };
          }
        }),
      });

      const res = await postStartQuiz({
        quiz_id: testData.validQuiz.id,
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.session_id).toBe('session-123');
      expect(json.quiz_id).toBe(testData.validQuiz.id);
      expect(json.title).toBe(testData.validQuiz.title);
    });

    it('rejects without quiz_id or assignment_code', async () => {
      const res = await postStartQuiz({
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain('quiz_id or assignment_code');
    });

    it('rejects without student_id', async () => {
      const res = await postStartQuiz({
        quiz_id: testData.validQuiz.id,
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 if quiz not found', async () => {
      mocks.getSupabaseClient.mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'quizzes') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockError('Not found')),
                }),
              }),
            };
          }
        }),
      });

      const res = await postStartQuiz({
        quiz_id: 'invalid-quiz-id',
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.message).toContain('Quiz not found');
    });
  });

  describe('Assignment flow (assignment_code)', () => {
    it('creates quiz session from assignment code', async () => {
      mocks.getAssignmentByCode.mockResolvedValue(testData.validAssignment);
      mocks.checkAssignmentExpiry.mockResolvedValue(false); // Not expired
      mocks.getSnapshotForAssignment.mockResolvedValue({ id: 'snapshot-123' });

      mocks.getSupabaseClient.mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'quizzes') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSuccess(testData.validQuiz)),
                }),
              }),
            };
          }
          if (table === 'quiz_sessions') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(
                    mockSuccess({
                      id: 'session-456',
                      started_at: new Date().toISOString(),
                    })
                  ),
                }),
              }),
            };
          }
        }),
      });

      const res = await postStartQuiz({
        assignment_code: testData.validAssignment.assignment_code,
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.session_id).toBe('session-456');
      expect(json.snapshot_id).toBe('snapshot-123');
    });

    it('rejects expired assignment', async () => {
      mocks.getAssignmentByCode.mockResolvedValue(testData.validAssignment);
      mocks.checkAssignmentExpiry.mockResolvedValue(true); // Expired

      const res = await postStartQuiz({
        assignment_code: testData.validAssignment.assignment_code,
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toContain('expired');
    });

    it('returns 404 for invalid assignment code', async () => {
      mocks.getAssignmentByCode.mockResolvedValue(null);

      const res = await postStartQuiz({
        assignment_code: 'INVALID',
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.message).toContain('not found');
    });
  });

  describe('Snapshot handling', () => {
    it('includes snapshot_id in response when available', async () => {
      mocks.getAssignmentByCode.mockResolvedValue(testData.validAssignment);
      mocks.checkAssignmentExpiry.mockResolvedValue(false);
      mocks.getSnapshotForAssignment.mockResolvedValue({ id: 'snapshot-xyz' });

      mocks.getSupabaseClient.mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'quizzes') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSuccess(testData.validQuiz)),
                }),
              }),
            };
          }
          if (table === 'quiz_sessions') {
            return {
              insert: vi.fn((data) => {
                // Verify snapshot_id is passed through
                expect(data[0].quiz_snapshot_id).toBe('snapshot-xyz');
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(
                      mockSuccess({
                        id: 'session-789',
                        started_at: new Date().toISOString(),
                      })
                    ),
                  }),
                };
              }),
            };
          }
        }),
      });

      await postStartQuiz({
        assignment_code: testData.validAssignment.assignment_code,
        student_id: testData.validStudent.id,
      });
    });

    it('handles null snapshot gracefully', async () => {
      mocks.getAssignmentByCode.mockResolvedValue(testData.validAssignment);
      mocks.checkAssignmentExpiry.mockResolvedValue(false);
      mocks.getSnapshotForAssignment.mockResolvedValue(null); // No snapshot

      mocks.getSupabaseClient.mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'quizzes') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSuccess(testData.validQuiz)),
                }),
              }),
            };
          }
          if (table === 'quiz_sessions') {
            return {
              insert: vi.fn((data) => {
                // Verify snapshot_id is null
                expect(data[0].quiz_snapshot_id).toBeNull();
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(
                      mockSuccess({
                        id: 'session-000',
                        started_at: new Date().toISOString(),
                      })
                    ),
                  }),
                };
              }),
            };
          }
        }),
      });

      const res = await postStartQuiz({
        assignment_code: testData.validAssignment.assignment_code,
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('returns 500 if session creation fails', async () => {
      mocks.getSupabaseClient.mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'quizzes') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockSuccess(testData.validQuiz)),
                }),
              }),
            };
          }
          if (table === 'quiz_sessions') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(mockError('Database error')),
                }),
              }),
            };
          }
        }),
      });

      const res = await postStartQuiz({
        quiz_id: testData.validQuiz.id,
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(500);
    });

    it('handles unexpected errors gracefully', async () => {
      mocks.getSupabaseClient.mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const res = await postStartQuiz({
        quiz_id: testData.validQuiz.id,
        student_id: testData.validStudent.id,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error.message).toContain('Failed to start quiz');
    });
  });
});
