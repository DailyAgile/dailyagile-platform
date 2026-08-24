/**
 * Instructor OTP (One-Time Password) Management
 * Handles secure 6-digit code generation, signing, and verification
 * Proven pattern from reconnection project
 */

import { createHmac } from 'crypto';

const SECRET = process.env.OTP_SECRET ?? 'dev-secret-please-set-OTP_SECRET-in-env';

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
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

// ── OTP pending cookie (10 min, stores the actual code) ───────────────────────

export function makeOtpCookie(email: string, code: string): string {
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes
  const payload = encode({ email, code, exp });
  const sig = sign(payload);
  return encode({ payload, sig });
}

export function parseOtpCookie(raw: string): { email: string; code: string } | null {
  const outer = decode<{ payload: string; sig: string }>(raw);
  if (!outer) return null;
  if (sign(outer.payload) !== outer.sig) return null; // Tampered
  const inner = decode<{ email: string; code: string; exp: number }>(outer.payload);
  if (!inner) return null;
  if (Date.now() > inner.exp) return null; // Expired
  return { email: inner.email, code: inner.code };
}

// ── Auth session cookie (7 days) ──────────────────────────────────────────────

export function makeInstructorAuthCookie(instructorId: string, email: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = encode({ instructorId, email, exp });
  const sig = sign(payload);
  return encode({ payload, sig });
}

export function parseInstructorAuthCookie(raw: string): { instructorId: string; email: string } | null {
  const outer = decode<{ payload: string; sig: string }>(raw);
  if (!outer) return null;
  if (sign(outer.payload) !== outer.sig) return null; // Tampered
  const inner = decode<{ instructorId: string; email: string; exp: number }>(outer.payload);
  if (!inner) return null;
  if (Date.now() > inner.exp) return null; // Expired
  return { instructorId: inner.instructorId, email: inner.email };
}
