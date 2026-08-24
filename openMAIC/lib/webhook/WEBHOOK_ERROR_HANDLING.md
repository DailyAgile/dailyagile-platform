# Webhook Error Handling & Idempotency Guide

## Overview

This document describes DailyAgile's production-ready webhook error handling system for Stripe checkout events. The system ensures:

1. **Idempotency**: Each webhook is processed exactly once (no duplicate billing)
2. **Smart Retries**: Transient errors retry automatically; permanent errors fail fast
3. **Atomicity**: Student upsert and billing insert are wrapped together
4. **Graceful Degradation**: Database failures don't lose webhooks (stored for retry)
5. **Audit Trail**: Complete immutable log of all webhook processing

## Architecture

### Three-Tier System

```
┌─────────────────────────────────────────────────────────────┐
│ Stripe Webhook (checkout.session.completed)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ StripeWebhookProcessor                                       │
│ - Orchestrates overall flow                                  │
│ - Handles signature validation (outside)                     │
│ - Delegates to error classification & idempotency            │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
┌────────────────┐  ┌──────────────────┐
│ ErrorClassifier│  │IdempotencyManager│
│                │  │                  │
│ Classifies     │  │ Checks/marks     │
│ TRANSIENT or   │  │ webhooks as      │
│ PERMANENT or   │  │ processed in DB  │
│ IDEMPOTENT     │  │                  │
└────────────────┘  └──────────────────┘
```

### File Structure

```
lib/webhook/
├── error-classification.ts          # ErrorClassifier class
├── idempotency-manager.ts          # IdempotencyManager class
├── stripe-webhook-processor.ts     # StripeWebhookProcessor (orchestrator)
├── WEBHOOK_ERROR_HANDLING.md       # This file
└── __tests__/
    └── error-classification.test.ts # Test suite
```

## Error Classification

### Three Categories

#### 1. TRANSIENT Errors (Retry)
**HTTP Status: 500** (Stripe will retry)

Temporary failures that may recover if retried:

| Error Pattern | Example | Action |
|---|---|---|
| Network timeouts | `ECONNREFUSED`, `ETIMEDOUT` | Retry up to 3x with exponential backoff |
| Rate limits | `429 Too Many Requests` | Retry after backoff |
| Service unavailable | `503 Service Unavailable` | Retry after backoff |
| Database connection pool error | `Pool error: Connection timeout` | Retry after backoff |

**Exponential Backoff Formula:**
```
backoff_seconds = 2^attempt_number * 60
Attempt 1: 1 minute
Attempt 2: 2 minutes
Attempt 3: 4 minutes
```

