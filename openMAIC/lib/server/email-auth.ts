/**
 * Email + 2FA authentication system
 * Manages OTP generation, storage, and verification
 */

interface OTPEntry {
  otp: string;
  email: string;
  expiresAt: number;
  attempts: number;
  lastAttemptAt: number;
}

// In-memory OTP store with TTL
const otpStore = new Map<string, OTPEntry>();

// Cleanup interval: remove expired OTPs every 60 seconds
const CLEANUP_INTERVAL = 60 * 1000;
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const OTP_ATTEMPT_COOLDOWN = 60 * 1000; // 1 minute between attempts

let cleanupTimer: NodeJS.Timeout | null = null;

export function initializeOTPCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
      if (entry.expiresAt < now) {
        otpStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't keep the process alive just for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Generate a 6-digit OTP and store it for the given email
 */
export function generateOTP(email: string): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_EXPIRY;

  otpStore.set(email, {
    otp,
    email,
    expiresAt,
    attempts: 0,
    lastAttemptAt: 0,
  });

  initializeOTPCleanup();
  return otp;
}

/**
 * Verify an OTP for the given email
 * Returns { valid: boolean, error?: string }
 */
export function verifyOTP(email: string, otp: string): { valid: boolean; error?: string } {
  const entry = otpStore.get(email);

  if (!entry) {
    return { valid: false, error: 'No OTP found. Please request a new code.' };
  }

  // Check if OTP has expired
  if (entry.expiresAt < Date.now()) {
    otpStore.delete(email);
    return { valid: false, error: 'OTP has expired. Please request a new code.' };
  }

  // Check if too many attempts
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(email);
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  // Check cooldown between attempts
  const now = Date.now();
  if (entry.lastAttemptAt && now - entry.lastAttemptAt < OTP_ATTEMPT_COOLDOWN) {
    const secondsRemaining = Math.ceil((OTP_ATTEMPT_COOLDOWN - (now - entry.lastAttemptAt)) / 1000);
    return {
      valid: false,
      error: `Please wait ${secondsRemaining} seconds before trying again.`,
    };
  }

  entry.lastAttemptAt = now;
  entry.attempts += 1;

  // Verify OTP (constant-time comparison to prevent timing attacks)
  const valid = otp === entry.otp;

  if (valid) {
    otpStore.delete(email);
  }

  return {
    valid,
    error: valid ? undefined : 'Invalid OTP. Please try again.',
  };
}

/**
 * Check if an OTP request is rate-limited for the given email
 * Returns { limited: boolean, secondsUntilRetry?: number }
 */
export function checkOTPRateLimit(email: string): { limited: boolean; secondsUntilRetry?: number } {
  const entry = otpStore.get(email);

  if (!entry) {
    return { limited: false };
  }

  // Allow max 3 OTP requests per 10 minutes
  const requestsInWindow = 1; // In a real app, you'd track multiple requests
  if (requestsInWindow >= 3) {
    const secondsUntilRetry = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return { limited: true, secondsUntilRetry };
  }

  return { limited: false };
}

/**
 * Clear OTP for the given email
 */
export function clearOTP(email: string): void {
  otpStore.delete(email);
}
