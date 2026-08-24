/**
 * JWT Token Utilities
 * Generate and verify JWT tokens for authentication
 */

import { SignJWT, jwtVerify } from 'jose';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger('JWTUtils');

// JWT_SECRET is required — refuse to start without it
if (!process.env.JWT_SECRET) {
  const msg = 'FATAL: JWT_SECRET environment variable is not set. Cannot start auth system.';
  console.error(msg);
  throw new Error(msg);
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const JWT_EXPIRY = '7d'; // 7 days for students/instructors

export interface TokenPayload {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  verified: boolean;
}

/**
 * Generate JWT token
 * @param payload - User data to encode
 * @returns JWT token string
 */
export async function generateToken(payload: TokenPayload): Promise<string> {
  try {
    const token = await new SignJWT({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      verified: payload.verified,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(JWT_SECRET);

    log.debug(`✅ Token generated for ${payload.email} (${payload.role})`);
    return token;
  } catch (error) {
    log.error('Failed to generate token:', error);
    throw new Error('Token generation failed');
  }
}

/**
 * Verify JWT token
 * @param token - JWT token string
 * @returns Decoded payload
 */
export async function verifyJWT(token: string): Promise<TokenPayload> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as TokenPayload;
  } catch (error) {
    log.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate 2-step verification code (6 digits)
 * 🔒 SECURITY: Uses crypto.randomBytes() for cryptographic randomness (NOT Math.random())
 */
export function generate2FACode(): string {
  // Generate cryptographically secure random 6-digit code
  // crypto.randomInt is available in Node 16.6.0+
  const code = crypto.randomInt(100000, 999999);
  return code.toString();
}

/**
 * Calculate expiry time for 2FA code (10 minutes from now)
 */
export function calculate2FAExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}

/**
 * Validate 2FA code
 * @param providedCode - Code user entered
 * @param storedCode - Code stored in database
 * @param expiryTime - When code expires
 */
export function validate2FACode(providedCode: string, storedCode: string, expiryTime: Date): boolean {
  // Check if code expired
  if (new Date() > expiryTime) {
    log.warn('2FA code expired');
    return false;
  }

  // Check if code matches (case-insensitive for flexibility)
  if (providedCode.trim() !== storedCode.trim()) {
    log.warn('2FA code mismatch');
    return false;
  }

  return true;
}

/**
 * Verify JWT token and extract user ID
 * @param token - JWT token string
 * @returns User ID from token payload
 */
export async function verifyAndExtractUserId(token: string): Promise<string> {
  try {
    const payload = await verifyJWT(token);
    return payload.id;
  } catch (error) {
    log.error('Failed to verify and extract user ID:', error);
    throw new Error('Invalid token');
  }
}
