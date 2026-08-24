/**
 * Stripe Webhook Event Types
 * ============================
 *
 * Central registry of all Stripe event types handled by the platform.
 * When a new webhook event needs to be handled, add it here first.
 *
 * Time Complexity: O(1) - all lookups are direct object access
 * No external dependencies
 *
 * Usage:
 *   import { STRIPE_EVENTS } from '@/lib/constants/stripe-events';
 *   if (event.type === STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED) { ... }
 */

export const STRIPE_EVENTS = {
  // Checkout Events
  /**
   * Fired when a checkout session is successfully completed.
   * This is the primary event for processing paid quiz/course enrollments.
   *
   * Session object contains:
   *   - customer_email: Student email address
   *   - amount_total: Amount in cents (divide by 100 for display)
   *   - currency: ISO 4217 currency code (e.g., USD, GBP)
   *   - metadata: Custom data passed during checkout creation
   *     - course_id: ID of the course/quiz being purchased
   *     - product_type: Type of product (quiz, course, bundle)
   *   - id: Unique checkout session ID (external_invoice_id in billing_history)
   */
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',

  // Payment Intent Events (currently not processed, reserved for future use)
  /**
   * Fired when a PaymentIntent has been successfully created.
   * Currently not processed but kept for future subscription support.
   */
  PAYMENT_INTENT_CREATED: 'payment_intent.created',

  /**
   * Fired when a PaymentIntent has sufficient amount captured.
   * Currently not processed but kept for future recurring payment support.
   */
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',

  /**
   * Fired when a PaymentIntent has failed.
   * Currently not processed but kept for future failure notification support.
   */
  PAYMENT_INTENT_FAILED: 'payment_intent.payment_failed',

  // Customer Subscription Events (reserved for future course subscriptions)
  /**
   * Fired when a subscription is successfully created.
   * Reserved for future recurring/subscription-based course offerings.
   */
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',

  /**
   * Fired when a subscription is updated.
   * Reserved for future subscription modification handling.
   */
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',

  /**
   * Fired when a subscription is deleted.
   * Reserved for future subscription cancellation handling.
   */
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',

  // Invoice Events (reserved for future invoicing)
  /**
   * Fired when an invoice is finalized.
   * Reserved for future automated invoice delivery.
   */
  INVOICE_FINALIZED: 'invoice.finalized',

  /**
   * Fired when an invoice payment attempt succeeds.
   * Reserved for future invoice payment tracking.
   */
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',

  /**
   * Fired when an invoice payment attempt fails.
   * Reserved for future payment failure handling.
   */
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
} as const;

/**
 * Type for Stripe event type values
 * Ensures type safety when comparing event.type
 */
export type StripeEventType = (typeof STRIPE_EVENTS)[keyof typeof STRIPE_EVENTS];

/**
 * Currently supported/implemented webhook events
 * Other events are silently ignored (per Stripe best practices)
 */
export const SUPPORTED_STRIPE_EVENTS: readonly StripeEventType[] = [
  STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED,
] as const;

/**
 * Check if an event type is currently implemented
 * @param eventType - The event type to check
 * @returns true if the event type is handled by the platform
 */
export function isSupportedStripeEvent(eventType: unknown): eventType is StripeEventType {
  return SUPPORTED_STRIPE_EVENTS.includes(eventType as StripeEventType);
}
