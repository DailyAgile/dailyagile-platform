/**
 * CSRF Token Protection
 * Generates, stores, and validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 *
 * Token Flow:
 * 1. Server generates token and sets as HttpOnly cookie
 * 2. Client reads token from cookie
 * 3. Client includes token in X-CSRF-Token header for POST/PATCH/DELETE
 * 4. Server validates token from header matches cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('CSRF');

// CSRF_SECRET is optional (for development, can use a default)
// In production, this should be set via environment variables
const CSRF_SECRET = process.env.CSRF_SECRET || 'development-csrf-secret-not-for-production';

// Cookie configuration for CSRF tokens
const CSRF_COOKIE_OPTIONS = {
  name: 'csrf-token',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false, // Must be accessible to JavaScript to include in headers
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24, // 24 hours
};

/**
 * Generate a new CSRF token
 * Returns a random 32-byte hex string using Web Crypto API
 * Compatible with Edge Runtime
 */
export function generateCSRFToken(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    // Use Web Crypto API (works in Node.js 15+ and browsers)
    const buffer = new Uint8Array(32);
    globalThis.crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback for environments without crypto support (shouldn't happen in modern Node.js)
  throw new Error('Crypto API not available. Cannot generate CSRF token.');
}

/**
 * Set CSRF token in response cookie
 * Server generates token and sets it in HttpOnly cookie
 */
export function setCSRFTokenCookie(response: NextResponse): string {
  const token = generateCSRFToken();

  response.cookies.set(CSRF_COOKIE_OPTIONS.name, token, {
    secure: CSRF_COOKIE_OPTIONS.secure,
    httpOnly: CSRF_COOKIE_OPTIONS.httpOnly,
    sameSite: CSRF_COOKIE_OPTIONS.sameSite,
    maxAge: CSRF_COOKIE_OPTIONS.maxAge,
  });

  log.debug(`CSRF token set in response cookie`);
  return token;
}

/**
 * Get CSRF token from request cookie
 * Used during validation to compare with header token
 */
export function getCSRFTokenFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get(CSRF_COOKIE_OPTIONS.name);
  return token?.value || null;
}

/**
 * Get CSRF token from request header
 * Client must send token in X-CSRF-Token header
 */
export function getCSRFTokenFromHeader(req: NextRequest): string | null {
  return req.headers.get('X-CSRF-Token');
}

/**
 * Validate CSRF token
 * Compares token from header with token from cookie
 * Throws error if tokens don't match or are missing
 */
export function validateCSRFToken(
  req: NextRequest,
  options?: { skipValidation?: boolean },
): { valid: boolean; reason?: string } {
  // Allow skipping CSRF validation for specific endpoints (e.g., public API endpoints)
  if (options?.skipValidation) {
    return { valid: true };
  }

  const cookieToken = getCSRFTokenFromCookie(req);
  const headerToken = getCSRFTokenFromHeader(req);

  if (!cookieToken) {
    log.warn('CSRF validation failed: no token in cookie');
    return {
      valid: false,
      reason: 'CSRF token not found in cookie. Please refresh the page.',
    };
  }

  if (!headerToken) {
    log.warn('CSRF validation failed: no token in header');
    return {
      valid: false,
      reason: 'CSRF token not found in request header. Form submission aborted.',
    };
  }

  // Compare tokens using constant-time comparison to prevent timing attacks
  const match = constantTimeCompare(cookieToken, headerToken);

  if (!match) {
    log.warn('CSRF validation failed: token mismatch');
    return {
      valid: false,
      reason: 'CSRF token mismatch. Possible CSRF attack detected.',
    };
  }

  log.debug('CSRF token validation successful');
  return { valid: true };
}

/**
 * Constant-time string comparison
 * Prevents timing attacks by always comparing all characters
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Is this request exempt from CSRF validation?
 * GET, HEAD, OPTIONS requests are safe and don't need CSRF tokens
 * Streaming endpoints may also be exempt
 */
export function isCSRFExempt(req: NextRequest): boolean {
  const method = req.method.toUpperCase();

  // Safe HTTP methods don't need CSRF protection
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(method)) {
    return true;
  }

  // Public endpoints that don't require auth are typically exempt
  const exemptPaths = [
    '/api/health',
    '/api/features',
    '/api/server-providers',
  ];

  const pathname = req.nextUrl.pathname;
  return exemptPaths.some((path) => pathname.startsWith(path));
}

/**
 * Middleware to validate CSRF token in requests
 * Must be used on all POST/PATCH/DELETE endpoints
 * Usage in API routes:
 *   export async function POST(req: NextRequest) {
 *     const csrfValidation = validateCSRFToken(req);
 *     if (!csrfValidation.valid) {
 *       return apiError('CSRF_VALIDATION_FAILED', 403, csrfValidation.reason);
 *     }
 *     // ... rest of handler
 *   }
 */
export async function requireCSRFValidation(
  req: NextRequest,
  options?: { skipValidation?: boolean },
): Promise<{ valid: boolean; error?: string }> {
  // Skip validation for safe methods and exempt endpoints
  if (isCSRFExempt(req)) {
    return { valid: true };
  }

  const validation = validateCSRFToken(req, options);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.reason || 'CSRF validation failed',
    };
  }

  return { valid: true };
}
