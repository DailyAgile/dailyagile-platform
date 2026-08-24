# Stripe Webhook Configuration Guide

## Overview

This guide documents the centralized Stripe webhook configuration system. All magic strings, hardcoded values, URLs, timeouts, and retry logic are extracted into configuration files and can be tuned without modifying webhook handler code.

## Configuration Architecture

```
lib/
├── constants/
│   ├── stripe-events.ts       ← Stripe event type constants
│   ├── product-types.ts        ← Product type constants
│   └── webhook-errors.ts       ← Error types and HTTP status codes
└── server/
    ├── stripe-config.ts        ← Central configuration module (✓ validates at startup)
    └── STRIPE_CONFIG_GUIDE.md   ← This file
```

## Key Principles

### 1. **No Magic Strings**
Before (❌ hard to maintain):
```typescript
if (event.type === 'checkout.session.completed') {
  // ...
}
```

After (✅ type-safe and centralized):
```typescript
import { STRIPE_EVENTS } from '@/lib/constants/stripe-events';

if (event.type === STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED) {
  // ...
}
```

### 2. **Startup Validation**
Environment variables are validated when the application starts, not when a webhook arrives. This means:
- ✅ Configuration errors are caught immediately
- ✅ All webhooks fail fast if config is wrong
- ✅ No surprise failures during production traffic

```typescript
// stripe-config.ts runs this at module load
validateRequired('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY);
validateRequired('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET);
```

### 3. **Centralized Tuning**
All timeout and retry values are in one place:

```typescript
// stripe-config.ts
webhook: {
  timeoutMs: 5000,        // Change here, applies everywhere
  retryAttempts: 3,       // Not in multiple route files
  retryDelayMs: 100,
},
```

### 4. **Type Safety**
Enums prevent typos and provide IDE autocomplete:

```typescript
// Type-safe event types
import { STRIPE_EVENTS, StripeEventType } from '@/lib/constants/stripe-events';

function handleEvent(event: { type: StripeEventType }) {
  // TypeScript knows all possible event types
}
```

## Configuration Files

### 1. `stripe-events.ts` - Stripe Event Types

**What it contains:**
- All possible Stripe event types (current and future)
- Documentation for each event's data structure
- Supported vs unsupported events
- Helper function to check if event is supported

**When to update:**
- When adding support for new Stripe event types (e.g., subscriptions)
- When Stripe releases new event types you want to handle

**Example usage:**
```typescript
import { STRIPE_EVENTS, isSupportedStripeEvent } from '@/lib/constants/stripe-events';

if (isSupportedStripeEvent(event.type)) {
  // Handle supported events
} else {
  // Silently acknowledge unsupported events (per Stripe best practices)
}
```

### 2. `product-types.ts` - Product Types

**What it contains:**
- All product types that can be purchased (quiz, course, bundle, etc.)
- Required metadata fields for each product type
- Products that trigger enrollment
- Validation functions

**When to update:**
- When adding new product offerings
- When changing required metadata fields

**Example usage:**
```typescript
import { PRODUCT_TYPES, triggersEnrollment } from '@/lib/constants/product-types';

const productType = session.metadata?.product_type;
if (triggersEnrollment(productType)) {
  // Create student enrollment
}
```

### 3. `webhook-errors.ts` - Error Types

**What it contains:**
- All error types used in webhook processing
- HTTP status codes for each error
- Error-to-status-code mapping

**When to update:**
- When adding new error scenarios
- When changing error messages
- When changing HTTP status codes

**Example usage:**
```typescript
import { WEBHOOK_ERRORS, getHttpStatusForError } from '@/lib/constants/webhook-errors';

try {
  // Process webhook
} catch (err) {
  const status = getHttpStatusForError(WEBHOOK_ERRORS.STUDENT_CREATION_FAILED);
  return NextResponse.json(
    { error: WEBHOOK_ERRORS.STUDENT_CREATION_FAILED },
    { status }
  );
}
```

### 4. `stripe-config.ts` - Central Configuration

**What it contains:**
- Stripe API credentials (validated at startup)
- Stripe API version
- Webhook processing timeouts and retries
- Email service configuration (Brevo)
- Database configuration
- Feature flags
- HTTP client defaults
- Logging configuration

**When to update:**
- When adding new environment variables
- When tuning performance (timeouts, retries)
- When changing email templates
- When enabling/disabling features

**Key sections:**

#### Webhook Configuration
```typescript
webhook: {
  timeoutMs: 5000,           // Max time to process webhook
  retryAttempts: 3,          // Retry transient errors
  retryDelayMs: 100,         // Exponential backoff: 100ms → 200ms → 400ms
  errors: {                  // Error messages for responses
    missingSignature: '...',
    invalidSignature: '...',
    // ...
  },
},
```

