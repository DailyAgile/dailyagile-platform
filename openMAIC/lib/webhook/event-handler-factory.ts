/**
 * Webhook Event Handler Factory
 *
 * Manages registration and retrieval of webhook event handlers.
 * Implements the Factory Pattern to make adding new event types easy.
 *
 * Design Principles:
 * - Extensibility: Add new event types without modifying existing code
 * - Single Responsibility: Factory only manages handler lifecycle
 * - Strategy Pattern: Event type determines which handler processes it
 * - Fail-Safe: Gracefully handles unregistered event types
 *
 * Architecture:
 * 1. Register handlers during factory initialization
 * 2. Route requests to first handler that canHandle() the event
 * 3. Return 200 + log for unhandled event types (acknowledge but don't process)
 *
 * Benefits Over Hardcoded Switch:
 * - No need to modify route.ts when adding new event types
 * - Handlers are loosely coupled and independently testable
 * - Easy to conditionally register handlers (A/B testing, feature flags)
 * - Single Responsibility: route.ts doesn't need to know about handler types
 */

import Stripe from 'stripe';
import { WebhookEventHandler, WebhookProcessingResult } from './types/webhook-event-handler';

/**
 * WebhookEventHandlerFactory
 *
 * Singleton factory for managing webhook event handlers.
 * Provides registration and event routing capabilities.
 *
 * Usage:
 * ```typescript
 * // Create factory
 * const factory = new WebhookEventHandlerFactory();
 *
 * // Register handlers
 * factory.register(new CheckoutSessionCompletedHandler(...));
 * factory.register(new MyCustomEventHandler(...));
 *
 * // Route event
 * const handler = factory.getHandler(event);
 * if (handler) {
 *   const result = await handler.handle(event);
 *   return NextResponse.json(result, { status: result.httpStatus });
 * }
 * ```
 */
export class WebhookEventHandlerFactory {
  private handlers: WebhookEventHandler[] = [];

  /**
   * Register a webhook event handler
   *
   * Handlers are checked in registration order (first to canHandle wins).
   * This allows priority-based handler selection.
   *
   * @param handler - Handler to register
   * @throws Errors during handler registration are logged but don't fail startup
   *
   * @example
   * factory.register(new CheckoutSessionCompletedHandler(supabase, logger));
   * factory.register(new InvoicePaymentFailedHandler(supabase, logger));
   */
  register(handler: WebhookEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Register multiple handlers at once
   *
   * Convenient for batch registration during factory initialization.
   *
   * @param handlers - Array of handlers to register
   *
   * @example
   * factory.registerAll([
   *   new CheckoutSessionCompletedHandler(...),
   *   new InvoicePaymentFailedHandler(...),
   * ]);
   */
  registerAll(handlers: WebhookEventHandler[]): void {
    handlers.forEach((handler) => this.register(handler));
  }

  /**
   * Get handler for event
   *
   * Returns the first handler that canHandle() the event.
   * Returns null if no handler can process the event.
   *
   * @param event - Stripe event
   * @returns Handler capable of processing the event, or null
   *
   * @example
   * const handler = factory.getHandler(event);
   * if (handler) {
   *   const result = await handler.handle(event);
   * } else {
   *   // Log unhandled event type
   *   log.info(`Unhandled event type: ${event.type}`);
   * }
   */
  getHandler(event: Stripe.Event): WebhookEventHandler | null {
    return this.handlers.find((handler) => handler.canHandle(event)) || null;
  }

  /**
   * Get all registered handlers
   *
   * Useful for debugging or introspection.
   *
   * @returns Array of registered handlers
   */
  getHandlers(): WebhookEventHandler[] {
    return [...this.handlers];
  }

  /**
   * Clear all registered handlers
   *
   * Useful for testing or dynamic handler reconfiguration.
   */
  clear(): void {
    this.handlers = [];
  }

  /**
   * Get registered handler count
   *
   * Useful for validation and debugging.
   *
   * @returns Number of registered handlers
   */
  handlerCount(): number {
    return this.handlers.length;
  }
}

/**
 * Default factory instance (singleton pattern)
 *
 * Create a single factory instance and reuse it across requests.
 * This pattern avoids recreating handlers on every request.
 *
 * Usage:
 * ```typescript
 * export const webhookFactory = createDefaultFactory();
 *
 * // In webhook route:
 * const handler = webhookFactory.getHandler(event);
 * ```
 *
 * Benefits:
 * - Handlers with expensive initialization (DB connections) only run once
 * - Consistent handler configuration across all requests
 * - Easy to test by mocking or overriding default instance
 */
export function createDefaultFactory(): WebhookEventHandlerFactory {
  return new WebhookEventHandlerFactory();
}
