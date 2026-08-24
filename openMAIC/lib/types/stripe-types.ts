/**
 * Stripe Type Guards and Utilities
 *
 * Provides type-safe access to Stripe event data with proper validation
 * Replaces unsafe `as any` casts with proper TypeScript type narrowing
 */

import Stripe from 'stripe';

/**
 * Type guard: check if event is a checkout.session.completed event
 * Narrows event type from generic Stripe.Event to specific checkout event
 *
 * @param event Stripe event to validate
 * @returns True if event contains a checkout session object
 */
export function isCheckoutSessionCompletedEvent(
  event: Stripe.Event
): event is Stripe.Event & { data: { object: Stripe.Checkout.Session } } {
  return (
    event.type === 'checkout.session.completed' &&
    typeof event.data === 'object' &&
    event.data !== null &&
    'object' in event.data &&
    (event.data.object as any)?.object === 'checkout.session'
  );
}

/**
 * Safely extract checkout session from event
 * Validates type before casting to prevent runtime errors
 *
 * @param event Stripe event
 * @returns Checkout session if valid, throws error otherwise
 * @throws Error if event doesn't contain valid checkout session
 */
export function extractCheckoutSession(
  event: Stripe.Event
): Stripe.Checkout.Session {
  if (!isCheckoutSessionCompletedEvent(event)) {
    throw new Error(
      `Invalid event type for checkout session: expected checkout.session.completed, got ${event.type}`
    );
  }

  const session = event.data.object;

  if (!session || typeof session !== 'object') {
    throw new Error('Invalid checkout session object in event data');
  }

  return session as Stripe.Checkout.Session;
}

/**
 * Type guard: check if value is a Stripe customer ID
 * Validates format: "cus_" prefix followed by alphanumeric characters
 *
 * @param value String to validate
 * @returns True if value matches Stripe customer ID format
 */
export function isStripeCustomerId(value: string): value is string {
  return /^cus_[a-zA-Z0-9]{14,}$/.test(value);
}

/**
 * Type guard: check if value is a Stripe session ID
 * Validates format: "cs_" prefix followed by alphanumeric characters
 *
 * @param value String to validate
 * @returns True if value matches Stripe session ID format
 */
export function isStripeSessionId(value: string): value is string {
  return /^cs_[a-zA-Z0-9]{14,}$/.test(value);
}

/**
 * Safely parse webhook amount (in cents) to dollars
 * Prevents float precision errors
 *
 * @param amountCents Amount in cents (e.g., 5999 = $59.99)
 * @returns Amount in dollars as fixed decimal string
 *
 * @example
 *   formatWebhookAmount(5999) → '$59.99'
 *   formatWebhookAmount(null) → '$0.00'
 */
export function formatWebhookAmount(amountCents: number | null): string {
  if (!amountCents) return '$0.00';
  return `$${(amountCents / 100).toFixed(2)}`;
}

/**
 * Stripe currency code type (ISO 4217)
 * Only most common currencies to catch typos
 */
export type StripeCurrency =
  | 'usd' | 'eur' | 'gbp' | 'jpy' | 'cad' | 'aud' | 'chf'
  | 'cny' | 'inr' | 'mxn' | 'brl' | 'nzd' | 'zar';

/**
 * Type guard: check if currency is valid
 *
 * @param currency Currency code to validate
 * @returns True if currency is in allowed list
 */
export function isValidStripeCurrency(currency: string): currency is StripeCurrency {
  const validCurrencies: StripeCurrency[] = [
    'usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'chf',
    'cny', 'inr', 'mxn', 'brl', 'nzd', 'zar',
  ];
  return validCurrencies.includes(currency.toLowerCase() as StripeCurrency);
}

/**
 * Normalized Stripe event with guaranteed valid structure
 * Safe to use after type guard validation
 */
export interface ValidatedStripeCheckoutEvent {
  id: string;
  type: 'checkout.session.completed';
  created: number;
  data: {
    object: Stripe.Checkout.Session;
  };
}

/**
 * Validate entire event structure for checkout.session.completed
 * Returns validated event with proper TypeScript types
 *
 * @param event Raw Stripe event
 * @returns Validated event or throws error
 */
export function validateCheckoutEvent(
  event: Stripe.Event
): ValidatedStripeCheckoutEvent {
  if (event.type !== 'checkout.session.completed') {
    throw new Error(`Expected checkout.session.completed, got ${event.type}`);
  }

  if (!event.id || typeof event.id !== 'string') {
    throw new Error('Missing or invalid event ID');
  }

  if (!event.created || typeof event.created !== 'number') {
    throw new Error('Missing or invalid event timestamp');
  }

  const session = extractCheckoutSession(event);

  return {
    id: event.id,
    type: event.type,
    created: event.created,
    data: { object: session },
  };
}
