/**
 * Stripe Webhook Handler - Factory Pattern Integrated
 *
 * Security Features:
 * ✅ Signature validation with replay protection (±5 min timestamp window)
 * ✅ Empty secret throws error (no silent fallback)
 * ✅ HTML escaping for all user input (courseId, email in templates)
 * ✅ PCI DSS compliant immutable audit logging (PII redacted)
 * ✅ Amount validation against expected course prices
 * ✅ Rate limiting (per-customer + global)
 * ✅ Webhook ID deduplication (prevents double-processing)
 * ✅ Timing-safe signature comparison (prevents timing attacks)
 * ✅ Error classification with appropriate HTTP status codes
 * ✅ Extensible handler factory (add new event types without modifying route)
 *
 * Handler Flow (Factory Pattern):
 * 1. Extract + validate signature (throws on empty secret)
 * 2. Check rate limits (per-customer + global)
 * 3. Get handler from factory (find first handler where canHandle() = true)
 * 4. If handler found:
 *    a. Handler delegates to StripeWebhookProcessor
 *    b. Processor handles: idempotency, validation, upsert, email, error classification
 * 5. If no handler found: acknowledge unhandled event type with 200 OK
 * 6. Return handler result with appropriate HTTP status
 *
 * ERROR CLASSIFICATION:
 * - TRANSIENT (DB timeout, network error) → HTTP 500 (enables Stripe retry)
 * - PERMANENT (invalid email, bad metadata) → HTTP 200 (stops Stripe retry)
 * - IDEMPOTENT (duplicate event) → HTTP 200 (already handled)
 *
 * Adding New Event Types:
 * 1. Create handler implementing WebhookEventHandler interface
 * 2. Register handler in webhookFactory initialization (line ~70)
 * 3. No route changes needed - factory routes automatically
 *
 * Benefits of Factory Pattern:
 * - Extensible: Add new event types without modifying route.ts
 * - Testable: Each handler is independently testable
 * - Maintainable: Event-specific logic is isolated in handler classes
 * - Flexible: Conditionally enable handlers based on feature flags
 *
 * Last Updated: 2026-08-23
 * Version: 4.0 (Factory Pattern Integrated)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../../../../../lib/server/supabase-client';
import { createLogger } from '../../../../../lib/logger';
import { StructuredLogger } from '../../../../../lib/server/observability/structured-logger';
import {
  WebhookValidator,
  RateLimiter,
  AuditLogger,
  InputValidator,
  AmountValidator,
} from '../../../../../lib/security/webhook-security';
import { WebhookEventHandlerFactory } from '../../../../../lib/webhook/event-handler-factory';
import { CheckoutSessionCompletedHandler } from '../../../../../lib/webhook/handlers/checkout-session-handler';
import { getCircuitBreaker } from '../../../../../lib/webhook/circuit-breaker';
import { queueEmail } from '../../../../../lib/email/email-queue-service';
import { escapeHtml } from '../../../../../lib/security/html-utils';

const log = createLogger('StripeWebhook');

// ============================================================================
// SETUP - FACTORY & HANDLERS
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Note: webhookSecret is validated in WebhookValidator.validateSignature()
// Empty secret will throw an error there
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Webhook Handler Factory (Singleton)
 *
 * Initialized once at module load time with all registered handlers.
 * Reused for every webhook request.
 *
 * Benefits:
 * - Handlers with expensive initialization (DB connections) only run once
 * - Consistent handler configuration across all requests
 * - Easy to add new event types: just register new handler below
 *
 * Handlers are checked in registration order (first to canHandle wins).
 *
 * Adding a New Event Type:
 * 1. Create handler class implementing WebhookEventHandler
 * 2. Add to webhookFactory.register() below
 * 3. No route changes needed - factory routes automatically
 *
 * @example
 * // Add support for invoice.payment_failed
 * factory.register(new InvoicePaymentFailedHandler(supabase, logger));
 */
const webhookFactory = new WebhookEventHandlerFactory();

