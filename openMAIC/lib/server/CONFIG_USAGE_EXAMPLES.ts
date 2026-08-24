/**
 * Configuration Usage Examples
 * ============================
 *
 * Quick reference showing before/after usage of centralized configuration.
 * Copy-paste these examples when refactoring webhook handler code.
 */

// ============================================================================
// EXAMPLE 1: Checking Stripe Event Types
// ============================================================================

// ❌ BEFORE: Magic string comparison
if (event.type === 'checkout.session.completed') {
  console.log('Processing checkout');
}

// ✅ AFTER: Using configuration constant
import { STRIPE_EVENTS } from '@/lib/constants/stripe-events';

if (event.type === STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED) {
  console.log('Processing checkout');
}

// ✅ EVEN BETTER: Using validation helper
import { isSupportedStripeEvent } from '@/lib/constants/stripe-events';

if (isSupportedStripeEvent(event.type)) {
  // Handle supported events
}

// ============================================================================
// EXAMPLE 2: Checking Product Types
// ============================================================================

// ❌ BEFORE: Hardcoded product type check
const productType = session.metadata?.product_type || 'quiz';
if (productType !== 'quiz') {
  console.log('Skipping non-quiz product:', productType);
  return NextResponse.json({ success: true });
}

// ✅ AFTER: Using product type constant and helper
import { PRODUCT_TYPES, triggersEnrollment } from '@/lib/constants/product-types';

const productType = session.metadata?.product_type;
if (!triggersEnrollment(productType)) {
  console.log('Skipping product:', productType);
  return NextResponse.json({ success: true });
}

// ============================================================================
// EXAMPLE 3: Returning Error Responses
// ============================================================================

// ❌ BEFORE: Magic string and status code
if (!signature) {
  return NextResponse.json(
    { error: 'Missing signature' },
    { status: 400 }
  );
}

// ✅ AFTER: Using error constant and helper
import { WEBHOOK_ERRORS, HTTP_STATUS, getHttpStatusForError } from '@/lib/constants/webhook-errors';

if (!signature) {
  const status = getHttpStatusForError(WEBHOOK_ERRORS.MISSING_SIGNATURE);
  return NextResponse.json(
    { error: WEBHOOK_ERRORS.MISSING_SIGNATURE },
    { status }
  );
}

// ============================================================================
// EXAMPLE 4: Email Service Configuration
// ============================================================================

// ❌ BEFORE: Hardcoded URL and sender info
async function sendEmail(email: string) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [{ email }],
      sender: { email: 'support@dailyagile.com', name: 'DailyAgile' },
      subject: 'Quiz Course Enrollment Confirmed',
      htmlContent: `
        <p>You can now access your course: <a href="https://dailyagile.com/academy/quiz">Click here</a></p>
      `,
    }),
  });
}

// ✅ AFTER: Using configuration values
import { stripeConfig } from '@/lib/server/stripe-config';

async function sendEmail(email: string, courseId: string) {
  const response = await fetch(stripeConfig.email.apiUrl, {
    method: 'POST',
    headers: {
      'api-key': stripeConfig.email.apiKey || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [{ email }],
      sender: {
        email: stripeConfig.email.senderEmail,
        name: stripeConfig.email.senderName,
      },
      subject: stripeConfig.email.subjectLine,
      htmlContent: `
        <p>You can now access your course: <a href="${stripeConfig.email.appUrl}${stripeConfig.email.courseLinkPath}">Click here</a></p>
      `,
    }),
  });
}

// ============================================================================
// EXAMPLE 5: Handling Timeouts with Retry Logic
// ============================================================================

// ❌ BEFORE: Hardcoded timeout and no structured retry
async function processWebhook(event: any, callback: () => Promise<void>) {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    await Promise.race([callback(), timeoutPromise]);
  } catch (err) {
    // Maybe retry, maybe not - unclear logic
    throw err;
  }
}

// ✅ AFTER: Using configuration for retry logic
import { stripeConfig } from '@/lib/server/stripe-config';

async function processWebhookWithRetry(
  operation: () => Promise<void>,
  operationName: string = 'webhook'
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= stripeConfig.webhook.retryAttempts; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${operationName} timeout exceeded`)),
          stripeConfig.webhook.timeoutMs
        )
      );

      // Race operation against timeout
      await Promise.race([operation(), timeoutPromise]);
      return; // Success
    } catch (err) {
      lastError = err as Error;

      // Don't retry on last attempt
      if (attempt < stripeConfig.webhook.retryAttempts) {
        // Exponential backoff: delay * (2 ^ (attempt - 1))
        const delay = stripeConfig.webhook.retryDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`,
          err
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error(`${operationName} failed after ${stripeConfig.webhook.retryAttempts} attempts`);
}

// ============================================================================
// EXAMPLE 6: Validating Required Metadata
// ============================================================================

// ❌ BEFORE: Ad-hoc validation
const metadata = session.metadata || {};
if (!metadata.course_id || !metadata.email) {
  return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
}

// ✅ AFTER: Using product type schema
import { getRequiredMetadataFields } from '@/lib/constants/product-types';

const productType = session.metadata?.product_type;
const required = getRequiredMetadataFields(productType);
const missing = required.filter(field => !session.metadata?.[field]);

