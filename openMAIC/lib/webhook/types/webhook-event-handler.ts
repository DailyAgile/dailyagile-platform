/**
 * Webhook Event Handler Interface
 *
 * Defines the contract for all webhook event handlers.
 * Enables extensible event processing through the factory pattern.
 *
 * Design Principles:
 * - Single Responsibility: Each handler processes one event type
 * - Strategy Pattern: canHandle() determines if handler can process event
 * - Type Safety: Strong typing for event processing
 * - Error Handling: Standardized result format with HTTP status codes
 */

import Stripe from 'stripe';

export interface WebhookProcessingResult {
  success: boolean;
  httpStatus: number;
  message: string;
  processingId?: string;
  retryable?: boolean;
  error?: string;
}

/**
 * WebhookEventHandler Interface
 *
 * All webhook event handlers must implement this interface.
 *
 * @example
 * class MyCustomEventHandler implements WebhookEventHandler {
 *   canHandle(event: Stripe.Event): boolean {
 *     return event.type === 'customer.created';
 *   }
 *
 *   async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
 *     // Handle customer.created event
 *     return {
 *       success: true,
 *       httpStatus: 200,
 *       message: 'Customer created event processed',
 *     };
 *   }
 * }
 */
export interface WebhookEventHandler {
  /**
   * Determines if this handler can process the given event
   *
   * @param event - Stripe event to check
   * @returns true if this handler should process the event, false otherwise
   *
   * @example
   * canHandle(event) {
   *   return event.type === 'checkout.session.completed';
   * }
   */
  canHandle(event: Stripe.Event): boolean;

  /**
   * Process the webhook event
   *
   * @param event - Stripe event to process
   * @returns Promise resolving to processing result with HTTP status
   *
   * HTTP Status Codes:
   * - 200: Successfully processed OR permanent error (don't retry)
   * - 500: Transient error (Stripe will retry)
   * - 429: Rate limit exceeded
   * - 401: Security validation failed
   *
   * @throws Should not throw - always return WebhookProcessingResult
   *         Any thrown errors will be caught by the route handler
   *
   * @example
   * async handle(event) {
   *   try {
   *     // Process event
   *     return {
   *       success: true,
   *       httpStatus: 200,
   *       message: 'Event processed',
   *     };
   *   } catch (err) {
   *     // Return error with appropriate HTTP status
   *     return {
   *       success: false,
   *       httpStatus: 500,
   *       message: 'Processing failed',
   *       error: err.message,
   *     };
   *   }
   * }
   */
  handle(event: Stripe.Event): Promise<WebhookProcessingResult>;
}
