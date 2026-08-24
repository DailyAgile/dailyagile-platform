# Email System Architecture

## Overview

This is a production-ready email system with async delivery, retry logic, and dead-letter queue (DLQ) handling. All user input is HTML-escaped to prevent XSS injection attacks.

### Key Features

✅ **Async Delivery** - Emails queued immediately, processed asynchronously
✅ **Retry Mechanism** - Failed emails retry up to 3 times with exponential backoff
✅ **Dead-Letter Queue** - Unreliable emails moved to DLQ for manual review
✅ **XSS Prevention** - All user input HTML-escaped before rendering
✅ **GDPR Compliant** - Unsubscribe links in all emails (CAN-SPAM compliant)
✅ **Provider Abstraction** - Easily swap email providers (Brevo, SendGrid, etc.)
✅ **Template System** - Centralized templates with variable substitution

## Architecture

```
Webhook (Stripe)
       ↓
Queue Email (O(1) insert to Supabase)
       ↓
Return 200 to Stripe (immediate)
       ↓
Async Worker (cron or Edge Function)
       ↓
Fetch batch of pending emails
       ↓
Send via EmailProvider (Brevo)
       ↓
Success? → Mark 'sent' + store messageId
       ↓
Retryable error? → Increment retry_count, reschedule
       ↓
Non-retryable error? → Move to DLQ
       ↓
Max retries exceeded? → Move to DLQ
```

## Files

### Core System

- **`email-queue-service.ts`** - Main queuing and retry logic
  - `queueEmail()` - Add email to queue
  - `processEmailQueue()` - Process pending emails (called by cron/worker)
  - `getQueueStats()` - Monitor queue health
  - `retryDLQEmail()` - Manually retry DLQ emails

- **`providers/base-provider.ts`** - EmailProvider interface
  - Abstract class for provider implementations
  - Custom error types (RateLimitError, InvalidEmailError, etc.)

- **`providers/brevo-provider.ts`** - Brevo/Sendinblue implementation
  - Full Brevo API integration
  - Error classification (retryable vs non-retryable)
  - Rate limit handling

- **`template-renderer.ts`** - Secure template rendering
  - `escapeHtml()` - XSS prevention for all user input
  - `renderTemplate()` - Safe variable substitution
  - `stripHtml()` - Generate plain text from HTML

- **`send-notification.ts`** - Email template system
  - 12+ email templates (signup, password reset, etc.)
  - Full type safety for template data
  - GDPR/CAN-SPAM compliant headers

### Templates

- **`templates/enrollment-confirmation.html`** - Course enrollment email
  - Modern responsive design
  - DailyAgile branding (navy + teal)
  - Unsubscribe link in footer

### Async Worker

- **`supabase/functions/process-email-queue/`** - Edge Function
  - Processes 10 emails per invocation
  - Called every 5 minutes via pg_cron
  - Comprehensive error handling and logging

## Flow Examples

### Example 1: Happy Path (Stripe Webhook)

```
1. Stripe sends checkout.session.completed
2. Webhook validates signature + metadata
3. Store student record + billing history
4. Queue email: queueEmail(email, 'course-completed', {...})
5. Webhook returns 200 immediately
6. Edge Function (cron every 5 min) picks up email
7. Send via Brevo API
8. Mark email as 'sent' + store messageId
9. Student receives email
```

### Example 2: Retryable Failure

```
1. Email queued as 'pending'
2. Worker tries to send via Brevo
3. Brevo returns 503 (server error) → retryable
4. Email updated: status='failed', retry_count=1
5. scheduled_at set to NOW + 5 minutes
6. Next cron run (5 min later) picks it up again
7. Retry succeeds → mark as 'sent'
```

### Example 3: Max Retries Exceeded

```
1. Email queued, 3 send attempts fail (all retryable)
2. On 4th failure: retry_count=4, max_retries=3
3. Email moved to DLQ: status='dlq'
4. Admin can see it in `SELECT * FROM email_dlq`
5. Admin investigates issue + calls retryDLQEmail(id)
6. Email moved back to 'pending' for reprocessing
```