#### Email Configuration
```typescript
email: {
  apiUrl: 'https://api.brevo.com/v3/smtp/email',
  apiKey: brevoApiKey,        // From environment
  timeoutMs: 3000,            // Brevo API timeout
  retryAttempts: 2,           // Non-critical; enrollment succeeds even if email fails
  senderEmail: 'support@dailyagile.com',
  appUrl: appUrl,             // From NEXT_PUBLIC_APP_URL env
  courseLinkPath: '/academy/quiz',
},
```

#### Feature Flags
```typescript
features: {
  processCheckoutComplete: true,      // Enable/disable webhook processing
  sendConfirmationEmails: true,       // Enable/disable emails
  recordBillingHistory: true,         // Enable/disable billing records
},
```

## Environment Variables

### Required (validation fails at startup if missing)

| Variable | Purpose | Example |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe API authentication | `sk_test_[your-key]` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | `whsec_test_...` |

### Optional but Recommended

| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| `BREVO_API_KEY` | Email confirmation service | Not set | `xkeysib_...` |
| `NEXT_PUBLIC_APP_URL` | Application base URL for email links | `http://localhost:3000` | `https://dailyagile.com` |
| `LOG_LEVEL` | Logging verbosity | `info` | `debug`, `info`, `warn`, `error` |

### Configuration in `.env.local`

```bash
# Required
STRIPE_SECRET_KEY=sk_test_[your-stripe-secret-key]
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder

# Optional
BREVO_API_KEY=xkeysib_...
NEXT_PUBLIC_APP_URL=https://dailyagile.com
LOG_LEVEL=info
```

## Performance Tuning

### Timeout Values

**Webhook Processing Timeout** (`webhook.timeoutMs`)
```typescript
timeoutMs: 5000  // 5 seconds
```

When to increase:
- Database is slow (check Supabase query performance)
- Brevo email API is consistently slow
- You're processing complex data transformations

When to decrease:
- Webhooks are timing out frequently
- You want faster failure detection
- You know operations should be fast

Constraints:
- Must be > 0
- Should be < Vercel serverless timeout (~30 seconds)
- Stripe will retry on timeout (exponential backoff)

**Email Service Timeout** (`email.timeoutMs`)
```typescript
timeoutMs: 3000  // 3 seconds
```

Should be less than `webhook.timeoutMs` because email isn't critical to enrollment.

### Retry Configuration

**Webhook Retries** (`webhook.retryAttempts`)
```typescript
retryAttempts: 3
retryDelayMs: 100    // Exponential: 100ms → 200ms → 400ms
```

These retries are for transient errors (database timeouts, temporary unavailability):
- Attempt 1: immediate
- Attempt 2: after 100ms delay
- Attempt 3: after 200ms delay

Stripe also retries at its level (separate from these retries).

When to increase:
- Database has frequent transient failures
- Network is unstable
- Email service times out regularly

When to decrease:
- You want to fail fast and rely on Stripe retries
- Resources are limited

**Email Retries** (`email.retryAttempts`)
```typescript
retryAttempts: 2    // Fewer retries because email is non-critical
```

Email failures don't block enrollment. These retries are best-effort.

## Adding New Features

### Example: Add Support for Subscription Events

1. **Add event constant** (`stripe-events.ts`)
```typescript
CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
```

2. **Add to supported events**
```typescript
export const SUPPORTED_STRIPE_EVENTS: readonly StripeEventType[] = [
  STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED,
  STRIPE_EVENTS.CUSTOMER_SUBSCRIPTION_CREATED,  // ← New
] as const;
```

3. **Implement handler** (`app/api/quiz/stripe/webhook/route.ts`)
```typescript
if (event.type === STRIPE_EVENTS.CUSTOMER_SUBSCRIPTION_CREATED) {
  // Handle subscription creation
}
```

4. **Add tests** (see Testing section below)

### Example: Add New Product Type

1. **Add product constant** (`product-types.ts`)
```typescript
CORPORATE_LICENSE: 'corporate-license',
```

2. **Add required fields**
```typescript
PRODUCT_REQUIRED_METADATA[PRODUCT_TYPES.CORPORATE_LICENSE] = [
  'license_id', 'organization', 'admin_email'
];
```

3. **Add enrollment trigger** (if applicable)
```typescript
ENROLLMENT_TRIGGER_PRODUCTS: [
  PRODUCT_TYPES.QUIZ,
  PRODUCT_TYPES.COURSE,
  PRODUCT_TYPES.CORPORATE_LICENSE,  // ← New
]
```

4. **Implement handler** (in webhook route)
5. **Add tests**

## Validation at Startup

The Stripe configuration validates automatically when the application starts:

```typescript
// This runs when lib/server/stripe-config.ts is imported
validateStripeConfig();  // Throws if config invalid
```

What it checks:
- ✅ Required env vars set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- ✅ Timeouts are positive numbers
- ✅ Timeouts aren't too large (warns if > 55 seconds)
- ✅ Retry counts are reasonable (max 10)
- ✅ App URL is configured (warns if not for email links)

