/**
 * Stripe Webhook Configuration & Environment Variables
 * =====================================================
 *
 * Centralized configuration for Stripe webhook handling.
 * All magic strings, URLs, timeouts, and environment variables are defined here.
 *
 * This module validates all required environment variables at startup.
 * If any required variable is missing, an error is thrown before any webhook
 * processing can begin.
 *
 * Time Complexity: O(1) - all config lookups are direct object access
 * Dependencies: None (pure configuration module)
 *
 * Usage:
 *   import { stripeConfig } from '@/lib/server/stripe-config';
 *   const stripe = new Stripe(stripeConfig.secretKey);
 *   const timeout = stripeConfig.webhook.timeoutMs;
 *
 * Environment Variables (Required):
 *   - STRIPE_SECRET_KEY: Stripe API secret key (starts with sk_)
 *   - STRIPE_WEBHOOK_SECRET: Webhook signing secret (starts with whsec_)
 *
 * Environment Variables (Optional):
 *   - STRIPE_API_VERSION: Stripe API version string
 *   - BREVO_API_KEY: Brevo email service API key
 *   - NEXT_PUBLIC_APP_URL: Application base URL for links in emails
 *
 * Configuration Values (Tunable):
 *   - webhook.timeoutMs: Maximum time to process a webhook (5000ms default)
 *   - webhook.retryAttempts: Number of retries for transient errors (3 default)
 *   - email.timeoutMs: Maximum time to send confirmation email (3000ms default)
 *   - email.retryAttempts: Number of email send retries (2 default)
 */

/**
 * Stripe configuration error thrown when required variables are missing
 */
export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripeConfigError';
  }
}

/**
 * Validate that a required environment variable is set
 * @param varName - The environment variable name
 * @param value - The value to check
 * @throws StripeConfigError if value is missing or empty
 */
function validateRequired(varName: string, value: string | undefined): asserts value is string {
  if (!value || value.trim() === '') {
    throw new StripeConfigError(
      `Missing required environment variable: ${varName}\n` +
      `Please set ${varName} in your .env.local file or deployment environment.\n` +
      `Stripe webhook processing cannot start without this variable.`
    );
  }
}

/**
 * Stripe configuration object
 * Assembled at module load time; invalid configs throw immediately
 */
