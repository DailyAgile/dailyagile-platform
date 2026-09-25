/**
 * Student Login Tests
 * POST /api/auth/student/login
 *
 * Tests authentication flow including:
 * - Valid credential handling
 * - JWT token generation
 * - Email verification requirement
 * - Error cases (invalid credentials, non-existent user)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createRequest, testData, mockSuccess, mockError } from '@/tests/fixtures/mock-supabase';

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  checkAccountLock: vi.fn().mockResolvedValue({ locked: false, unlocksAt: null }),
  checkLoginRateLimit: vi.fn().mockResolvedValue({ allowed: true, remainingAttempts: 5, resetTime: null }),
  resetLoginAttempts: vi.fn().mockResolvedValue(undefined),
  lockAccount: vi.fn().mockResolvedValue(undefined),
  getRateLimitHeaders: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/server/supabase-client', () => ({
  getSupabaseClient: mocks.getSupabaseClient,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: mocks.createLogger,
}));

vi.mock('@/lib/server/rate-limit', () => ({
  checkAccountLock: mocks.checkAccountLock,
  checkLoginRateLimit: mocks.checkLoginRateLimit,
  resetLoginAttempts: mocks.resetLoginAttempts,
  lockAccount: mocks.lockAccount,
  getRateLimitHeaders: mocks.getRateLimitHeaders,
}));

async function postLogin(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/auth/student/login/route');
  const request = createRequest('POST', body);
  return POST(request as unknown as NextRequest);
}

/**
 * Helper to create a password hash
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + (process.env.PASSWORD_SALT || '')).digest('hex');
}

describe('POST /api/auth/student/login', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getSupabaseClient.mockReset();
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.PASSWORD_SALT = 'test-salt';
  });

  it('returns JWT token for valid credentials', async () => {
    const validStudent = {
      id: testData.validStudent.id,
      email: testData.validStudent.email,
      password_hash: hashPassword(testData.validStudent.password),
      email_verified: true,
    };

    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSuccess(validStudent)),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSuccess({})),
        }),
      }),
    });

    const res = await postLogin({
      email: testData.validStudent.email,
      password: testData.validStudent.password,
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();
    expect(json.data.student_id).toBe(testData.validStudent.id);
    expect(json.data.email).toBe(testData.validStudent.email);

    // Verify token format (JWT: header.payload.signature)
    const parts = json.data.token.split('.');
    expect(parts.length).toBe(3);
  });

  it('rejects login with missing email', async () => {
    const res = await postLogin({
      password: testData.validStudent.password,
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('Email');
  });

  it('rejects login with missing password', async () => {
    const res = await postLogin({
      email: testData.validStudent.email,
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('password');
  });

  it('rejects login for non-existent email', async () => {
    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockError('No matching email')),
          }),
        }),
      }),
    });

    const res = await postLogin({
      email: 'nonexistent@example.com',
      password: testData.validStudent.password,
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message.toLowerCase()).toContain('invalid');
  });

  it('rejects login with incorrect password', async () => {
    const validStudent = {
      id: testData.validStudent.id,
      email: testData.validStudent.email,
      password_hash: hashPassword(testData.validStudent.password),
      email_verified: true,
    };

    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSuccess(validStudent)),
          }),
        }),
      }),
    });

    const res = await postLogin({
      email: testData.validStudent.email,
      password: 'WrongPassword123',
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message.toLowerCase()).toContain('invalid');
  });

  it('rejects login if email is not verified', async () => {
    const unverifiedStudent = {
      id: testData.validStudent.id,
      email: testData.validStudent.email,
      password_hash: hashPassword(testData.validStudent.password),
      email_verified: false, // Not verified
    };

    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSuccess(unverifiedStudent)),
          }),
        }),
      }),
    });

    const res = await postLogin({
      email: testData.validStudent.email,
      password: testData.validStudent.password,
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message.toLowerCase()).toContain('verify');
  });

  it('updates last_login_at timestamp on successful login', async () => {
    const validStudent = {
      id: testData.validStudent.id,
      email: testData.validStudent.email,
      password_hash: hashPassword(testData.validStudent.password),
      email_verified: true,
    };

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(mockSuccess({})),
    });

    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn((table) => {
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSuccess(validStudent)),
              }),
            }),
            update: updateMock,
          };
        }
      }),
    });

    await postLogin({
      email: testData.validStudent.email,
      password: testData.validStudent.password,
    });

    expect(updateMock).toHaveBeenCalledWith({
      last_login_at: expect.any(String),
    });
  });

  it('handles database errors gracefully', async () => {
    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      }),
    });

    const res = await postLogin({
      email: testData.validStudent.email,
      password: testData.validStudent.password,
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.message).toContain('server error');
  });
});