### Example 4: Non-Retryable Failure

```
1. Email queued with invalid recipient
2. Brevo rejects with 400 (invalid email) → not retryable
3. Email moved directly to DLQ: status='dlq'
4. No automatic retries wasted
5. Admin sees error reason in error_message field
```

## Usage

### Queueing an Email

```typescript
import { queueEmail } from '@/lib/email/email-queue-service';

// Queue an email
const queueId = await queueEmail(
  'student@example.com',
  'course-completed',
  {
    firstName: 'John',
    courseName: 'AI for Business',
    completionDate: '2026-08-23',
  },
  'Course Completed - DailyAgile',
  '<h1>You completed the course!</h1>',
  'You completed the course!',
);

console.log(`Email queued: ${queueId}`);
```

### Processing the Queue (from Edge Function)

```typescript
import { processEmailQueue } from '@/lib/email/email-queue-service';
import { BrevoEmailProvider } from '@/lib/email/providers/brevo-provider';

const provider = new BrevoEmailProvider({
  apiKey: process.env.BREVO_API_KEY!,
  senderEmail: 'support@dailyagile.com',
  senderName: 'DailyAgile',
});

const stats = await processEmailQueue(provider, 10); // Process 10 at a time

console.log(`Sent: ${stats.sent}, Failed: ${stats.failed}, DLQ: ${stats.dlq}`);
```

### Monitoring Queue Health

```typescript
import { getQueueStats } from '@/lib/email/email-queue-service';

const stats = await getQueueStats();

console.log(`
  Pending: ${stats.pending}
  Processing: ${stats.processing}
  Sent: ${stats.sent}
  Failed: ${stats.failed}
  DLQ: ${stats.dlq}
  Oldest pending: ${stats.oldestPendingAge}
`);
```

### Safe Template Rendering

```typescript
import { renderTemplate, escapeHtml } from '@/lib/email/template-renderer';

// Malicious input is automatically escaped
const html = renderTemplate(
  '<h1>Hello {{name}}</h1>',
  { name: '<script>alert("xss")</script>' }
);

// Result: <h1>Hello &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</h1>
console.log(html); // Safe!
```

## Security

### XSS Prevention

All user-provided data is HTML-escaped before insertion into templates:

```typescript
// In template-renderer.ts
function escapeHtml(text: string): string {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}
```

This means:
- Courseids like `<img src=x onerror=alert(1)>` are rendered as literal text
- No code execution possible
- User sees exactly what was intended

### Email Header Security

Every email includes GDPR/CAN-SPAM compliant headers:

```
List-Unsubscribe: <https://dailyagile.com/unsubscribe?email=student@example.com>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Major email clients (Gmail, Outlook, Apple Mail) show an "Unsubscribe" button based on these headers.

### Race Condition Prevention

The queue status field prevents concurrent sends:

```
1. Email starts as 'pending'
2. Worker marks it 'processing' immediately
3. Other workers skip it (only process 'pending' emails)
4. Send succeeds → mark 'sent'
5. If worker dies → next run finds 'processing' emails older than 30 min, retries them
```

## Testing

### Test 1: Happy Path

```bash
# Queue an email
curl -X POST http://localhost:3000/api/test/queue-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>"
  }'

# Check queue
SELECT * FROM email_queue WHERE status = 'pending';

# Manually trigger worker (or wait 5 minutes)
curl -X POST https://<project>.functions.supabase.co/process-email-queue \
  -H "Authorization: Bearer FUNCTION_SECRET"

# Check result
SELECT * FROM email_queue WHERE recipient_email = 'test@example.com';
```

### Test 2: XSS Prevention

```typescript
// In your test:
const html = renderTemplate(
  '<h1>Course: {{courseId}}</h1>',
  { courseId: '<script>alert("xss")</script>' }
);

expect(html).toContain('&lt;script&gt;');
expect(html).not.toContain('<script>');
```

### Test 3: Retry Logic

```typescript
// Mock Brevo to fail on first attempt, succeed on second
let callCount = 0;
jest.mock('fetch', () => {
  return async () => {
    if (callCount++ === 0) {
      return { ok: false, status: 503 };
    }
    return { ok: true, json: () => ({ messageId: 'msg-123' }) };
  };
});

