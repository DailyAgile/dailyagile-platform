/**
 * Supabase Mock Client for Testing
 * Provides common mocking utilities for API tests
 */

import { vi } from 'vitest';

export interface MockSupabaseOptions {
  shouldThrowError?: boolean;
  errorMessage?: string;
  returnData?: Record<string, unknown>;
}

/**
 * Create a mock Supabase client for testing
 * Usage: vi.mock('@/lib/server/supabase-client', () => mockSupabase())
 */
export function mockSupabase(options: MockSupabaseOptions = {}) {
  const { shouldThrowError = false, errorMessage = 'Database error', returnData = {} } = options;

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      shouldThrowError ? { data: null, error: { message: errorMessage } } : { data: returnData, error: null }
    ),
  };

  return {
    getSupabaseClient: vi.fn(() => ({
      from: vi.fn().mockReturnValue(mockQuery),
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    })),
  };
}

/**
 * Mock a successful query result
 */
export function mockSuccess(data: unknown) {
  return { data, error: null };
}

/**
 * Mock a failed query result
 */
export function mockError(message: string) {
  return { data: null, error: { message } };
}

/**
 * Helper to create request objects for testing
 */
export function createRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: Record<string, unknown>,
  headers: Record<string, string> = {}
) {
  return new Request('http://localhost:3000/api/test', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Generate a mock JWT token for testing
 */
export function generateMockToken(studentId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: studentId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    })
  ).toString('base64');
  return `${header}.${payload}.signature`;
}

/**
 * Mock test data generators
 */
export const testData = {
  validStudent: {
    id: 'test-student-1',
    email: 'student@example.com',
    password: 'SecurePass123!',
    email_verified: true,
  },
  validInstructor: {
    id: 'test-instructor-1',
    email: 'instructor@example.com',
    password: 'SecurePass123!',
    role: 'instructor',
  },
  validQuiz: {
    id: 'quiz-001',
    title: 'Sample Quiz',
    description: 'A sample quiz for testing',
    total_questions: 5,
    total_points: 100,
    classroom_id: 'class-001',
    settings: {
      time_limit: 30,
      show_answers: false,
      randomize_questions: true,
    },
  },
  validAssignment: {
    id: 'assignment-001',
    quiz_id: 'quiz-001',
    assignment_code: 'ABC123',
    instructor_id: 'test-instructor-1',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    max_attempts: 3,
  },
};