export const stripeConfig = (() => {
  // Validate required environment variables at startup
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  validateRequired('STRIPE_SECRET_KEY', secretKey);
  validateRequired('STRIPE_WEBHOOK_SECRET', webhookSecret);

  return {
    // Stripe API Configuration
    secretKey,
    webhookSecret,

    /**
     * Stripe API version used for webhook event parsing
     * Must match the version configured in Stripe Dashboard
     * Updates available at: https://stripe.com/docs/upgrades
     */
    apiVersion: '2023-10-16',

    // Webhook Processing Configuration
    webhook: {
      /**
       * Maximum time (in milliseconds) to process a single webhook event
       * If processing takes longer, the webhook handler will timeout
       * Default: 5 seconds (Vercel serverless function timeout is 60s)
       *
       * Tuning:
       *   - Increase if experiencing timeouts with slow database/email
       *   - Stripe will retry on timeout (exponential backoff)
       *   - Monitor logs for consistent timeouts
       */
      timeoutMs: 5000,

      /**
       * Maximum number of retry attempts for transient errors
       * Applies to database operations and email sending
       * Does not apply to Stripe retries (Stripe retries via webhook resend)
       *
       * Tuning:
       *   - Increase if database has frequent transient failures
       *   - Decrease to fail fast and let Stripe retry webhook
       *   - Default: 3 attempts (recommended)
       */
      retryAttempts: 3,

      /**
       * Delay between retry attempts (in milliseconds)
       * Uses exponential backoff: delay * (2 ^ attempt)
       * Default: 100ms → 200ms → 400ms
       */
      retryDelayMs: 100,

      /**
       * Error messages returned in webhook responses
       * These are logged by Stripe and visible in dashboard
       */
      errors: {
        missingSignature: 'Missing stripe-signature header',
        invalidSignature: 'Invalid webhook signature',
        missingMetadata: 'Missing required checkout metadata (course_id, email)',
        unsupportedProduct: 'Product type not supported for enrollment',
        processingFailed: 'Failed to process webhook',
        databaseError: 'Database error during enrollment',
      },
    },

    // Email Service Configuration (Brevo)
    email: {
      /**
       * Brevo (formerly Sendinblue) SMTP API endpoint
       * Used to send confirmation emails to students after purchase
       * API Documentation: https://developers.brevo.com/docs/send-transactional-email
       */
      apiUrl: 'https://api.brevo.com/v3/smtp/email',

      /**
       * API key for Brevo authentication
       * Must have SMTP permissions to send emails
       * Get from: https://app.brevo.com/settings/keys/api
       */
      apiKey: brevoApiKey,

      /**
       * Maximum time to send an email (in milliseconds)
       * Brevo API is generally fast; this is for timeout protection
       * Default: 3 seconds
       *
       * Tuning:
       *   - Increase if experiencing regular timeouts with Brevo
       *   - Email failures don't fail webhook (graceful degradation)
       */
      timeoutMs: 3000,

      /**
       * Number of retry attempts for email sending
       * If email fails, webhook continues (doesn't block enrollment)
       * Email retries are best-effort
       * Default: 2 attempts
       */
      retryAttempts: 2,

      /**
       * Sender email address for confirmation emails
       * Must be verified in Brevo account
       * Current: support@dailyagile.com
       */
      senderEmail: 'support@dailyagile.com',

      /**
       * Sender name displayed in email client
       */
      senderName: 'DailyAgile',

      /**
       * Email subject line for purchase confirmation
       * Keep concise and clear
       */
      subjectLine: 'Quiz Course Enrollment Confirmed',

      /**
       * Application URL for enrollment confirmation email links
       * Used to build the "access course" button link
       * Example: 'https://dailyagile.com' or 'http://localhost:3000'
       */
      appUrl: appUrl || 'http://localhost:3000',

      /**
       * Path to course access page relative to appUrl
       * Full URL will be: ${appUrl}${courseLinkPath}
       */
      courseLinkPath: '/academy/quiz',
    },

    // HTTP Client Configuration
    http: {
      /**
       * Default timeout for all HTTP requests (in milliseconds)
       * Applies to Brevo API calls and other external services
       * Default: 5 seconds
       */
      defaultTimeoutMs: 5000,

      /**
       * Maximum number of HTTP request retries
       * Applies to transient failures (5xx, timeouts, network errors)
       * Does NOT apply to client errors (4xx)
       */
      maxRetries: 2,
    },

    // Database Configuration
    database: {
      /**
       * Required Supabase tables for webhook processing
       * Used for validation before attempting operations
       */
      requiredTables: ['students', 'billing_history'],

      /**
       * Default timeout for database operations (in milliseconds)
       * Should be less than webhook.timeoutMs
       * Default: 3 seconds
       */
      operationTimeoutMs: 3000,
    },

    // Response Codes (HTTP)
    httpStatus: {
      ok: 200,
      badRequest: 400,
      internalServerError: 500,
    },

    // Logging Configuration
    logging: {
      /**
       * Log level for webhook processing
       * 'error': Only errors
       * 'warn': Errors and warnings
       * 'info': All including informational messages
       * 'debug': Detailed debugging information
       */
      level: process.env.LOG_LEVEL || 'info',

      /**
       * Fields to mask in logs for security
       * Sensitive values will be replaced with [REDACTED]
       */
      maskedFields: [
        'email',
        'stripe_customer_id',
        'api_key',
        'api-key',
        'authentication',
        'authorization',
      ],
    },

    // Feature Flags for Gradual Rollout
    features: {
      /**
       * Whether to process checkout.session.completed events
       * Set to false to disable webhook processing (e.g., during maintenance)
       */
      processCheckoutComplete: true,

      /**
       * Whether to send confirmation emails
       * Set to false to disable email notifications (e.g., in staging)
       */
      sendConfirmationEmails: true,

      /**
       * Whether to record billing history
       * Set to false to disable payment recording (not recommended in production)
       */
      recordBillingHistory: true,
    },
  } as const;
})();

/**
 * Type for the Stripe configuration
 * Used for dependency injection and testing
 */
export type StripeConfigType = typeof stripeConfig;

/**
 * Validate the Stripe configuration at startup
 * This is called automatically when the module is imported
 * Use this function to add additional validation beyond env var checks
 *
 * @throws StripeConfigError if configuration is invalid
 */
export function validateStripeConfig(): void {
  const config = stripeConfig;

  // Validate timeouts are positive
  if (config.webhook.timeoutMs <= 0) {
    throw new StripeConfigError('webhook.timeoutMs must be positive');
  }

  if (config.email.timeoutMs <= 0) {
    throw new StripeConfigError('email.timeoutMs must be positive');
  }

  // Validate webhook timeout is less than typical serverless function timeout
  if (config.webhook.timeoutMs > 55000) {
    console.warn(
      'Warning: webhook.timeoutMs exceeds typical Vercel serverless timeout (30s).\n' +
      'This may cause webhooks to timeout unexpectedly.'
    );
  }

  // Validate retry counts are reasonable
  if (config.webhook.retryAttempts > 10) {
    throw new StripeConfigError('webhook.retryAttempts should not exceed 10');
  }

  // Validate app URL is set for email links
  if (!config.email.appUrl) {
    console.warn(
      'Warning: email.appUrl not configured. Email links will use localhost:3000.\n' +
      'Set NEXT_PUBLIC_APP_URL in .env.local for production URLs.'
    );
  }

  // Log configuration summary (non-sensitive values only)
  console.log('[Stripe Config] Webhook timeout:', `${config.webhook.timeoutMs}ms`);
  console.log('[Stripe Config] Email service:', config.email.senderEmail);
  console.log('[Stripe Config] API version:', config.apiVersion);
}

// Validate configuration when module is imported
try {
  validateStripeConfig();
} catch (err) {
  // Re-throw configuration errors immediately
  // This prevents the application from starting with invalid config
  if (err instanceof StripeConfigError) {
    throw err;
  }
  throw new StripeConfigError(`Failed to validate Stripe configuration: ${err}`);
}
