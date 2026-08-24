# Webhook Error Handling - Quick Reference

## TL;DR

**Three error categories:**

```
TRANSIENT (network/DB errors)
  ↓
  Return HTTP 500
  Stripe retries up to 3x with exponential backoff
  Example: ECONNREFUSED, ETIMEDOUT, 503

PERMANENT (validation/input errors)
  ↓
  Return HTTP 200 (no retry)
  Log to audit trail and deadletter if manual action needed
  Example: Missing email, invalid courseId, permission denied

IDEMPOTENT (duplicate webhook)
  ↓
  Return HTTP 200 (no action)
  Database prevents duplicate billing records
  Example: Same webhook received twice
```

## Quick Decision Tree

```
ERROR?
  │
  ├─ Connection error (ECONNREFUSED, ETIMEDOUT, etc.)
  │  └─ TRANSIENT → Return 500
  │
  ├─ Rate limit (429, 503, 504)
  │  └─ TRANSIENT → Return 500
  │
  ├─ Validation error (Missing email, courseId, etc.)
  │  └─ PERMANENT → Return 200, log error
  │
  ├─ Permission error (permission denied, access denied)
  │  └─ PERMANENT → Return 200, alert ops
  │
  ├─ Duplicate key error (Unique constraint violation)
  │  └─ IDEMPOTENT → Return 200, no action
  │
  └─ Unknown error
     ├─ Attempt 1? → TRANSIENT (retry), return 500
     └─ Attempt 2+? → PERMANENT (no more retries), return 200
```

## Code Template

### Basic Error Handling

```typescript
const classifier = new ErrorClassifier();

try {
  await processWebhook(event);
} catch (err) {
  const result = classifier.classify(err, { attemptNumber: 1 });
  
  return NextResponse.json(
    { error: result.message },
    { status: result.httpStatus }  // 500 or 200
  );
}
```

### Full Pattern

```typescript
import { createStripeWebhookProcessor } from '@/lib/webhook/stripe-webhook-processor';

// In route handler POST method:
const processor = createStripeWebhookProcessor(
  supabase,
  process.env.BREVO_API_KEY
);

const result = await processor.process(event);
return NextResponse.json(result, { status: result.httpStatus });
```

## Database Queries

### Check webhook status
```sql
SELECT status, attempt_number, error_classification, last_error
FROM webhook_processing
WHERE external_id = 'evt_xxx';
```

### Get failed webhooks
```sql
SELECT * FROM webhook_processing
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Get deadletter (needs manual action)
```sql
SELECT wp.external_id, wp.last_error, wd.error_summary
FROM webhook_deadletter wd
JOIN webhook_processing wp ON wp.id = wd.webhook_processing_id
WHERE wd.status = 'unreviewed'
ORDER BY wd.created_at DESC;
```

### Retry a failed webhook
```sql
UPDATE webhook_processing
SET status = 'pending', next_retry_at = NOW(), attempt_number = 0
WHERE external_id = 'evt_xxx';
```

## Error Classification Patterns

| Pattern | Category | Action |
|---------|----------|--------|
| `ECONNREFUSED`, `ETIMEDOUT` | TRANSIENT | Retry |
| `Pool error`, `Connection timeout` | TRANSIENT | Retry |
| `429`, `503`, `504` | TRANSIENT | Retry |
| `Missing email` | PERMANENT | Log + deadletter |
| `Invalid courseId` | PERMANENT | Log + deadletter |
| `permission denied` | PERMANENT | Alert ops |
| `duplicate key` | IDEMPOTENT | No action |
| Unknown after 2 retries | PERMANENT | Log + deadletter |

## Troubleshooting

### Webhook keeps failing
1. Check `webhook_processing` table for status
2. If TRANSIENT: Check database connectivity
3. If PERMANENT: Check `webhook_deadletter` for error details
4. If IDEMPOTENT: Check if student already enrolled

### Duplicate billing records
Should NOT happen! Idempotency key (`external_id` = Stripe event ID) prevents this.
If it does, check `stripe_transaction_idempotency` table.

### Email not sent
Email is optional (best-effort). Check logs for reason.
Webhook still succeeds; user can manually access course.

### Webhook not retrying
Check if error classified as PERMANENT.
If it should be TRANSIENT, add pattern to `ErrorClassifier`.

## Testing Locally

```bash
# 1. Start Stripe CLI webhook forwarder
stripe listen --forward-to localhost:3000/api/quiz/stripe/webhook