// Queue and process
await queueEmail('test@example.com', ...);
const result1 = await processEmailQueue(provider, 10);
expect(result1.failed).toBe(1); // First attempt failed

// Process again 5 minutes later
const result2 = await processEmailQueue(provider, 10);
expect(result2.sent).toBe(1); // Second attempt succeeded
```

## Deployment

### 1. Run Migration

```bash
cd openMAIC
supabase db push # Applies 030_email_queue_system.sql
```

This creates the `email_queue` table with proper indexes and RLS policies.

### 2. Deploy Edge Function

```bash
supabase functions deploy process-email-queue --no-verify-jwt
```

### 3. Set up Cron Job

In Supabase Dashboard:

1. Go to **SQL Editor**
2. Create a new query:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to process emails every 5 minutes
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT net.http_post(
    url:=''https://YOUR_PROJECT.functions.supabase.co/process-email-queue'',
    headers:=jsonb_build_object(''Authorization'', ''Bearer YOUR_FUNCTION_SECRET''),
    body:=jsonb_build_object()
  ) as request_id;'
);
```

### 4. Set Environment Variables

In Vercel/Deployment:

```bash
BREVO_API_KEY=xxxx
STRIPE_SECRET_KEY=xxxx
STRIPE_WEBHOOK_SECRET=xxxx
```

## Monitoring

### Dashboard Query

```sql
-- Email queue status
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM email_queue
GROUP BY status
ORDER BY status;
```

### Alert on High DLQ

```sql
-- Alert if more than 10 emails in DLQ
SELECT COUNT(*) as dlq_count
FROM email_queue
WHERE status = 'dlq'
  AND created_at > NOW() - interval '1 hour';
```

### Check for Stuck Processing

```sql
-- Emails stuck in 'processing' for > 30 minutes
SELECT id, recipient_email, created_at
FROM email_queue
WHERE status = 'processing'
  AND created_at < NOW() - interval '30 minutes';
```

## Troubleshooting

### Emails Not Sending

1. Check BREVO_API_KEY is set: `echo $BREVO_API_KEY`
2. Check queue has pending emails: `SELECT COUNT(*) FROM email_queue WHERE status = 'pending'`
3. Check Edge Function is deployed: `supabase functions list`
4. Check cron job is running: `SELECT * FROM cron.job;`
5. Check function logs: `supabase functions logs process-email-queue`

### Emails Stuck in Processing

```sql
-- Mark stuck emails as failed for retry
UPDATE email_queue
SET status = 'failed', retry_count = 0
WHERE status = 'processing'
  AND created_at < NOW() - interval '1 hour';
```

### Too Many DLQ Emails

```sql
-- Review DLQ
SELECT id, recipient_email, error_message, retry_count, created_at
FROM email_queue
WHERE status = 'dlq'
ORDER BY created_at DESC
LIMIT 20;

-- Retry specific DLQ email
UPDATE email_queue
SET status = 'pending', retry_count = 0, error_message = NULL
WHERE id = 'email-id-here';
```

## Performance

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Queue email | O(1) | Single Supabase insert |
| Process batch | O(n) | n = batch size (default 10) |
| Send via Brevo | O(1) | External HTTP call |
| Get stats | O(1) | Aggregate query |
| Retry DLQ | O(1) | Single update |

### Throughput

- **Queue Rate**: ~100 emails/second (Supabase limit)
- **Send Rate**: ~10 emails per cron run (configurable)
- **Max Latency**: ~5 minutes (cron interval) + Brevo send time (~0.5s)

## Future Improvements

- [ ] Multiple provider support (SendGrid, AWS SES)
- [ ] Template preview API for testing
- [ ] Webhook for delivery status (Brevo events)
- [ ] A/B testing framework for subject lines
- [ ] Recipient preference center (email frequency)
- [ ] Analytics dashboard (open rates, click rates)

---

**Last Updated**: 2026-08-23
**Version**: 1.0 - Production Ready