if (missing.length > 0) {
  console.error('Missing required metadata fields:', missing);
  return NextResponse.json(
    { error: WEBHOOK_ERRORS.MISSING_METADATA },
    { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
  );
}

// ============================================================================
// EXAMPLE 7: Logging with Masked Fields
// ============================================================================

// ❌ BEFORE: Accidentally logging sensitive data
console.log('Webhook event:', event);
console.log('Student email:', email);
console.log('Stripe customer:', session.customer_email);

// ✅ AFTER: Using configuration mask list
function logSafely(message: string, data: any): void {
  const masked = { ...data };

  // Apply masking based on configuration
  for (const field of stripeConfig.logging.maskedFields) {
    if (field in masked) {
      masked[field] = '[REDACTED]';
    }
  }

  console.log(message, masked);
}

// Usage
logSafely('Webhook event:', { email: 'student@example.com', customer_id: '123' });
// Output: Webhook event: { email: '[REDACTED]', customer_id: '123' }

// ============================================================================
// EXAMPLE 8: Feature Flag Usage
// ============================================================================

// ❌ BEFORE: Hardcoded feature checks
if (process.env.SEND_EMAILS === 'true') {
  await sendEmail(studentEmail);
}

// ✅ AFTER: Using configuration feature flags
if (stripeConfig.features.sendConfirmationEmails) {
  await sendEmail(studentEmail);
}

// With all features:
if (stripeConfig.features.processCheckoutComplete) {
  // Process payment completion
}

if (stripeConfig.features.recordBillingHistory) {
  // Record transaction
}

if (stripeConfig.features.sendConfirmationEmails) {
  // Send confirmation email
}

// ============================================================================
// EXAMPLE 9: HTTP Status Code Mapping
// ============================================================================

// ❌ BEFORE: Scattered status codes
if (error instanceof ValidationError) {
  return NextResponse.json({ error: error.message }, { status: 400 });
} else if (error instanceof AuthenticationError) {
  return NextResponse.json({ error: error.message }, { status: 401 });
} else {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// ✅ AFTER: Centralized status code mapping
import { getHttpStatusForError } from '@/lib/constants/webhook-errors';

try {
  // ... process webhook
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : 'Unknown error';
  const status = getHttpStatusForError(errorMsg);
  return NextResponse.json({ error: errorMsg }, { status });
}

// ============================================================================
// EXAMPLE 10: Configuration Validation at Startup
// ============================================================================

// ❌ BEFORE: No validation (fails silently during webhook)
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
  });
  // ... process webhook
}

// ✅ AFTER: Validation at startup (fails fast)
import { stripeConfig, validateStripeConfig } from '@/lib/server/stripe-config';

// This runs automatically when module is imported
// Throws StripeConfigError if any required var is missing
// Application will not start with invalid configuration
validateStripeConfig();

// Later in webhook handler - config is guaranteed valid
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: stripeConfig.apiVersion,
});

// ============================================================================
// EXAMPLE 11: Complete Webhook Handler (After Refactoring)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeConfig } from '@/lib/server/stripe-config';
import { STRIPE_EVENTS } from '@/lib/constants/stripe-events';
import { PRODUCT_TYPES, triggersEnrollment } from '@/lib/constants/product-types';
import { WEBHOOK_ERRORS, HTTP_STATUS, getHttpStatusForError } from '@/lib/constants/webhook-errors';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // Check signature
  if (!signature) {
    return NextResponse.json(
      { error: WEBHOOK_ERRORS.MISSING_SIGNATURE },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  // Initialize Stripe with config values
  const stripe = new Stripe(stripeConfig.secretKey, {
    apiVersion: stripeConfig.apiVersion,
  });

  // Verify signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeConfig.webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: WEBHOOK_ERRORS.INVALID_SIGNATURE },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  // Handle supported events
  if (event.type === STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED) {
    if (!stripeConfig.features.processCheckoutComplete) {
      console.log('Checkout processing disabled by feature flag');
      return NextResponse.json({ success: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const productType = session.metadata?.product_type;

    // Check if product triggers enrollment
    if (!triggersEnrollment(productType)) {
      console.log('Skipping non-enrollment product:', productType);
      return NextResponse.json({ success: true });
    }

    // Process enrollment with retry logic
    try {
      await processWebhookWithRetry(
        () => processCheckoutSession(session),
        'checkout-processing'
      );
      return NextResponse.json({ success: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : WEBHOOK_ERRORS.PROCESSING_FAILED;
      const status = getHttpStatusForError(errorMsg);
      return NextResponse.json({ error: errorMsg }, { status });
    }
  }

  // Acknowledge all other events silently (per Stripe best practices)
  return NextResponse.json({ success: true });
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Key Points for Using Configuration:
 *
 * 1. CONSTANTS (for business logic)
 *    - Import from @/lib/constants/*
 *    - Use for event types, product types, error messages
 *    - These don't change between environments
 *
 * 2. CONFIGURATION (for environment-specific values)
 *    - Import from @/lib/server/stripe-config
 *    - Use for URLs, API keys, timeouts, retries
 *    - These might differ between local/staging/production
 *
 * 3. VALIDATION
 *    - Configuration validates automatically at startup
 *    - Throws StripeConfigError if required vars missing
 *    - Application fails fast with helpful error messages
 *
 * 4. TUNING
 *    - Change timeouts, retries, URLs in stripe-config.ts
 *    - No need to modify webhook handler code
 *    - Changes apply to all handlers importing the config
 *
 * 5. TESTING
 *    - Mock configuration in tests by mocking stripe-config module
 *    - Test error scenarios using WEBHOOK_ERRORS constants
 *    - Test retry logic using retry configuration values
 */
