/**
 * INSTRUCTOR AUTHENTICATION UTILITIES (OPTION 1)
 *
 * STATUS: PREPARED BUT NOT ACTIVE
 * To activate: rename to instructor-auth.ts and uncomment all code
 *
 * Purpose:
 * - Store/retrieve instructor JWT token in localStorage
 * - Send token in Authorization header for API calls
 * - Validate token expiration
 * - Handle logout
 */

/*
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorAuth');

const TOKEN_KEY = 'instructor_token';
const EMAIL_KEY = 'instructor_email';

export interface InstructorTokenPayload {
  id: string;
  email: string;
  role: 'instructor' | 'admin';
  verified: boolean;
  iat: number;
  exp: number;
}

// ─────────────────────────────────────────────────────────────
// STORE TOKEN
// ─────────────────────────────────────────────────────────────
export function storeInstructorToken(token: string, email: string): void {
  if (typeof window === 'undefined') {
    throw new Error('storeInstructorToken must be called from browser');
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
  log.debug(`Stored instructor token for ${email}`);
}

// ─────────────────────────────────────────────────────────────
// RETRIEVE TOKEN
// ─────────────────────────────────────────────────────────────
export function getInstructorToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ─────────────────────────────────────────────────────────────
// RETRIEVE EMAIL
// ─────────────────────────────────────────────────────────────
export function getInstructorEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EMAIL_KEY);
}

// ─────────────────────────────────────────────────────────────
// CHECK IF LOGGED IN
// ─────────────────────────────────────────────────────────────
export function isInstructorLoggedIn(): boolean {
  return Boolean(getInstructorToken());
}

// ─────────────────────────────────────────────────────────────
// CLEAR TOKEN (LOGOUT)
// ─────────────────────────────────────────────────────────────
export function clearInstructorToken(): void {
  if (typeof window === 'undefined') return;

  const email = getInstructorEmail();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);

  if (email) {
    log.info(`✅ Instructor logout: ${email}`);
  }
}

// ─────────────────────────────────────────────────────────────
// DECODE TOKEN (CLIENT-SIDE ONLY)
// ─────────────────────────────────────────────────────────────
export function decodeInstructorToken(token: string): InstructorTokenPayload | null {
  try {
    // JWT has 3 parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (middle part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString()
    ) as InstructorTokenPayload;

    return payload;
  } catch (error) {
    log.error('Failed to decode instructor token:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// CHECK TOKEN EXPIRATION
// ─────────────────────────────────────────────────────────────
export function isInstructorTokenExpired(): boolean {
  const token = getInstructorToken();
  if (!token) return true;

  const payload = decodeInstructorToken(token);
  if (!payload) return true;

  // Check if expiration time has passed
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

// ─────────────────────────────────────────────────────────────
// GET AUTHORIZATION HEADER
// ─────────────────────────────────────────────────────────────
export function getInstructorAuthHeader(): HeadersInit {
  const token = getInstructorToken();

  if (!token) {
    return {};
  }

  return {
    'Authorization': `Bearer ${token}`,
  };
}

// ─────────────────────────────────────────────────────────────
// FETCH WITH INSTRUCTOR AUTH
// ─────────────────────────────────────────────────────────────
export async function fetchWithInstructorAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...options.headers,
    ...getInstructorAuthHeader(),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

// ─────────────────────────────────────────────────────────────
// REFRESH TOKEN (FOR FUTURE USE)
// ─────────────────────────────────────────────────────────────
// This can be implemented later if you add refresh token support
//
// export async function refreshInstructorToken(): Promise<boolean> {
//   try {
//     const response = await fetch('/api/auth/instructor-refresh', {
//       method: 'POST',
//       credentials: 'include',
//     });
//
//     if (!response.ok) return false;
//
//     const data = await response.json();
//     if (data.token) {
//       storeInstructorToken(data.token, data.instructor.email);
//       return true;
//     }
//
//     return false;
//   } catch (error) {
//     log.error('Token refresh failed:', error);
//     return false;
//   }
// }

*/

// Placeholder export while commented
export const COMMENTED_OUT_INSTRUCTOR_AUTH = true;