#### 2. PERMANENT Errors (No Retry)
**HTTP Status: 200** (Stripe won't retry)

Errors that won't fix themselves:

| Error Pattern | Example | Root Cause |
|---|---|---|
| Missing email | `Missing email in metadata` | Invalid webhook payload |
| Missing courseId | `Missing course_id in metadata` | Client configuration error |
| Invalid email format | `Invalid email format: "not-an-email"` | Webhook payload validation |
| Permission denied | `permission denied on table students` | Database role/privilege issue |
| Foreign key violation | `Foreign key violation on course_id` | Invalid courseId reference |
| Unknown error after retries | Exception after 2 retries | Complex failure |

**Why 200?** To prevent Stripe from retrying forever. We log the error for human review.

#### 3. IDEMPOTENT Errors (Duplicate)
**HTTP Status: 200** (No action)

Webhook already processed successfully:

| Error Pattern | Example | Behavior |
|---|---|---|
| Duplicate key | `Unique constraint violation on email` | Return 200 immediately |
| Already processed | `Webhook already processed` | Return 200 immediately |
| Duplicate webhook ID | Same Stripe event ID twice | Database prevents insert |

## Idempotency Implementation

### Database Schema

Three tables track webhook processing:

#### 1. `webhook_processing`
Tracks all webhook processing attempts:

```sql
CREATE TABLE webhook_processing (
  id UUID PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,    -- Stripe event ID
  source TEXT NOT NULL,                 -- 'stripe'
  event_type TEXT NOT NULL,             -- 'checkout.session.completed'
  status TEXT NOT NULL,                 -- 'pending', 'processing', 'succeeded', 'failed', 'idempotent'
  error_classification TEXT,            -- 'transient', 'permanent', 'idempotent'
  attempt_number INTEGER,               -- Number of retries
  max_retries INTEGER DEFAULT 3,        -- Max retry count
  next_retry_at TIMESTAMPTZ,            -- When to retry
  last_error TEXT,                      -- Error message
  error_details JSONB,                  -- Structured error info
  processed_at TIMESTAMPTZ,             -- When succeeded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ON webhook_processing(external_id);
```

#### 2. `webhook_deadletter`
Persistent failures requiring human review:

```sql
CREATE TABLE webhook_deadletter (
  id UUID PRIMARY KEY,
  webhook_processing_id UUID REFERENCES webhook_processing(id),
  error_summary TEXT NOT NULL,
  status TEXT NOT NULL,                 -- 'unreviewed', 'reviewed', 'resolved'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `stripe_transaction_idempotency`
Deduplication for billing records:

```sql
CREATE TABLE stripe_transaction_idempotency (
  id UUID PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL, -- Stripe Session ID
  student_id UUID REFERENCES students(id),
  billing_history_id UUID REFERENCES billing_history(id),
  succeeded BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Processing Flow

```
1. Webhook arrives from Stripe
   ↓
2. Check webhook_processing table for external_id
   ├─ If status='succeeded' → return 200 (idempotent)
   ├─ If status='pending' → may retry
   └─ If status='failed' → check error_classification
      ├─ If transient + attempts < 3 → mark for retry
      └─ If permanent → return 200 (no more retries)
   ↓
3. Mark webhook as 'processing' (atomic UPSERT)
   ↓
4. Validate metadata (email, courseId, etc.)
   ├─ If invalid → classify as PERMANENT, mark failed, return 200
   ↓
5. Process enrollment (upsert student + create billing)
   ├─ If network error → classify as TRANSIENT, mark failed, return 500
   ├─ If validation error → classify as PERMANENT, mark failed, return 200
   ├─ If success → continue
   ↓
6. Send confirmation email (best-effort, don't fail if error)
   ↓
7. Mark webhook as 'succeeded'
   ↓
8. Return 200 OK
```

## Usage Examples

### In Route Handler

```typescript
import { createStripeWebhookProcessor } from '@/lib/webhook/stripe-webhook-processor';
import { getSupabaseClient } from '@/lib/server/supabase-client';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // 1. Verify Stripe signature (outside processor)
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Process with error handling & idempotency
  const supabase = getSupabaseClient();
  const processor = createStripeWebhookProcessor(
    supabase,
    process.env.BREVO_API_KEY,
    logger // optional custom logger
  );

  const result = await processor.process(event);

  // 3. Return appropriate HTTP status
  return NextResponse.json(result, { status: result.httpStatus });
}
```

### Error Classification in Custom Handler

```typescript
import { ErrorClassifier } from '@/lib/webhook/error-classification';

const classifier = new ErrorClassifier();

try {
  await processWebhook(event);
} catch (err) {
  const classification = classifier.classify(err, {
    studentEmail: email,
    courseId,
    attemptNumber: 1
  });

  if (classification.classification === 'transient') {
    // Return 500, let Stripe retry
    return NextResponse.json(
      { error: classification.message },
      { status: 500 }
    );
  } else {
    // Return 200, log but no retry
    return NextResponse.json(
      { error: classification.message },
      { status: 200 }
    );
  }
}
```

### Idempotency Check

```typescript
import { IdempotencyManager } from '@/lib/webhook/idempotency-manager';

const manager = new IdempotencyManager(supabase);

// Check if already processed
const check = await manager.checkIdempotency('evt_1234567', 'stripe');

if (check.isIdempotent && check.status === 'succeeded') {
  // Already processed successfully, return 200 without work
  return { success: true, httpStatus: 200, message: 'Already processed' };
}

// Mark as processing
const processingId = await manager.markAsProcessing(
  'evt_1234567',
  'stripe',
  'checkout.session.completed',
  sessionId,
  'checkout_session',
  event.data,
  { studentEmail: email, courseId }
);

try {
  // Process the webhook...
  await processEnrollment(email, courseId);
  
  // Mark as succeeded
  await manager.markAsSucceeded(processingId);
} catch (err) {
  // Mark as failed with classification
  await manager.markAsFailed(
    processingId,
    err.message,
    'transient', // or 'permanent' or 'idempotent'
    { errorType: err.constructor.name }
  );
}
```

## Race Condition Handling

### Problem: Duplicate Processing in Distributed Systems

Two instances receive the same Stripe webhook simultaneously:

```
Instance A                          Instance B
  │                                   │
  └─── Check webhook_processing ──────┘
       (both find: not processed)
  │                                   │
  ├─── Try INSERT webhook_processing  │
  │    ✓ Success (locks row)          │
  │                                   └─── Try INSERT webhook_processing
  │                                        ✗ Unique constraint violation
  │
  ├─── Process enrollment             └─── Handle conflict:
  │    (update student, insert           (increment attempt_number,
  │     billing, send email)              mark status='processing')
  │
  └─── Mark as succeeded              └─── Detect already processed,
       ✓ (from idempotency key)           return 200 (idempotent)
```

### Solution: Database-Level Atomicity

```sql
INSERT INTO webhook_processing (...)
ON CONFLICT (external_id) DO UPDATE SET
  status = 'processing',
  attempt_number = attempt_number + 1,
  updated_at = NOW()
RETURNING id;
```

The database guarantees that:
1. Only one INSERT succeeds
2. Subsequent attempts increment attempt_number
3. No two processes process the same webhook simultaneously

## Monitoring & Debugging

### Query Webhook Status

```sql
-- Get all webhooks for an email
SELECT * FROM webhook_processing
WHERE metadata->>'studentEmail' = 'user@example.com'
ORDER BY created_at DESC;

-- Get failed webhooks
SELECT * FROM webhook_processing
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Get webhooks in deadletter
SELECT wp.*, wd.error_summary
FROM webhook_processing wp
JOIN webhook_deadletter wd ON wd.webhook_processing_id = wp.id
WHERE wd.status = 'unreviewed'
ORDER BY wp.created_at DESC;

-- Retry a failed webhook manually
UPDATE webhook_processing
SET status = 'pending', next_retry_at = NOW()
WHERE external_id = 'evt_1234567';
```

### Logging Output

```
[INFO] Webhook processing complete: {
  externalId: 'evt_1234567',
  eventType: 'checkout.session.completed',
  httpStatus: 200,
  success: true,
  processingId: '550e8400-e29b-41d4-a716-446655440000'
}

[ERROR] Webhook processing failed: {
  externalId: 'evt_1234567',
  errorClassification: 'transient',
  error: 'Connection refused',
  httpStatus: 500,
  shouldRetry: true
}

[WARN] Permanent error (no retry): {
  externalId: 'evt_1234567',
  errorClassification: 'permanent',
  error: 'Missing email in metadata',
  httpStatus: 200,
  shouldRetry: false
}
```

## Testing

### Run Error Classification Tests

```bash
npm test -- lib/webhook/__tests__/error-classification.test.ts
```

### Test Cases Included

✅ Transient errors (connection, timeout, rate limit)
✅ Permanent errors (validation, permission, foreign key)
✅ Idempotent errors (duplicates)
✅ Retry exhaustion
✅ Unknown error handling
✅ Case insensitivity
✅ Error type handling (Error, string, object)

### Manual Testing in Development

```bash
# Trigger a test webhook from Stripe CLI
stripe trigger payment_intent.succeeded

# Use ngrok to expose local server
ngrok http 3000

# Configure webhook endpoint in Stripe Dashboard
# https://your-ngrok-url.ngrok.io/api/quiz/stripe/webhook

# Monitor logs
tail -f logs/stripe-webhook.log
```

## Disaster Recovery

### If Max Retries Exceeded

Webhook moves to `webhook_deadletter` table for manual review:

```sql
SELECT * FROM webhook_deadletter
WHERE status = 'unreviewed'
ORDER BY created_at DESC;

-- After manual investigation/fix:
UPDATE webhook_deadletter
SET status = 'resolved',
    resolution_notes = 'Fixed database connectivity',
    action_description = 'Manually processed enrollment'
WHERE id = 'xxx';
```

### Manual Webhook Replay

```bash
# Get webhook details
SELECT payload FROM webhook_processing
WHERE external_id = 'evt_1234567';

# Re-mark for processing
UPDATE webhook_processing
SET status = 'pending',
    attempt_number = 0,
    next_retry_at = NOW(),
    last_error = NULL
WHERE external_id = 'evt_1234567';
```

## Performance Characteristics

| Operation | Time Complexity | Database Lookups |
|---|---|---|
| Check idempotency | O(1) | 1 indexed SELECT |
| Mark as processing | O(1) | 1 indexed UPSERT |
| Mark as succeeded | O(1) | 1 indexed UPDATE |
| Mark as failed | O(1) | 1 indexed UPDATE |
| Error classification | O(1) | Pattern matching (no DB) |

## Deployment Checklist

- [ ] Migration 032 applied (`webhook_error_handling_and_idempotency.sql`)
- [ ] Environment variables set: `STRIPE_WEBHOOK_SECRET`, `BREVO_API_KEY`
- [ ] Error classification tests pass (`npm test`)
- [ ] Webhook handler updated to use new processor
- [ ] Monitoring/alerting configured for deadletter table
- [ ] Runbook created for manual webhook replay
- [ ] Team trained on error classification logic

## Related Documentation

- **[Stripe Webhook Security](./WEBHOOK_SECURITY.md)** - Signature validation, rate limiting, input validation
- **[Database Schema](../database/WEBHOOK_SCHEMA.md)** - Complete schema documentation
- **[Monitoring Guide](../monitoring/WEBHOOK_MONITORING.md)** - Dashboards and alerts

## Future Enhancements

1. **Circuit Breaker**: Stop retrying if Supabase down for >5 minutes
2. **Webhook Replay UI**: Admin dashboard to manually replay failed webhooks
3. **Slack Integration**: Alert channel when deadletter grows
4. **Bulk Retry**: Script to retry all failed webhooks matching criteria
5. **Webhook Verification**: Verify student enrollment in course after processing

---

**Last Updated:** 2026-08-23
**Author:** Claude Code Agent
**Status:** Production Ready