/**
 * Initialize factory with handlers
 *
 * All event handlers are registered here.
 * This runs once when the module loads (not on every request).
 */
function initializeWebhookHandlers(): void {
  const supabase = getSupabaseClient();
  const brevoApiKey = process.env.BREVO_API_KEY;
  const circuitBreaker = getCircuitBreaker();

  webhookFactory.registerAll([
    new CheckoutSessionCompletedHandler(supabase, brevoApiKey, {
      error: (msg, ctx) => log.error(msg, ctx),
      info: (msg, ctx) => log.info(msg, ctx),
      warn: (msg, ctx) => log.warn(msg, ctx),
      debug: (msg, ctx) => log.debug(msg, ctx),
    }, circuitBreaker),
    // Add more handlers here as needed:
    // new InvoicePaymentFailedHandler(supabase, logger),
    // new CustomerCreatedHandler(supabase, logger),
  ]);

  log.info('Webhook handlers initialized', {
    handlerCount: webhookFactory.handlerCount(),
    circuitBreakerEnabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
  });
}

// Initialize on module load
initializeWebhookHandlers();

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

/**
 * Stripe webhook endpoint for checkout.session.completed events.
 * Processes student enrollments and records payments.
 *
 * Security: This endpoint is production-hardened against:
 * ✅ Forged webhooks (signature validation)
 * ✅ Replay attacks (timestamp + webhook ID checks)
 * ✅ Brute force (rate limiting)
 * ✅ XSS injection (HTML escaping)
 * ✅ Amount fraud (price validation)
 * ✅ Double-processing (idempotency via webhook ID)
 *
 * HTTP Status Codes (per ErrorClassifier):
 * - 200: Successfully processed OR permanent error (don't retry)
 * - 500: Transient error (Stripe retries)
 * - 401: Security validation failed (signature/rate limit)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // ========================================================================
  // STEP 0: GENERATE CORRELATION ID FOR END-TO-END TRACING
  // ========================================================================
  // This unique ID will be threaded through all operations:
  // webhook → student upsert → billing → email queue → email delivery
  // Enables ops to trace a single enrollment through the entire system

  const correlationId = `webhk_${uuidv4()}`;
  const structuredLogger = new StructuredLogger('StripeWebhook', {
    correlationId,
    jsonFormat: process.env.LOG_FORMAT === 'json',
    enableAuditLogs: true,
    supabaseClient: getSupabaseClient(),
  });

  structuredLogger.logWebhookReceived(true, body.length);

  // ========================================================================
  // STEP 1: VALIDATE WEBHOOK SIGNATURE & TIMESTAMP
  // ========================================================================
  // This will throw if:
  // - webhookSecret is empty (CRITICAL)
  // - Signature header missing
  // - Signature is invalid
  // - Timestamp outside ±5 minute window (replay protection)
  //
  // This is ALWAYS checked first, before any processing

  let event: Stripe.Event;

  try {
    event = WebhookValidator.validateSignature(body, signature, webhookSecret);
    // Now that we have the event, update logger with webhook ID
    structuredLogger.setWebhookId(event.id);
    structuredLogger.logWebhookProcessing(event.type);
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown signature validation error';

    // Log to structured logger
    await structuredLogger.logError(
      'signature_validation_failed',
      errorMsg,
      err instanceof Error ? err.stack : undefined
    );

    // Log security event to audit trail (HTTP 401 response)
    await AuditLogger.logWebhookEvent({
      webhookId: 'unknown',
      eventType: 'signature_validation_failed',
      status: 'denied',
      errorMessage: errorMsg,
    });

    log.error('[SECURITY] Webhook signature validation failed:', { error: errorMsg });
    return NextResponse.json(
      { error: 'Invalid webhook signature', correlationId },
      { status: 401 }
    );
  }

  // ========================================================================
  // SECURITY CHECK 2: GET HANDLER FROM FACTORY
  // ========================================================================
  // Factory pattern: get first handler that canHandle() this event type
  // Returns null if no handler registered for this event type

  const handler = webhookFactory.getHandler(event);

  if (!handler) {
    // Unhandled event type - acknowledge but don't process
    await AuditLogger.logWebhookEvent({
      webhookId: event.id,
      eventType: event.type,
      status: 'success',
      details: { skipped: true, reason: 'no_handler_for_event_type' },
    });

    log.info(`Unhandled event type: ${event.type}`, {
      webhookId: event.id,
      handlerCount: webhookFactory.handlerCount(),
    });

    return NextResponse.json(
      { success: true, message: `Event type ${event.type} acknowledged but not processed` },
      { status: 200 }
    );
  }

  // ========================================================================
  // SECURITY CHECK 3: EXTRACT CUSTOMER EMAIL FOR RATE LIMITING
  // ========================================================================
  // Rate limiting is checked BEFORE processing to prevent abuse
  // We extract email here just for rate limit check, full validation happens in handler

  const session = event.data.object as Stripe.Checkout.Session;
  const studentEmail = session.customer_email || session.metadata?.email || '';

  // ========================================================================
  // SECURITY CHECK 4: RATE LIMITING (per-customer + global)
  // ========================================================================
  // Prevent brute force and abuse
  // Returns HTTP 429 if limit exceeded (not retryable by Stripe)
  // Uses Redis-backed rate limiter for distributed rate limiting

  if (!(await RateLimiter.checkRateLimit(studentEmail))) {
    await AuditLogger.logWebhookEvent({
      webhookId: event.id,
      eventType: event.type,
      customerEmail: studentEmail,
      status: 'denied',
      errorMessage: 'Rate limit exceeded (per-customer or global)',
    });

    log.warn(`[SECURITY] Rate limit exceeded for ${studentEmail}`, {
      webhookId: event.id,
    });
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ========================================================================
  // DELEGATE TO HANDLER (VIA FACTORY PATTERN)
  // ========================================================================
  // Handler processes the event based on its type:
  // - Checkout events: handler delegates to StripeWebhookProcessor
  // - Future event types: add new handler, no route changes needed
  //
  // Handler returns WebhookProcessingResult with appropriate HTTP status:
  // - 200: Successfully processed OR permanent error (don't retry)
  // - 500: Transient error (Stripe retries)
  // - 429: Rate limit exceeded
  // - 401: Security validation failed

  try {
    log.debug('Routing event to handler', {
      webhookId: event.id,
      eventType: event.type,
      handlerType: handler.constructor.name,
    });

    // Call handler - it encapsulates all business logic
    const result = await handler.handle(event);

    // Log completion with correlation ID
    await structuredLogger.logWebhookCompleted(result.httpStatus, Date.now());

    log.info('Webhook processed via handler', {
      webhookId: event.id,
      correlationId,
      eventType: event.type,
      handlerType: handler.constructor.name,
      success: result.success,
      httpStatus: result.httpStatus,
      message: result.message,
    });

    return NextResponse.json({ ...result, correlationId }, { status: result.httpStatus });
  } catch (err) {
    // Fallback catch-all (should rarely happen since processor catches internally)
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown error';

    const webhookId = event?.id || 'unknown';
    const eventType = event?.type || 'checkout.session.completed';

    // Log to structured logger
    await structuredLogger.logError(
      'webhook_processing_failed',
      errorMsg,
      err instanceof Error ? err.stack : undefined
    );

    // Log to audit trail
    await AuditLogger.logWebhookEvent({
      webhookId,
      eventType,
      status: 'error',
      errorMessage: errorMsg,
    });

    log.error('[ERROR] Unexpected error in webhook handler', {
      webhookId,
      correlationId,
      error: errorMsg,
    });

    // Return 500 for unexpected errors (conservative - allow Stripe retry)
    return NextResponse.json(
      { error: 'Processing failed', details: errorMsg, correlationId },
      { status: 500 }
    );
  }
}

// ============================================================================
// NOTE: Email confirmation is now handled by StripeWebhookProcessor
// ============================================================================
// The processor sends enrollment confirmation emails via Brevo API (async, best-effort).
// This keeps the webhook response fast while ensuring email is sent reliably.