Errors are logged with helpful messages:
```
StripeConfigError: Missing required environment variable: STRIPE_WEBHOOK_SECRET
Please set STRIPE_WEBHOOK_SECRET in your .env.local file or deployment environment.
Stripe webhook processing cannot start without this variable.
```

## Testing

### Test 1: Configuration Loads (Happy Path)
```typescript
import { stripeConfig, validateStripeConfig } from '@/lib/server/stripe-config';
import { STRIPE_EVENTS } from '@/lib/constants/stripe-events';
import { WEBHOOK_ERRORS } from '@/lib/constants/webhook-errors';

test('configuration loads successfully', () => {
  // Should not throw
  validateStripeConfig();
  
  // All values should be accessible
  expect(stripeConfig.secretKey).toBeDefined();
  expect(stripeConfig.webhook.timeoutMs).toBe(5000);
  expect(STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED).toBe('checkout.session.completed');
});
```

### Test 2: Environment Variable Validation
```typescript
test('throws when STRIPE_SECRET_KEY missing', () => {
  delete process.env.STRIPE_SECRET_KEY;
  
  expect(() => {
    // Force re-import to trigger validation
    jest.resetModules();
    require('@/lib/server/stripe-config');
  }).toThrow(StripeConfigError);
});
```

### Test 3: Product Type Validation
```typescript
test('validates product types', () => {
  const { isValidProductType } = require('@/lib/constants/product-types');
  
  expect(isValidProductType('quiz')).toBe(true);
  expect(isValidProductType('unknown')).toBe(false);
});
```

### Test 4: Error Mapping
```typescript
test('maps errors to HTTP status codes', () => {
  const { getHttpStatusForError, WEBHOOK_ERRORS, HTTP_STATUS } = 
    require('@/lib/constants/webhook-errors');
  
  expect(getHttpStatusForError(WEBHOOK_ERRORS.INVALID_SIGNATURE))
    .toBe(HTTP_STATUS.BAD_REQUEST);
  
  expect(getHttpStatusForError(WEBHOOK_ERRORS.STUDENT_CREATION_FAILED))
    .toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
});
```

## Migration Checklist

If you're refactoring existing webhook code to use this configuration system:

- [ ] Replace `'checkout.session.completed'` with `STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED`
- [ ] Replace `'quiz'` with `PRODUCT_TYPES.QUIZ`
- [ ] Replace `'https://api.brevo.com/v3/smtp/email'` with `stripeConfig.email.apiUrl`
- [ ] Replace hardcoded timeouts with `stripeConfig.webhook.timeoutMs`
- [ ] Replace hardcoded retry counts with `stripeConfig.webhook.retryAttempts`
- [ ] Replace hardcoded error messages with `WEBHOOK_ERRORS.*`
- [ ] Add tests for configuration validation
- [ ] Verify all existing functionality works unchanged

## Troubleshooting

### "Missing required environment variable: STRIPE_WEBHOOK_SECRET"

**Cause:** `STRIPE_WEBHOOK_SECRET` not set in `.env.local` or deployment environment

**Solution:**
```bash
# Get webhook secret from Stripe dashboard
# Webhooks → Choose endpoint → Signing secret (click to reveal)

# Add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_...
```

### "Webhook processed but student not enrolled"

**Debug checklist:**
1. Check Stripe Dashboard → Webhooks → Logs for the event
2. See if error message indicates what failed
3. Check application logs:
   - `console.log()` calls in webhook handler
   - Sentry/error tracking dashboard
4. Check database:
   - Does `students` table have the record?
   - Does `billing_history` have the transaction?
5. Check email service:
   - Did Brevo receive the request? (Brevo logs)
   - Is API key valid? (Brevo settings)

### "Webhook timeout (5000ms exceeded)"

**Solution:**
1. Check what's slow:
   - Database operations: use Supabase query performance dashboard
   - Email service: check Brevo API logs
2. Increase timeout if needed:
   ```typescript
   // stripe-config.ts
   webhook: {
     timeoutMs: 10000,  // Increase from 5000
   }
   ```
3. Optimize slow operations:
   - Add database indexes
   - Batch operations if possible
   - Consider async email sending

### "Stripe keeps retrying the webhook"

**Causes:**
1. Webhook handler returns HTTP 5xx status
2. Webhook handler times out
3. Webhook handler throws unhandled error

**Fix:**
1. Ensure handler returns HTTP 200 or 202 for success
2. Return HTTP 400-429 for errors that shouldn't be retried
3. Never let unhandled errors propagate to Stripe

**Example:**
```typescript
try {
  // Process webhook
  return NextResponse.json({ success: true });  // HTTP 200
} catch (err) {
  // Return error with appropriate status code
  return NextResponse.json(
    { error: err.message },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }  // HTTP 500
  );
}
```

Stripe will retry 5xx errors with exponential backoff (9 times over 3+ days).

## See Also

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Event Types](https://stripe.com/docs/api/events/types)
- [Brevo SMTP API](https://developers.brevo.com/docs/send-transactional-email)
- Project CLAUDE.md for business context and pricing
