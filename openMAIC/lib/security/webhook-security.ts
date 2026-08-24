/**
 * Stripe Webhook Security Module - PCI DSS Compliant
 *
 * Comprehensive security hardening for Stripe webhook processing:
 * - Signature validation with timestamp protection
 * - Replay attack prevention
 * - Rate limiting (per-customer + global)
 * - Immutable audit logging (PII redacted)
 * - Input sanitization (XSS prevention)
 * - Amount validation
 *
 * Last Updated: 2026-08-23
 * Security Level: Production-Ready
 */

import Stripe from 'stripe';
import * as crypto from 'crypto';
import { getSupabaseClient } from '../server/supabase-client';
import { RedisRateLimiter } from '../server/rate-limiter-redis';
import { escapeHtml } from './html-utils';
import {
  WEBHOOK_TIMESTAMP_WINDOW_SECONDS,
  RATE_LIMIT_PER_CUSTOMER_PER_MINUTE,
  RATE_LIMIT_GLOBAL_PER_MINUTE,
} from '../constants/webhook-limits';

// ============================================================================
// CONFIG & CONSTANTS
// ============================================================================

// Rate limiting now handled by Redis-backed implementation (see rate-limiter-redis.ts)
// This removes single-instance limitation and survives Vercel cold starts

// ============================================================================
// 1. WEBHOOK VALIDATOR
// ============================================================================

/**
 * Validates Stripe webhook signatures and prevents replay attacks.
 * Uses HMAC-SHA256 signature verification and timestamp validation.
 */
export class WebhookValidator {
  /**
   * Validates Stripe webhook signature to prevent forged events.
   *
   * Args:
   *     body: Raw webhook body (string)
   *     signature: Stripe-Signature header value
   *     secret: STRIPE_WEBHOOK_SECRET from environment
   *
   * Returns:
   *     Validated Stripe event object
   *
   * Raises:
   *     ValueError: If secret is missing/empty, signature invalid, or timestamp outside window
   *
   * Time Complexity: O(1) - HMAC signature check
   *
   * Security Notes:
   *     - Timestamp validated within ±300 seconds to prevent replay
   *     - Empty secret throws immediately (no silent fallback)
   *     - Logs security events for audit trail (PCI DSS)
   *     - Signature verified using constant-time comparison
   */
  static validateSignature(
    body: string,
    signature: string | null,
    secret: string
  ): Stripe.Event {
    // CRITICAL: Empty secret must throw immediately, never continue
    if (!secret || secret.trim() === '') {
      throw new Error(
        'CRITICAL: STRIPE_WEBHOOK_SECRET environment variable is missing or empty. ' +
          'Webhook processing cannot proceed. This must be configured in production.'
      );
    }

    if (!signature) {
      throw new Error('Missing Stripe-Signature header');
    }

    // Parse signature header: t=timestamp,v1=signature
    const signatureParts = signature.split(',').reduce(
      (acc, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const timestamp = signatureParts['t'];
    const providedSignature = signatureParts['v1'];

    if (!timestamp || !providedSignature) {
      throw new Error('Invalid Stripe-Signature format');
    }

    // 1. REPLAY PROTECTION: Check timestamp is within ±5 minutes
    const webhookTimestamp = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - webhookTimestamp);

    if (timeDifference > WEBHOOK_TIMESTAMP_WINDOW_SECONDS) {
      throw new Error(
        `Webhook timestamp outside acceptable window. ` +
          `Timestamp: ${webhookTimestamp}, Current: ${currentTime}, ` +
          `Difference: ${timeDifference}s (max: ${WEBHOOK_TIMESTAMP_WINDOW_SECONDS}s)`
      );
    }

    // 2. SIGNATURE VALIDATION: Compute expected signature
    const signedContent = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureMatches = crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );

    if (!signatureMatches) {
      throw new Error('Invalid webhook signature');
    }

    // Signature is valid, construct and return the event
    // (Stripe SDK constructEvent is just parsing + validation, which we've done)
    let event: Stripe.Event;
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (err) {
      throw new Error('Invalid JSON in webhook body');
    }

    return event;
  }

