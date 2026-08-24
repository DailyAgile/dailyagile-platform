/**
 * Stripe Webhook Processor with Idempotency & Error Handling
 *
 * Handles Stripe checkout.session.completed events with:
 * - Idempotent deduplication
 * - Error classification (TRANSIENT vs PERMANENT)
 * - Atomic transaction wrapping
 * - Graceful degradation
 * - Comprehensive logging
 */

import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { IdempotencyManager } from './idempotency-manager';
import { ErrorClassifier, ErrorClass } from './error-classification';
import { CircuitBreaker } from './circuit-breaker';
import { escapeHtml } from '../security/html-utils';

export interface WebhookProcessingResult {
  success: boolean;
  httpStatus: number;  // 200 or 500
  message: string;
  processingId?: string;
  retryable?: boolean;
  error?: string;
}

interface Logger {
  error: (msg: string, context?: Record<string, unknown>) => void;
  info: (msg: string, context?: Record<string, unknown>) => void;
  warn: (msg: string, context?: Record<string, unknown>) => void;
  debug: (msg: string, context?: Record<string, unknown>) => void;
  logStudentOperation?: (
    operationType: 'upsert' | 'create' | 'update',
    studentEmail: string,
    studentId: string,
    status: 'success' | 'failed',
    durationMs: number,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  logBillingOperation?: (
    courseId: string,
    studentId: string,
    amountCents: number,
    currency: string,
    status: 'success' | 'failed',
    durationMs: number,
    externalInvoiceId?: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  logEmailOperation?: (
    studentEmail: string,
    emailType: string,
    status: 'queued' | 'failed',
    durationMs: number,
    errorMessage?: string
  ) => Promise<void>;
  logError?: (
    errorType: string,
    errorMessage: string,
    stacktrace?: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  getCorrelationId?: () => string;
}

/**
 * StripeWebhookProcessor
 *
 * Orchestrates webhook processing with proper error handling and idempotency.
 *
 * Flow:
 * 1. Verify Stripe signature (outside this class)
 * 2. Check idempotency (already processed?)
 * 3. Mark as processing (atomic UPSERT)
 * 4. Validate metadata
 * 5. Upsert student + create billing record (transaction)
 * 6. Send confirmation email (best-effort)
 * 7. Mark as succeeded
 * 8. Return 200 OK
 *
 * On error:
 * 1. Classify error (TRANSIENT or PERMANENT)
 * 2. Mark as failed with classification
 * 3. Return appropriate HTTP status (500 for transient, 200 for permanent)
 */
export class StripeWebhookProcessor {
  private idempotencyManager: IdempotencyManager;
  private errorClassifier: ErrorClassifier;
  private circuitBreaker: CircuitBreaker;

  constructor(
    private supabase: SupabaseClient,
    private brevoApiKey: string | undefined,
    private logger?: Logger,
    circuitBreaker?: CircuitBreaker,
    private rateLimiter?: any // RateLimiter instance (optional for backwards compatibility)
  ) {
    this.idempotencyManager = new IdempotencyManager(supabase, logger);
    this.errorClassifier = new ErrorClassifier();
    this.circuitBreaker = circuitBreaker || new CircuitBreaker(logger);
  }

  /**
   * Process checkout.session.completed event
   *
   * @param event - Stripe event
   * @returns Processing result with HTTP status and retry guidance
   *
   * HTTP Status Codes:
   * - 200: Successfully processed (idempotent or succeeded)
   * - 200: Error but PERMANENT (won't retry)
   * - 500: TRANSIENT error (Stripe will retry)
   *
   * @example
   * const event = stripe.webhooks.constructEvent(body, sig, secret);
   * const result = await processor.process(event);
   * return NextResponse.json(result, { status: result.httpStatus });
   */
  async process(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const externalId = event.id;

    try {
      // Step 0: Check circuit breaker (early exit if dependency is down)
      this.circuitBreaker.updateState();
      if (!this.circuitBreaker.isHealthy()) {
        const metrics = this.circuitBreaker.getMetrics();
        this.logger?.warn('Circuit breaker OPEN: rejecting webhook', {
          externalId,
          circuitState: metrics.state,
          consecutiveFailures: metrics.consecutiveFailures,
        });

        return {
          success: false,
          httpStatus: 503,  // Service Unavailable (Stripe backs off)
          message: 'Service temporarily unavailable (dependency recovery in progress)',
          retryable: true,
          error: 'Circuit breaker OPEN',
        };
      }

      // Step 1: Check idempotency
      const idempotencyCheck = await this.idempotencyManager.checkIdempotency(externalId, 'stripe');

      if (idempotencyCheck.isIdempotent && idempotencyCheck.isAlreadySucceeded) {
        // Already processed successfully - return 200 without doing work
        this.logger?.debug('Webhook already processed successfully (idempotent)', {
          externalId,
          processingId: idempotencyCheck.processingId,
        });

        return {
          success: true,
          httpStatus: 200,
          message: 'Webhook already processed successfully (idempotent)',
          processingId: idempotencyCheck.processingId,
        };
      }

      // Handle checkout.session.completed
      if (event.type === 'checkout.session.completed') {
        return this.processCheckoutSessionCompleted(
          event,
          idempotencyCheck.processingId
        );
      }

      // Acknowledge other webhook events
      this.logger?.info('Unhandled webhook event type', {
        externalId,
        eventType: event.type,
      });

      return {
        success: true,
        httpStatus: 200,
        message: `Webhook acknowledged (event type not handled: ${event.type})`,
      };
    } catch (err) {
      // Unexpected error - classify conservatively
      const classification = this.errorClassifier.classify(err);

      // Record failure in circuit breaker if error is transient
      if (classification.shouldRetry) {
        this.circuitBreaker.recordFailure();
      }

      this.logger?.error('Unexpected error processing webhook', {
        externalId,
        errorClassification: classification.classification,
        error: err instanceof Error ? err.message : String(err),
        circuitBreakerState: this.circuitBreaker.getMetrics().state,
      });

      return {
        success: false,
        httpStatus: classification.httpStatus,
        message: classification.message,
        retryable: classification.shouldRetry,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Process checkout.session.completed event
   *
   * Handles student upsert + billing record creation with full error handling.
   */
  private async processCheckoutSessionCompleted(
    event: Stripe.Event,
    processingIdFromIdempotency?: string
  ): Promise<WebhookProcessingResult> {
    const externalId = event.id;
    const session = event.data.object as Stripe.Checkout.Session;

    let processingId = processingIdFromIdempotency;

    try {
      // Step 1: Validate metadata
      const { valid, email, courseId, error: validationError } = this.validateSessionMetadata(
        session
      );

      if (!valid || !email || !courseId) {
        // PERMANENT error - invalid input, will never be valid
        const classificationResult = this.errorClassifier.classify(
          new Error(validationError),
          { studentEmail: email, courseId }
        );

        if (!processingId) {
          processingId = await this.markWebhookAsProcessing(externalId, event, session);
        }

        await this.idempotencyManager.markAsFailed(
          processingId,
          validationError,
          ErrorClass.PERMANENT,
          { validationError }
        );

        this.logger?.warn('Webhook validation failed (permanent)', {
          externalId,
          processingId,
          validationError,
        });

        return {
          success: false,
          httpStatus: 200,  // Return 200 to prevent Stripe retry
          message: validationError,
          processingId,
          retryable: false,
        };
      }

      // Step 2: Mark as processing (if not already done by idempotency check)
      if (!processingId) {
        processingId = await this.markWebhookAsProcessing(externalId, event, session);
      }

      // Step 3: Process the enrollment (upsert student + create billing)
      // Wrapped in try-catch to classify individual errors
      let studentId: string | undefined;
      try {
        studentId = await this.upsertStudentAndCreateBilling(
          email,
          courseId,
          session,
          externalId
        );
      } catch (err) {
        // Classify the error to determine retry strategy
        const classification = this.errorClassifier.classify(err, {
          studentEmail: email,
          courseId,
          attemptNumber: 1,
        });

        // Record failure in circuit breaker if error is transient
        if (classification.shouldRetry) {
          this.circuitBreaker.recordFailure();
        }

        await this.idempotencyManager.markAsFailed(
          processingId,
          err instanceof Error ? err.message : String(err),
          classification.classification,
          {
            errorType: err instanceof Error ? err.constructor.name : typeof err,
            rootCause: classification.rootCause,
            circuitBreakerMetrics: this.circuitBreaker.getMetrics(),
          }
        );

        this.logger?.error('Error processing checkout session (classified)', {
          externalId,
          processingId,
          classification: classification.classification,
          error: err instanceof Error ? err.message : String(err),
          circuitBreakerState: this.circuitBreaker.getMetrics().state,
        });

        return {
          success: false,
          httpStatus: classification.httpStatus,
          message: classification.message,
          processingId,
          retryable: classification.shouldRetry,
        };
      }

      // Step 4: Send confirmation email (best-effort, don't fail if this fails)
      try {
        const correlationId = this.logger?.getCorrelationId?.();
        await this.sendConfirmationEmail(email, courseId, session, correlationId);
      } catch (err) {
        this.logger?.warn('Email sending failed (non-fatal)', {
          externalId,
          email,
          error: err instanceof Error ? err.message : String(err),
        });
        // Continue anyway - enrollment already recorded
      }

      // Step 5: Mark as succeeded
      await this.idempotencyManager.markAsSucceeded(processingId);

      // Record success in circuit breaker
      this.circuitBreaker.recordSuccess();

      this.logger?.info('Webhook processed successfully', {
        externalId,
        processingId,
        studentId,
        email,
        courseId,
      });

      return {
        success: true,
        httpStatus: 200,
        message: 'Webhook processed successfully',
        processingId,
      };
    } catch (err) {
      // Fallback for unexpected errors
      const classification = this.errorClassifier.classify(err);

      // Record failure in circuit breaker if error is transient
      if (classification.shouldRetry) {
        this.circuitBreaker.recordFailure();
      }

      if (processingId) {
        try {
          await this.idempotencyManager.markAsFailed(
            processingId,
            err instanceof Error ? err.message : String(err),
            classification.classification,
            {
              errorType: err instanceof Error ? err.constructor.name : typeof err,
              circuitBreakerMetrics: this.circuitBreaker.getMetrics(),
            }
          );
        } catch (markError) {
          this.logger?.error('Failed to mark webhook as failed', {
            externalId,
            processingId,
            error: markError instanceof Error ? markError.message : String(markError),
          });
        }
      }

      this.logger?.error('Unexpected error in webhook processor', {
        externalId,
        processingId,
        classification: classification.classification,
        error: err instanceof Error ? err.message : String(err),
        circuitBreakerState: this.circuitBreaker.getMetrics().state,
      });

      return {
        success: false,
        httpStatus: classification.httpStatus,
        message: classification.message,
        processingId,
        retryable: classification.shouldRetry,
      };
    }
  }

  /**
   * Validate session metadata
   */
  private validateSessionMetadata(
    session: Stripe.Checkout.Session
  ): {
    valid: boolean;
    email?: string;
    courseId?: string;
    error?: string;
  } {
    const email = session.customer_email || session.metadata?.email;
    const courseId = session.metadata?.course_id;
    const productType = session.metadata?.product_type || 'quiz';

    // Only process Quiz product enrollments
    if (productType !== 'quiz') {
      return {
        valid: false,
        error: `Non-quiz product type not processed: ${productType}`,
      };
    }

    if (!email) {
      return {
        valid: false,
        error: 'Missing student email in session.customer_email or metadata.email',
      };
    }

    if (!courseId) {
      return {
        valid: false,
        error: 'Missing course_id in session metadata',
      };
    }

    return { valid: true, email, courseId };
  }

  /**
   * Mark webhook as processing in database
   */
  private async markWebhookAsProcessing(
    externalId: string,
    event: Stripe.Event,
    session: Stripe.Checkout.Session
  ): Promise<string> {
    const processingId = await this.idempotencyManager.markAsProcessing(
      externalId,
      'stripe',
      event.type,
      session.id,
      'checkout_session',
      event.data,
      {
        studentEmail: session.customer_email || session.metadata?.email,
        courseId: session.metadata?.course_id,
        productType: session.metadata?.product_type,
        amount: session.amount_total,
        currency: session.currency,
      }
    );

    return processingId;
  }

  /**
   * Upsert student record and create quiz purchase (atomic RPC transaction)
   *
   * Calls RPC function `enroll_student_and_record_purchase()` which atomically:
   *   1. Upserts student record (or updates if exists)
   *   2. Inserts quiz_purchases record (with idempotency via UNIQUE constraint)
   *   Both operations succeed or both roll back (all-or-nothing semantics)
   *
   * Time Complexity: O(1) - both operations are index lookups
   * Transaction: Guaranteed atomic by PostgreSQL at database level
   * Idempotency: UNIQUE constraint on external_invoice_id prevents duplicates
   *
   * @param email Student email address
   * @param courseId Course identifier from Stripe metadata
   * @param session Stripe checkout session with amount and currency
   * @param externalId Stripe event ID (unused here, kept for method signature compatibility)
   * @returns Student ID on success
   * @throws If RPC function returns error or both operations fail
   */
  private async upsertStudentAndCreateBilling(
    email: string,
    courseId: string,
    session: Stripe.Checkout.Session,
    externalId: string
  ): Promise<string> {
    // Call atomic RPC function: enroll_student_and_record_purchase
    // This wraps both upsert + insert in a single PostgreSQL transaction
    // See: supabase/migrations/041_atomic_enrollment_rpc.sql

    const amountCents = session.amount_total || 0;
    const currency = (session.currency || 'USD').toUpperCase();

    const { data: enrollmentResult, error: rpcError } = await this.supabase.rpc(
      'enroll_student_and_record_purchase',
      {
        p_email: email,
        p_course_id: courseId,
        p_amount_cents: amountCents,
        p_currency: currency,
        p_payment_method: 'stripe',
        p_external_invoice_id: session.id,
        p_first_name: '', // Use RPC default "Student"
        p_last_name: '',  // Use RPC default empty string
      }
    );

    // Handle RPC execution errors (not business logic errors from the function)
    if (rpcError) {
      throw new Error(
        `RPC execution failed: ${rpcError.message}. ` +
        `Code: ${rpcError.code || 'UNKNOWN'}`
      );
    }

    // Verify we got a result
    if (!enrollmentResult || enrollmentResult.length === 0) {
      throw new Error('RPC returned empty result (no response from enroll_student_and_record_purchase)');
    }

    const result = enrollmentResult[0];

    // Check if the function returned success
    if (!result.success) {
      // Business logic error from within the function (validation failed, etc.)
      throw new Error(
        `Enrollment transaction failed: ${result.error_message} ` +
        `(code: ${result.error_code || 'UNKNOWN'})`
      );
    }

    // Handle idempotent retry (webhook retry with same session ID)
    if (result.error_code === 'IDEMPOTENT_RETRY') {
      this.logger?.debug('Webhook retry detected - purchase already recorded', {
        email,
        courseId,
        sessionId: session.id,
        purchaseId: result.purchase_id,
      });
      // Return success - student ID is still valid for this case
    }

    // Verify we got student ID
    if (!result.student_id) {
      throw new Error(
        'Enrollment transaction completed but student_id is missing (data integrity error)'
      );
    }

    return result.student_id;
  }

  /**
   * Send confirmation email via Brevo (best-effort)
   *
   * Uses externalized email templates from lib/email/templates/
   * to support easy template updates and future i18n.
   *
   * @param email Student email
   * @param courseId Course identifier
   * @param session Stripe checkout session
   * @param correlationId Correlation ID for tracing the enrollment flow
   * @throws If Brevo API fails or template loading fails
   */
  private async sendConfirmationEmail(
    email: string,
    courseId: string,
    session: Stripe.Checkout.Session,
    correlationId?: string
  ): Promise<void> {
    if (!this.brevoApiKey) {
      this.logger?.debug('Brevo API key not configured, skipping email');
      return;
    }

    // Lazy-load template loader to avoid top-level imports
    const { loadAndRenderEmailTemplate } = await import('@/lib/email/email-template-loader');

    const amount = (session.amount_total || 0) / 100;

    // Extract student name from email (before @) or use generic "Friend"
    const firstName = email.split('@')[0] || 'Friend';

    try {
      // Load and render the enrollment confirmation template
      const renderedTemplate = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName,
          courseId,
          amount: amount.toFixed(2),
          email,
          courseName: 'Course', // Could be enhanced with actual course name from DB
          enrollmentDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          currentYear: new Date().getFullYear().toString(),
        }
      );

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.brevoApiKey,
          'Content-Type': 'application/json',
          ...(correlationId && { 'X-Correlation-ID': correlationId }),
        },
        body: JSON.stringify({
          to: [{ email }],
          sender: { email: 'support@dailyagile.com', name: 'DailyAgile' },
          subject: renderedTemplate.subject,
          htmlContent: renderedTemplate.html,
          textContent: renderedTemplate.text,
          headers: correlationId ? { 'X-Correlation-ID': correlationId } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Brevo API error: ${response.status} ${response.statusText}`
        );
      }

      this.logger?.debug('Confirmation email sent successfully', {
        email,
        courseId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error('Failed to send confirmation email', {
        email,
        courseId,
        error: message,
      });
      throw error;
    }
  }
}

/**
 * Factory function to create processor with standard logger
 */
export function createStripeWebhookProcessor(
  supabase: SupabaseClient,
  brevoApiKey: string | undefined,
  logger?: Logger,
  circuitBreaker?: CircuitBreaker
): StripeWebhookProcessor {
  return new StripeWebhookProcessor(
    supabase,
    brevoApiKey,
    logger || createDefaultLogger(),
    circuitBreaker
  );
}

/**
 * Default logger using console
 */
function createDefaultLogger(): Logger {
  return {
    error: (msg, context) =>
      console.error(`[ERROR] ${msg}`, context || ''),
    info: (msg, context) =>
      console.info(`[INFO] ${msg}`, context || ''),
    warn: (msg, context) =>
      console.warn(`[WARN] ${msg}`, context || ''),
    debug: (msg, context) =>
      process.env.DEBUG && console.debug(`[DEBUG] ${msg}`, context || ''),
  };
}