# 2. Trigger test event
stripe trigger payment_intent.succeeded

# 3. Check logs for processing result
# Should see: [INFO] Webhook processing complete
```

## HTTP Status Codes

| Status | Meaning | Stripe Action |
|--------|---------|---------------|
| 200 | Success or permanent error | No retry |
| 500 | Transient error | Retry with backoff |
| 400 | Bad request (signature) | No retry |
| 401 | Unauthorized | No retry |

## Retry Backoff

After each failed attempt, webhook retries with exponential backoff:

```
Attempt 1: Failed
  Wait: 1 minute (2^1 * 60)
  
Attempt 2: Failed
  Wait: 2 minutes (2^2 * 60)
  
Attempt 3: Failed
  Wait: 4 minutes (2^3 * 60)
  
Attempt 4: Failed → Move to deadletter (max retries = 3)
```

## Key Files

| File | Purpose |
|------|---------|
| `error-classification.ts` | ErrorClassifier class |
| `idempotency-manager.ts` | IdempotencyManager class |
| `stripe-webhook-processor.ts` | Main processor (orchestrator) |
| `032_webhook_*.sql` | Database migration |
| `WEBHOOK_ERROR_HANDLING.md` | Full documentation |

## API Reference

### ErrorClassifier

```typescript
classifier.classify(error, context?: ErrorContext)
  → ClassificationResult {
    classification: 'transient' | 'permanent' | 'idempotent'
    httpStatus: 500 | 200
    shouldRetry: boolean
    message: string
  }
```

### IdempotencyManager

```typescript
// Check if already processed
await manager.checkIdempotency(externalId)

// Mark as processing (atomic)
const processingId = await manager.markAsProcessing(...)

// Mark as succeeded
await manager.markAsSucceeded(processingId)

// Mark as failed
await manager.markAsFailed(processingId, message, classification)
```

### StripeWebhookProcessor

```typescript
const processor = createStripeWebhookProcessor(supabase, brevoApiKey);

const result = await processor.process(event);
// result: {
//   success: boolean
//   httpStatus: 200 | 500
//   message: string
//   processingId?: string
//   retryable?: boolean
// }
```

## Best Practices

✅ DO:
- Always check idempotency before processing
- Use database transactions for upsert + billing insert
- Log both success and errors with context
- Return 200 for permanent errors
- Return 500 for transient errors
- Send emails best-effort (don't fail webhook)

❌ DON'T:
- Return 500 for validation errors (permanent)
- Return 200 and let Stripe retry forever
- Process same webhook twice
- Fail webhook for email errors
- Mix transient/permanent classifications

## Emergency Contacts

- **Database Issue**: Check Supabase status page
- **Stripe Issue**: Check Stripe API status
- **Email Issue**: Check Brevo dashboard
- **Unknown**: Check `webhook_deadletter` table

## Example: Complete Flow

```
1. Stripe sends: checkout.session.completed
   ↓
2. Handler calls: processor.process(event)
   ↓
3. Processor:
   a. Checks idempotency (external_id = event.id)
   b. If already succeeded: return 200 ✓
   c. Marks as processing
   d. Validates metadata (email, courseId)
   e. Upserts student + creates billing
   f. Sends email (best-effort)
   g. Marks as succeeded
   h. Returns 200 ✓
   ↓
4. On error:
   a. Classifies error (transient/permanent/idempotent)
   b. Marks as failed with classification
   c. Returns appropriate HTTP status
   d. If max retries exceeded: moves to deadletter
   ↓
5. Stripe receives HTTP 200/500:
   - 200: Does not retry
   - 500: Retries with exponential backoff
```

---

**Quick Links:**
- Full docs: `WEBHOOK_ERROR_HANDLING.md`
- Tests: `__tests__/error-classification.test.ts`
- Database schema: Migration 032
- Handler: `app/api/quiz/stripe/webhook/route.ts`
