/**
 * Webhook Rate Limiting & Timing Constants
 *
 * Centralized configuration for security thresholds used in webhook processing
 * All values are based on production analysis and PCI DSS requirements
 *
 * Last Updated: 2026-08-24
 */

/**
 * Replay attack protection: maximum age of webhook timestamp
 * Stripe webhooks with timestamps older than this are rejected
 * Value: 5 minutes (300 seconds)
 * Rationale: Balances clock drift tolerance with replay attack prevention
 */
export const WEBHOOK_TIMESTAMP_WINDOW_SECONDS = 300;

/**
 * Per-customer rate limit: maximum webhooks per minute per email
 * Used to detect coordinated brute-force attempts from single customer
 * Value: 100 requests per minute
 * Rationale: Normal customers won't retry checkout >100 times/minute
 */
export const RATE_LIMIT_PER_CUSTOMER_PER_MINUTE = 100;

/**
 * Global rate limit: maximum webhooks per minute across all customers
 * Protects against distributed DDoS/brute-force attacks
 * Value: 1000 requests per minute
 * Rationale: Production traffic at scale should not exceed this
 */
export const RATE_LIMIT_GLOBAL_PER_MINUTE = 1000;

/**
 * Cleanup interval for rate limit tracking
 * In-memory rate limit trackers are cleaned every 60 seconds
 * Value: 60,000 milliseconds (1 minute)
 * Rationale: Prevents unbounded memory growth from stale entries
 */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000;

/**
 * Rate limit lookback window
 * Only requests within last 60 seconds count toward limits
 * Value: 60,000 milliseconds (1 minute)
 * Rationale: Aligns with "per-minute" rate limit definitions
 */
export const RATE_LIMIT_LOOKBACK_MS = 60_000;

/**
 * Email retry delays for exponential backoff
 * Maps retry attempt number to delay before next attempt
 * Rationale: Gives temporary failures time to resolve without overwhelming services
 */
export const EMAIL_RETRY_DELAYS_MS = {
  1: 5 * 60 * 1000,      // 5 minutes for first retry
  2: 15 * 60 * 1000,     // 15 minutes for second retry
  3: 60 * 60 * 1000,     // 1 hour for third retry
} as const;

/**
 * Maximum email retry attempts before moving to dead-letter queue
 * Value: 3 retries
 * Rationale: Balances persistence with resource usage; temporary issues resolve quickly
 */
export const EMAIL_MAX_RETRIES = 3;

/**
 * Fallback retry delay if attempt number exceeds configured delays
 * Value: 2 hours
 * Rationale: Conservative fallback for unexpected retry scenarios
 */
export const EMAIL_RETRY_FALLBACK_DELAY_MS = 2 * 60 * 60 * 1000;

/**
 * Email queue batch processing size
 * Number of emails to process in a single queue run
 * Value: 10 emails
 * Rationale: Balances throughput with Supabase connection stability
 */
export const EMAIL_QUEUE_BATCH_SIZE = 10;

/**
 * Webhook processing timeout
 * Maximum time allowed to process a single webhook before returning to Stripe
 * Value: 25 seconds
 * Rationale: Stripe timeouts at 30 seconds; 25s provides 5s safety margin
 */
export const WEBHOOK_PROCESSING_TIMEOUT_MS = 25_000;

/**
 * Webhook signature verification timeout
 * Maximum time to verify cryptographic signature
 * Value: 5 seconds
 * Rationale: Should be near-instantaneous; 5s indicates crypto/system issue
 */
export const WEBHOOK_SIGNATURE_TIMEOUT_MS = 5_000;
