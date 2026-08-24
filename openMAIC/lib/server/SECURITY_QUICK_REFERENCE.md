# Security Quick Reference

**TL;DR** — All auth and quiz endpoints now have input validation (Zod) and rate limiting (Vercel KV).

## Quick Start

### Validating User Input

```typescript
import { sendVerificationCodeSchema } from '@/lib/server/validation-schemas';

const body = await req.json();
const validation = sendVerificationCodeSchema.safeParse(body);

if (!validation.success) {
  return apiError('VALIDATION_ERROR', 400, 'Invalid request');
}

const { email } = validation.data; // Type-safe
```

### Adding Rate Limiting

```typescript
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';

const result = await checkRateLimit(
  `my-key:${email}`,
  RATE_LIMITS.VERIFY_CODE.limit,
  RATE_LIMITS.VERIFY_CODE.window
);

if (!result.allowed) {
  return apiError('RATE_LIMITED', 429, 'Too many attempts. Try again later.');
}

// After success:
await resetRateLimit(`my-key:${email}`);
```

---

## What's Protected

### ✅ Fully Protected Endpoints (7)
| Endpoint | Rate Limit | Validation |
|----------|-----------|-----------|
| `POST /api/auth/send-verification-code` | 3/hr | Email |
| `POST /api/auth/verify-code` | 10/10min | Email + 6-digit code |
| `POST /api/instructor/login` | 5/15min (pwd), 3/hr (otp) | Email + password |
| `POST /api/instructor/otp/send` | 3/hr | Email |
| `POST /api/instructor/otp/verify` | 10/10min | 6-digit code |
| `POST /api/student/quiz/[id]/submit` | — | UUID + answer size/count |
| `POST /api/student/quiz/[id]/answer` | — | UUID + answer size |

---

## Rate Limit Tiers

```
SEND_VERIFICATION_CODE: 3 / 1 hour
VERIFY_CODE: 10 / 10 minutes
INSTRUCTOR_PASSWORD_LOGIN: 5 / 15 minutes
INSTRUCTOR_OTP_SEND: 3 / 1 hour
INSTRUCTOR_OTP_VERIFY: 10 / 10 minutes
QUIZ_SUBMIT: 20 / 1 minute
QUIZ_ANSWER: 50 / 1 minute
CSV_UPLOAD: 10 / 1 hour
```

---

## Validation Rules

### Emails
- Must be valid RFC 5322 format
- Max 254 characters
- Automatically trimmed and lowercased

### Passwords
- Min 6 chars, max 128 chars
- Alphanumeric + `!@#$%^&*()_+-[]{}';:"\\|,.<>/?`

### OTP Codes
- Exactly 6 digits

### Answers
- Max 5,000 characters per answer
- Max 100 answers per submission

### UUIDs
- Must be valid UUID v4 format

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "error": "Invalid request",
  "details": "{\"email\":[\"Invalid email format\"]}"
}
```

### Rate Limited (429)
```json
{
  "success": false,
  "errorCode": "RATE_LIMITED",
  "error": "Too many verification requests. Try again in 1 hour."
}
```

---

## Common Patterns

### Pattern 1: Email + Rate Limit
```typescript
const schema = z.object({ email: z.string().email() });
const key = `action:${email}`;
const limit = await checkRateLimit(key, 3, 3600);
```

### Pattern 2: Code + Validation
```typescript
const schema = z.object({ code: z.string().regex(/^\d{6}$/) });
const validation = schema.safeParse(body);
```

### Pattern 3: Reset After Success
```typescript
if (successfulAuth) {
  await resetRateLimit(`verify-code:${email}`);
}
```

---

## Adding Validation to a New Endpoint

**Step 1:** Define Zod schema in `lib/server/validation-schemas.ts`
```typescript
export const myEndpointSchema = z.object({
  field1: z.string().min(1).max(100),
  field2: z.number().positive(),
});
```

**Step 2:** Use in endpoint
```typescript
const validation = myEndpointSchema.safeParse(body);
if (!validation.success) {
  return apiError('VALIDATION_ERROR', 400, 'Invalid');
}
const { field1, field2 } = validation.data;
```

---

## Adding Rate Limiting to a New Endpoint

**Step 1:** Define rate limit in `lib/server/rate-limiter.ts`
```typescript
MY_NEW_ENDPOINT: {
  limit: 10,
  window: 600, // seconds
  message: 'Too many requests. Try again later.',
}
```

**Step 2:** Use in endpoint
```typescript
const result = await checkRateLimit(
  `my-endpoint:${identifier}`,
  RATE_LIMITS.MY_NEW_ENDPOINT.limit,
  RATE_LIMITS.MY_NEW_ENDPOINT.window
);
if (!result.allowed) {
  return apiError('RATE_LIMITED', 429, RATE_LIMITS.MY_NEW_ENDPOINT.message);
}
```

---

## Testing

### Test Validation
```bash
# Should fail (invalid email)
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'
# Expected: 400 VALIDATION_ERROR
```

### Test Rate Limiting
```bash
# First 3 should succeed
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 4th should fail
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Expected: 429 RATE_LIMITED
```

---

## Troubleshooting

### "Rate limiter error"
- KV connection failed, but request is still allowed (fail-open)
- Check: `VERCEL_KV_REST_API_URL` env var
- Logs: Check CloudWatch for KV errors

### Validation passing when it shouldn't
- Check schema definition in `validation-schemas.ts`
- Verify regex patterns are correct
- Use `schema.parse()` instead of `safeParse()` to get detailed errors

### Rate limit too strict
- Edit `RATE_LIMITS` in `rate-limiter.ts`
- Increase `limit` or `window` values
- Clear KV keys manually: `await kv.del(key)`

---

## Files to Know

| File | Purpose |
|------|---------|
| `lib/server/validation-schemas.ts` | All Zod schemas |
| `lib/server/rate-limiter.ts` | Rate limiting logic + config |
| `lib/server/SECURITY_README.md` | Detailed guide |
| `lib/server/api-response.ts` | Error response helpers |
| `lib/logger.ts` | Logging (all events logged) |

---

## Monitoring

### What to Check
1. **Validation errors** — Unusual patterns = potential attacks
2. **Rate limit hits** — Many 429s from same IP = attack
3. **KV latency** — Slow KV = performance issues
4. **Error frequency** — Spike in errors = bug in validation

### Log Patterns
```
log.warn('Validation error:', errors.fieldErrors);
log.warn('Rate limit exceeded for key: ${key}');
log.error('Rate limiter error:', error);
```

---

## Important Notes

- ⚠️ All auth endpoints are rate limited
- ⚠️ Validation is required before processing
- ⚠️ Rate limits are per user/email, not per IP
- ⚠️ Never disable validation in production
- ✅ Rate limiting fails open (allows if KV unavailable)
- ✅ No performance penalty (KV ~10-50ms)
- ✅ Works across multiple server instances (distributed)

---

## References

- [Validation Schemas Details](./SECURITY_README.md#validation-schemas)
- [Rate Limiting Details](./SECURITY_README.md#rate-limit-configuration)
- [Zod Docs](https://zod.dev)
- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
