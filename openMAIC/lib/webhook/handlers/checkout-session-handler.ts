/**
 * Checkout Session Completed Event Handler
 *
 * Handles Stripe checkout.session.completed events.
 * Processes student enrollments and records payment information.
 *
 * Event Flow:
 * 1. Student completes Stripe checkout
 * 2. Stripe sends checkout.session.completed event to webhook
 * 3. This handler:
 *    - Validates checkout session metadata
 *    - Creates/updates student record in Supabase
 *    - Records payment in billing history
 *    - Sends confirmation email (best-effort)
 *    - Returns appropriate HTTP status based on outcome
 *
 * Error Handling:
 * - TRANSIENT errors (DB timeout) → HTTP 500 (enable Stripe retry)
 * - PERMANENT errors (invalid email) → HTTP 200 (prevent Stripe retry)
 * - IDEMPOTENT errors (duplicate) → HTTP 200 (already handled)
 *
 * Security:
 * - Validates all metadata before processing
 * - Prevents XSS via HTML escaping
 * - Verifies amount against course prices
 * - Idempotent via webhook ID deduplication
 */

import Stripe from 'stripe';
import { SupabaseClient } from '@supabase/supabase-js';
import { WebhookEventHandler, WebhookProcessingResult } from '../types/webhook-event-handler';
import { StripeWebhookProcessor } from '../stripe-webhook-processor';
import { CircuitBreaker } from '../circuit-breaker';

interface Logger {
  error: (msg: string, context?: Record<string, unknown>) => void;
  info: (msg: string, context?: Record<string, unknown>) => void;
  warn: (msg: string, context?: Record<string, unknown>) => void;
  debug: (msg: string, context?: Record<string, unknown>) => void;
}

/**
 * CheckoutSessionCompletedHandler
 *
 * Handles checkout.session.completed events from Stripe.
 * Delegates business logic to StripeWebhookProcessor for testability.
 *
 * Implementation Note:
 * This handler uses composition over inheritance to reuse StripeWebhookProcessor logic.
 * The processor handles all the complex business logic while this handler provides
 * the WebhookEventHandler interface.
 *
 * @example
 * const handler = new CheckoutSessionCompletedHandler(supabase, brevoApiKey, logger);
 * if (handler.canHandle(event)) {
 *   const result = await handler.handle(event);
 *   return NextResponse.json(result, { status: result.httpStatus });
 * }
 */
export class CheckoutSessionCompletedHandler implements WebhookEventHandler {
  private processor: StripeWebhookProcessor;

  /**
   * Initialize handler
   *
   * @param supabase - Supabase client for database operations
   * @param brevoApiKey - Brevo API key for sending confirmation emails (optional)
   * @param logger - Logger instance (optional)
   * @param circuitBreaker - Circuit breaker for handling dependency failures (optional)
   */
  constructor(
    private supabase: SupabaseClient,
    private brevoApiKey: string | undefined,
    private logger?: Logger,
    private circuitBreaker?: CircuitBreaker
  ) {
    // Initialize processor with same dependencies
    this.processor = new StripeWebhookProcessor(supabase, brevoApiKey, {
      error: (msg: string, ctx?: Record<string, unknown>) => logger?.error(msg, ctx),
      info: (msg: string, ctx?: Record<string, unknown>) => logger?.info(msg, ctx),
      warn: (msg: string, ctx?: Record<string, unknown>) => logger?.warn(msg, ctx),
      debug: (msg: string, ctx?: Record<string, unknown>) => logger?.debug(msg, ctx),
    }, circuitBreaker);
  }

  /**
   * Determine if this handler can process the event
   *
   * Only returns true for checkout.session.completed events.
   * Other event types are passed to other handlers or acknowledged without processing.
   *
   * @param event - Stripe event to check
   * @returns true if event.type === 'checkout.session.completed'
   */
  canHandle(event: Stripe.Event): boolean {
    return event.type === 'checkout.session.completed';
  }

  /**
   * Process checkout.session.completed event
   *
   * Delegates to StripeWebhookProcessor which handles:
   * - Idempotency checking
   * - Metadata validation
   * - Student upsert + billing record creation
   * - Email confirmation (best-effort)
   * - Error classification
   * - Comprehensive logging
   *
   * HTTP Status Codes Returned:
   * - 200: Successfully processed (or permanent error - don't retry)
   * - 500: Transient error (Stripe will retry)
   *
   * @param event - checkout.session.completed event
   * @returns Processing result with HTTP status
   */
  async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
    this.logger?.debug('CheckoutSessionCompletedHandler.handle() called', {
      eventId: event.id,
      eventType: event.type,
    });

    try {
      // Delegate to processor
      const result = await this.processor.process(event);

      this.logger?.info('Checkout session event processed', {
        eventId: event.id,
        success: result.success,
        httpStatus: result.httpStatus,
      });

      return result;
    } catch (err) {
      // Fallback error handling (should rarely happen since processor catches internally)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      this.logger?.error('Error in CheckoutSessionCompletedHandler', {
        eventId: event.id,
        error: errorMsg,
      });

      // Return 500 for unexpected errors (conservative - allow Stripe retry)
      return {
        success: false,
        httpStatus: 500,
        message: 'Processing failed',
        error: errorMsg,
        retryable: true,
      };
    }
  }
}