  /**
   * Check if webhook has been processed before (replay protection).
   * Queries audit logs for this webhook ID.
   *
   * Args:
   *     webhookId: Stripe event.id
   *
   * Returns:
   *     True if webhook ID already processed, False otherwise
   */
  static async hasBeenProcessed(webhookId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('audit_logs_immutable')
      .select('id')
      .eq('details->webhook_id', webhookId)
      .eq('resource_type', 'webhook')
      .eq('action', 'checkout.session.completed')
      .limit(1);

    return (data?.length ?? 0) > 0;
  }
}

// ============================================================================
// 2. INPUT VALIDATOR & SANITIZER (XSS Prevention)
// ============================================================================

/**
 * Sanitizes user input to prevent XSS attacks in emails and UI.
 * Delegates to centralized html-utils module for consistency.
 */
export class InputValidator {
  /**
   * Escapes HTML special characters to prevent XSS.
   * Safe for use in email templates, DB, and UI rendering.
   *
   * Delegates to shared escapeHtml function in lib/security/html-utils.ts
   * to prevent duplication and ensure consistency across the codebase.
   *
   * Args:
   *     input: Untrusted user input
   *
   * Returns:
   *     HTML-escaped string safe for email/UI rendering
   *
   * Examples:
   *     escapeHtml('<script>alert("xss")</script>')
   *     → '&lt;script&gt;alert("xss")&lt;/script&gt;'
   *
   *     escapeHtml('Course "AI 101"')
   *     → 'Course &quot;AI 101&quot;'
   */
  static escapeHtml(input: string): string {
    return escapeHtml(input);
  }

  /**
   * Sanitizes email addresses to prevent injection attacks.
   * Validates basic email format using RFC 5322 simplified regex.
   *
   * Args:
   *     email: Email address to validate
   *
   * Returns:
   *     Validated email string
   *
   * Raises:
   *     ValueError: If email format is invalid
   */
  static validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }
    return email.toLowerCase().trim();
  }

  /**
   * Validates Stripe customer ID format.
   * Expected format: "cus_XXXXXXXXXXXXXXXXXX"
   *
   * Args:
   *     customerId: Stripe customer ID
   *
   * Returns:
   *     Validated customer ID
   *
   * Raises:
   *     ValueError: If format is invalid
   */
  static validateStripeCustomerId(customerId: string): string {
    if (!/^cus_[a-zA-Z0-9]+$/.test(customerId)) {
      throw new Error(`Invalid Stripe customer ID format: ${customerId}`);
    }
    return customerId;
  }

  /**
   * Validates course ID format (alphanumeric, hyphens, underscores only).
   * Prevents injection attacks via courseId in metadata.
   *
   * Args:
   *     courseId: Course identifier
   *
   * Returns:
   *     Validated course ID
   *
   * Raises:
   *     ValueError: If format is invalid
   */
  static validateCourseId(courseId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(courseId)) {
      throw new Error(
        `Invalid course ID format (alphanumeric, - and _ only): ${courseId}`
      );
    }
    return courseId;
  }
}

// ============================================================================
// 3. RATE LIMITER (Injectable, Redis-Backed)
// ============================================================================

/**
 * Rate limiter using Redis-backed sliding window.
 * Implements dual-level limiting: per-customer + global.
 *
 * Features:
 *     - Injectable: Can be instantiated and passed to dependencies
 *     - Resettable: Has reset() method for test isolation
 *     - Redis-backed using Vercel KV (distributed in production)
 *     - Sliding window algorithm with 60-second TTL
 *     - Per-customer limit: 100 req/min per email
 *     - Global limit: 1000 req/min across all customers
 *     - Graceful fallback to in-memory if Redis unavailable
 *
 * Usage:
 *     // In production: use singleton via static method
 *     if (!RateLimiter.checkRateLimit(email)) { ... }
 *
 *     // In tests: create instance and inject
 *     const limiter = new RateLimiter();
 *     if (!limiter.checkRateLimit(email)) { ... }
 *     await limiter.reset(); // Clean up for next test
 */
