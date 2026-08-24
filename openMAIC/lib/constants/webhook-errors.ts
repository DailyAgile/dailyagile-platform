/**
 * Webhook Error Types and HTTP Status Codes
 * ==========================================
 *
 * Centralized definitions for error handling in webhook processing.
 * Replaces magic strings like 'Missing signature' with typed constants.
 *
 * Time Complexity: O(1) - all lookups are direct object access
 * No external dependencies
 *
 * Usage:
 *   import { WEBHOOK_ERRORS, HTTP_STATUS } from '@/lib/constants/webhook-errors';
 *   throw new Error(WEBHOOK_ERRORS.MISSING_SIGNATURE);
 *   return NextResponse.json(err, { status: HTTP_STATUS.BAD_REQUEST });
 */

/**
 * HTTP status codes used in webhook responses
 * Follows standard HTTP semantics for Stripe to understand retries
 */
export const HTTP_STATUS = {
  /** 200 OK - Webhook processed successfully */
  OK: 200,

  /** 202 Accepted - Webhook accepted but processing is async */
  ACCEPTED: 202,

  /** 400 Bad Request - Invalid request (missing signature, malformed body) */
  BAD_REQUEST: 400,

  /** 401 Unauthorized - Authentication failed */
  UNAUTHORIZED: 401,

  /** 403 Forbidden - Access denied */
  FORBIDDEN: 403,

  /** 404 Not Found - Resource not found */
  NOT_FOUND: 404,

  /** 409 Conflict - Resource conflict (duplicate processing) */
  CONFLICT: 409,

  /** 422 Unprocessable Entity - Valid syntax but semantic error (missing metadata) */
  UNPROCESSABLE_ENTITY: 422,

  /** 429 Too Many Requests - Rate limited */
  TOO_MANY_REQUESTS: 429,

  /** 500 Internal Server Error - Server error during processing */
  INTERNAL_SERVER_ERROR: 500,

  /** 503 Service Unavailable - Temporary service failure */
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error types for webhook validation and processing
 * Each error has an associated HTTP status code
 */
export const WEBHOOK_ERRORS = {
  // Signature & Authentication Errors
  /**
   * HTTP 400 - Stripe signature header missing from request
   * This indicates a client error or misconfiguration
   * Stripe always includes the signature header for legitimate webhooks
   */
  MISSING_SIGNATURE: 'Missing stripe-signature header',

  /**
   * HTTP 400 - Stripe signature verification failed
   * Could indicate:
   *   1. Wrong STRIPE_WEBHOOK_SECRET configured
   *   2. Webhook secret rotated and old key is still in use
   *   3. Request body was modified in transit
   * Action: Check webhook secret configuration
   */
  INVALID_SIGNATURE: 'Invalid webhook signature',

  /**
   * HTTP 401 - Webhook secret not configured
   * Critical error: webhook processing cannot start without secret
   * Action: Set STRIPE_WEBHOOK_SECRET in environment
   */
  WEBHOOK_SECRET_NOT_CONFIGURED: 'Webhook secret not configured in environment',

  // Event & Metadata Errors
  /**
   * HTTP 422 - Required metadata fields missing from checkout session
   * Stripe allows custom metadata; we require certain fields to process enrollment
   * Required fields: course_id, email
   * Action: Check Stripe checkout creation code to ensure metadata is passed
   */
  MISSING_METADATA: 'Missing required checkout metadata (course_id, email)',

  /**
   * HTTP 400 - Checkout session object is malformed or missing expected fields
   * Could indicate Stripe API version mismatch or corrupted event data
   * Action: Check Stripe API version (should be 2023-10-16)
   */
  MALFORMED_SESSION: 'Malformed checkout session object',

  /**
   * HTTP 200 (ACK) but not processed - Product type not supported
   * This is graceful degradation: we acknowledge the webhook but don't process
   * Allows Stripe to stop retrying without failing the webhook handler
   * Action: Add support for this product type or update checkout metadata
   */
  UNSUPPORTED_PRODUCT: 'Product type not supported for enrollment',

  /**
   * HTTP 400 - Event type is not recognized or supported
   * We only handle checkout.session.completed currently
   * Other events are acknowledged silently (graceful degradation)
   */
  UNSUPPORTED_EVENT: 'Event type not supported',

  // Database Errors
  /**
   * HTTP 500 - Failed to create or update student record
   * Could indicate:
   *   1. Database connection failure
   *   2. Duplicate student email with permission conflicts
   *   3. Supabase service issue
   * Action: Check database logs and Supabase status page
   * Stripe will retry with exponential backoff
   */
  STUDENT_CREATION_FAILED: 'Failed to create or update student record',

  /**
   * HTTP 500 - Failed to record billing history
   * Could indicate:
   *   1. Database connection failure
   *   2. Foreign key constraint violation
   *   3. Supabase service issue
   * Action: Check database logs, ensure students table has the student record
   * Stripe will retry with exponential backoff
   */
  BILLING_HISTORY_FAILED: 'Failed to record billing history',

  /**
   * HTTP 500 - Failed to query database
   * Generic database error during any database operation
   * Action: Check database connection, logs, and Supabase status
   */
  DATABASE_ERROR: 'Database operation failed',

  /**
   * HTTP 500 - Database validation failed
   * Schema mismatch or unexpected data types
   * Action: Verify database schema matches expected structure
   */
  DATABASE_VALIDATION_ERROR: 'Database validation failed',

  // Email Errors
  /**
   * HTTP 500 but non-fatal - Failed to send confirmation email
   * Email sending is best-effort; webhook succeeds even if email fails
   * Stripe is notified webhook succeeded; customer enrolled regardless
   * Action: Check Brevo API logs, resend email manually if needed
   */
  EMAIL_SEND_FAILED: 'Failed to send confirmation email',

  /**
   * HTTP 500 but non-fatal - Email service (Brevo) is unavailable
   * Webhook succeeds but email not sent
   * Action: Check Brevo status, retries handled by email service itself
   */
  EMAIL_SERVICE_UNAVAILABLE: 'Email service temporarily unavailable',

  /**
   * HTTP 400 - Brevo API returned invalid response
   * Could indicate API version mismatch or Brevo service issue
   * Action: Check Brevo API documentation, verify API key has SMTP permissions
   */
  EMAIL_API_ERROR: 'Brevo API error',

  // Generic Processing Errors
  /**
   * HTTP 500 - Generic error during webhook processing
   * Used when error doesn't fit a specific category
   * Check logs for details on what failed
   * Action: Review application logs for specific error
   */
  PROCESSING_FAILED: 'Failed to process webhook',

  /**
   * HTTP 500 - Unexpected error occurred
   * Something went wrong that wasn't expected
   * Action: Check application logs and error tracking (Sentry, etc)
   */
  UNEXPECTED_ERROR: 'Unexpected error occurred',

  // Configuration Errors
  /**
   * HTTP 500 - Configuration is missing or invalid
   * Required environment variables not set
   * This happens at startup; webhook cannot process
   * Action: Set missing environment variables
   */
  CONFIGURATION_ERROR: 'Configuration error',

  /**
   * HTTP 500 - Stripe client failed to initialize
   * Could indicate missing or invalid STRIPE_SECRET_KEY
   * Action: Verify STRIPE_SECRET_KEY is set and valid
   */
  STRIPE_INITIALIZATION_ERROR: 'Failed to initialize Stripe client',
} as const;

/**
 * Map error types to HTTP status codes
 * Used to return appropriate HTTP responses for different errors
 */
export const ERROR_HTTP_STATUS_MAP: Record<string, number> = {
  // 400 Bad Request
  [WEBHOOK_ERRORS.MISSING_SIGNATURE]: HTTP_STATUS.BAD_REQUEST,
  [WEBHOOK_ERRORS.INVALID_SIGNATURE]: HTTP_STATUS.BAD_REQUEST,
  [WEBHOOK_ERRORS.MALFORMED_SESSION]: HTTP_STATUS.BAD_REQUEST,
  [WEBHOOK_ERRORS.UNSUPPORTED_EVENT]: HTTP_STATUS.BAD_REQUEST,
  [WEBHOOK_ERRORS.EMAIL_API_ERROR]: HTTP_STATUS.BAD_REQUEST,

  // 401 Unauthorized
  [WEBHOOK_ERRORS.WEBHOOK_SECRET_NOT_CONFIGURED]: HTTP_STATUS.UNAUTHORIZED,

  // 422 Unprocessable Entity
  [WEBHOOK_ERRORS.MISSING_METADATA]: HTTP_STATUS.UNPROCESSABLE_ENTITY,

  // 500 Internal Server Error (most database/service errors)
  [WEBHOOK_ERRORS.STUDENT_CREATION_FAILED]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.BILLING_HISTORY_FAILED]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.DATABASE_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.DATABASE_VALIDATION_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.EMAIL_SEND_FAILED]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.EMAIL_SERVICE_UNAVAILABLE]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.PROCESSING_FAILED]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.UNEXPECTED_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.CONFIGURATION_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [WEBHOOK_ERRORS.STRIPE_INITIALIZATION_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const;

/**
 * Get HTTP status code for an error message
 * @param errorMessage - The error message to look up
 * @returns HTTP status code, or 500 if not found
 */
export function getHttpStatusForError(errorMessage: string): number {
  return ERROR_HTTP_STATUS_MAP[errorMessage] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Type for webhook error messages
 */
export type WebhookErrorType = (typeof WEBHOOK_ERRORS)[keyof typeof WEBHOOK_ERRORS];

/**
 * Type for HTTP status codes
 */
export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
