/**
 * Instructor Authentication Utilities
 * - Password hashing (bcrypt)
 * - Token generation (email verification, password reset)
 * - Session cookie management
 */

import { createHmac, randomBytes } from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET ?? 'dev-secret-please-set-OTP_SECRET-in-env';

// ── Password Hashing ──────────────────────────────────────────────────────

/**
 * Hash password using bcryptjs (pure JavaScript, no native modules)
 */
export async function hashPassword(password: string): Promise<string> {
  const bcryptjs = await import('bcryptjs');
  return bcryptjs.hash(password, 10);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcryptjs = await import('bcryptjs');
  return bcryptjs.compare(password, hash);
}

// ── Token Generation ──────────────────────────────────────────────────────

/**
 * Generate email verification token (secure, random)
 * Used for: email verification links
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate password reset token (secure, random)
 * Used for: password reset links
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

// ── Session Cookie Management ──────────────────────────────────────────────

function sign(payload: string): string {
  return createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
}

function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function decode<T>(raw: string): T | null {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

/**
 * Create instructor session cookie (7 days)
 */
export function makeInstructorSessionCookie(instructorId: string, email: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = encode({ instructorId, email, exp });
  const sig = sign(payload);
  return encode({ payload, sig });
}

/**
 * Parse and validate instructor session cookie
 */
export function parseInstructorSessionCookie(raw: string): { instructorId: string; email: string } | null {
  const outer = decode<{ payload: string; sig: string }>(raw);
  if (!outer) return null;
  if (sign(outer.payload) !== outer.sig) return null; // Tampered
  const inner = decode<{ instructorId: string; email: string; exp: number }>(outer.payload);
  if (!inner) return null;
  if (Date.now() > inner.exp) return null; // Expired
  return { instructorId: inner.instructorId, email: inner.email };
}