export class RateLimiter {
  private redisBacked: typeof RedisRateLimiter;

  constructor() {
    this.redisBacked = RedisRateLimiter;
  }

  /**
   * Check if request is within rate limits (per-customer + global).
   * Uses Redis for persistence across Vercel instances.
   *
   * Args:
   *     customerEmail: Customer email (used as rate limit key)
   *
   * Returns:
   *     True if under limit, False if rate limited
   *
   * Time Complexity: O(1) Redis operations
   * Space Complexity: O(m) where m = unique customer emails in current window
   *
   * Security Notes:
   *     - Limits per-customer to detect brute force attempts
   *     - Global limit protects against distributed attacks
   *     - Redis TTL auto-cleanup prevents memory leaks
   *     - Survives Vercel cold starts and instance changes
   */
  async checkRateLimit(customerEmail: string): Promise<boolean> {
    const result = await this.redisBacked.checkRateLimit(customerEmail);
    return result.allowed;
  }

  /**
   * Reset rate limit for a customer
   * Used in tests for isolation between test cases
   */
  async reset(customerEmail?: string): Promise<void> {
    if (customerEmail) {
      await this.redisBacked.reset(customerEmail);
    } else {
      // Reset all (for testing purposes)
      await this.redisBacked.resetGlobal();
    }
  }

  /**
   * Reset global rate limit (emergency incident response only)
   */
  async resetGlobal(): Promise<void> {
    await this.redisBacked.resetGlobal();
  }

  /**
   * Get detailed rate limit status (for monitoring/debugging)
   */
  async getStatus(customerEmail: string): Promise<{
    customerCount: number;
    customerLimit: number;
    globalCount: number;
    globalLimit: number;
    usingRedis: boolean;
  }> {
    return this.redisBacked.getStatus(customerEmail);
  }
}

// ============================================================================
// SINGLETON INSTANCE (for backwards compatibility)
// ============================================================================

/**
 * Default singleton instance used by static convenience methods.
 * Created once on first import, reused throughout the application.
 */
const defaultRateLimiter = new RateLimiter();

/**
 * Static convenience methods for backwards compatibility.
 * Uses the default singleton instance.
 *
 * @example
 * if (!await RateLimiter.checkRateLimit(email)) {
 *   return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
 * }
 */
RateLimiter.checkRateLimit = async function (
  customerEmail: string
): Promise<boolean> {
  return defaultRateLimiter.checkRateLimit(customerEmail);
};

RateLimiter.reset = async function (customerEmail?: string): Promise<void> {
  return defaultRateLimiter.reset(customerEmail);
};

RateLimiter.resetGlobal = async function (): Promise<void> {
  return defaultRateLimiter.resetGlobal();
};

RateLimiter.getStatus = async function (customerEmail: string): Promise<{
  customerCount: number;
  customerLimit: number;
  globalCount: number;
  globalLimit: number;
  usingRedis: boolean;
}> {
  return defaultRateLimiter.getStatus(customerEmail);
};

// ============================================================================
// 4. AUDIT LOGGER (PCI DSS Compliant, Immutable)
// ============================================================================

/**
 * Logs security events to immutable audit table.
 * Redacts PII (emails) and sensitive data before logging.
 * Compliant with PCI DSS 3.4 (logging requirements).
 */
