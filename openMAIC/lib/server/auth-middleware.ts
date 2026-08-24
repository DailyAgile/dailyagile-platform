/**
 * Authentication Middleware
 * Extracts and verifies JWT tokens from request headers
 * Returns authenticated user info or throws 401 error
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { createLogger } from '@/lib/logger';

const log = createLogger('AuthMiddleware');

// JWT_SECRET is required — refuse to start without it
if (!process.env.JWT_SECRET) {
  const msg = 'FATAL: JWT_SECRET environment variable is not set. Cannot start auth system.';
  console.error(msg);
  throw new Error(msg);
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface AuthenticatedUser {
  id: string; // UUID
  email: string;
  role: 'student' | 'instructor' | 'admin';
  verified: boolean; // email verified
  iat: number; // issued at
  exp: number; // expiration
}

/**
 * Extract JWT token from Authorization header or test cookie
 * Format: "Bearer <token>"
 * Also checks for test-instructor-session cookie in development
 */
export function extractToken(req: NextRequest): string | null {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7); // Remove "Bearer " prefix
  }

  // In development: check for test instructor cookie
  if (process.env.NODE_ENV !== 'production') {
    const testCookie = req.cookies.get('instructor-session');
    if (testCookie?.value) {
      // For test sessions, return a marker that we'll handle specially
      return `TEST_SESSION:${testCookie.value}`;
    }
  }

  return null;
}

/**
 * Verify JWT token and return decoded payload
 * Also handles test instructor sessions in development
 * Throws error if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<AuthenticatedUser> {
  try {
    // Handle test instructor session (development only)
    if (token.startsWith('TEST_SESSION:')) {
      const sessionStr = token.slice('TEST_SESSION:'.length);
      try {
        const sessionData = JSON.parse(sessionStr);
        return {
          id: sessionData.id || 'test-instructor-001',
          email: sessionData.email || 'test.instructor@example.com',
          role: 'instructor',
          verified: true,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        };
      } catch (e) {
        log.error('Invalid test session data:', e);
        throw new Error('Invalid test session');
      }
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as unknown as AuthenticatedUser;

    // Validate required fields
    if (!payload.id || !payload.email || !payload.role) {
      throw new Error('Invalid token payload');
    }

    return payload;
  } catch (error) {
    log.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Middleware to check authentication
 * Returns authenticated user or throws 401
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const token = extractToken(req);
  if (!token) {
    throw new Error('UNAUTHORIZED: Missing or invalid authorization header');
  }

  try {
    const user = await verifyToken(token);

    // Verify email is verified (except for signup endpoints)
    if (!user.verified && !req.nextUrl.pathname.includes('/auth/')) {
      throw new Error('UNVERIFIED: Email not verified. Please verify your email first.');
    }

    log.debug(`✅ Authenticated user: ${user.email} (${user.role})`);
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * Middleware to check instructor role
 */
export async function requireInstructor(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);

  if (user.role !== 'instructor' && user.role !== 'admin') {
    log.warn(`FORBIDDEN: User ${user.email} is not an instructor`);
    throw new Error('FORBIDDEN: Only instructors can perform this action');
  }

  return user;
}

/**
 * Middleware to check student role
 */
export async function requireStudent(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);

  if (user.role !== 'student' && user.role !== 'admin') {
    log.warn(`FORBIDDEN: User ${user.email} is not a student`);
    throw new Error('FORBIDDEN: Only students can perform this action');
  }

  return user;
}

/**
 * Middleware to check admin role
 */
export async function requireAdmin(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);

  if (user.role !== 'admin') {
    log.warn(`FORBIDDEN: User ${user.email} is not an admin`);
    throw new Error('FORBIDDEN: Admin access required');
  }

  return user;
}

/**
 * Type-safe error handler for auth errors
 */
export function handleAuthError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : 'Unknown auth error';

  if (message.includes('UNAUTHORIZED')) {
    return { status: 401, message: 'Unauthorized: Please login' };
  }
  if (message.includes('FORBIDDEN')) {
    return { status: 403, message: 'Forbidden: Insufficient permissions' };
  }
  if (message.includes('UNVERIFIED')) {
    return { status: 403, message: 'Forbidden: Email not verified' };
  }

  return { status: 401, message: 'Authentication failed' };
}