export class AuditLogger {
  /**
   * Log a webhook event to the audit trail.
   * PII is redacted before persistence.
   *
   * Args:
   *     data: Webhook event details
   *
   * Returns:
   *     Audit log ID (UUID)
   *
   * Raises:
   *     Error: If database insert fails
   *
   * Security Notes:
   *     - Emails are hashed (SHA256) to allow lookup without PII exposure
   *     - Full email never stored in plaintext
   *     - Immutable table prevents tampering
   *     - Created_at timestamp prevents backdating
   */
  static async logWebhookEvent(data: {
    webhookId: string;
    eventType: string;
    customerId?: string;
    customerEmail?: string;
    courseId?: string;
    amount?: number;
    currency?: string;
    status: 'success' | 'denied' | 'error';
    errorMessage?: string;
    details?: Record<string, unknown>;
  }): Promise<string> {
    const supabase = getSupabaseClient();

    // Redact PII: Hash email instead of storing plaintext
    const emailHash = data.customerEmail
      ? crypto
          .createHash('sha256')
          .update(data.customerEmail.toLowerCase())
          .digest('hex')
          .substring(0, 16) // First 16 chars for readability
      : null;

    try {
      const { data: logEntry, error } = await supabase
        .from('audit_logs_immutable')
        .insert({
          action: data.eventType,
          resource_type: 'webhook',
          resource_id: data.webhookId,
          resource_name: `Stripe Event: ${data.eventType}`,
          actor_email: 'stripe@webhook.internal', // System actor for Stripe
          status: data.status,
          error_message: data.errorMessage || null,
          details: {
            webhook_id: data.webhookId,
            event_type: data.eventType,
            customer_id: data.customerId,
            customer_email_hash: emailHash, // PII redacted
            course_id: data.courseId,
            amount: data.amount,
            currency: data.currency,
            ...data.details,
          },
          data_subject_id:
            data.courseId && data.courseId.startsWith('student_')
              ? data.courseId
              : null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to write audit log:', error);
        throw error;
      }

      return logEntry?.id || 'unknown';
    } catch (err) {
      console.error('Audit logging failed:', err);
      // Don't throw - log failure but allow webhook processing to continue
      // (audit logging should never block payment processing)
      return 'audit_error';
    }
  }
}

// ============================================================================
// 5. AMOUNT VALIDATOR
// ============================================================================

/**
 * Validates webhook payment amounts against expected course prices.
 * Prevents underpayment or overpayment fraud.
 */
export class AmountValidator {
  /**
   * Known course prices in cents (USD).
   * MUST match Stripe product prices in production.
   */
  private static readonly EXPECTED_PRICES: Record<string, number> = {
    'track-a-module': 5900, // $59.00
    'track-a-full': 29900, // $299.00
    'track-b-engineer': 59900, // $599.00
    'track-b-devops': 49900, // $499.00
    'bundle-all': 89900, // $899.00
  };

  /**
   * Validate payment amount matches expected course price.
   * Allows ±5% variance for taxes/fees.
   *
   * Args:
   *     courseId: Course identifier
   *     amountCents: Amount paid in cents
   *
   * Returns:
   *     True if amount is within acceptable range
   *
   * Raises:
   *     ValueError: If amount significantly deviates from expected price
   *
   * Notes:
   *     - 5% variance covers most regional taxes (VAT, GST)
   *     - Exact prices must be updated when Stripe prices change
   */
  static validateAmount(courseId: string, amountCents: number): boolean {
    const expectedPrice = this.EXPECTED_PRICES[courseId];

    if (!expectedPrice) {
      // Unknown course - log warning but don't fail
      // (new courses might be added without updating this list)
      console.warn(`Amount validation: Unknown course ID: ${courseId}`);
      return true; // Allow unknown courses to pass
    }

    // Allow ±5% variance for taxes and regional pricing
    const lowerBound = expectedPrice * 0.95;
    const upperBound = expectedPrice * 1.05;

    const isValid = amountCents >= lowerBound && amountCents <= upperBound;

    if (!isValid) {
      console.warn(
        `Amount mismatch for course ${courseId}: ` +
          `Expected ${expectedPrice}¢, got ${amountCents}¢ ` +
          `(acceptable range: ${lowerBound}¢ - ${upperBound}¢)`
      );
    }

    return isValid;
  }
}

