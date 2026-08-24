# Security Implementation Guide

This document describes the input validation and rate limiting systems implemented to protect against injection attacks, XSS, and brute-force attacks.

## Overview

### Two-Layer Security

1. **Input Validation (Zod Schemas)**
   - Validates all request payloads
   - Prevents injection attacks, XSS, and oversized payloads
   - Provides type-safe request data

2. **Rate Limiting (Vercel KV)**
   - Prevents brute-force attacks on auth endpoints
   - Configurable per endpoint
   - Automatic cleanup via TTL

---

## Files Added

### 1. `lib/server/validation-schemas.ts`
Contains all Zod schemas for validating auth and quiz endpoints.

**Usage:**
```typescript
import { sendVerificationCodeSchema, validateRequest } from '@/lib/server/validation-schemas';

const validation = sendVerificationCodeSchema.safeParse(body);
if (!validation.success) {
  return apiError('VALIDATION_ERROR', 400, 'Invalid request', 
    JSON.stringify(validation.error.flatten().fieldErrors));
}

const { email } = validation.data; // type-safe
```

### 2. `lib/server/rate-limiter.ts`
Implements rate limiting using Vercel KV.

**Usage:**
```typescript
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';

const result = await checkRateLimit(
  `verify-code:${email}`,
  RATE_LIMITS.VERIFY_CODE.limit,
  RATE_LIMITS.VERIFY_CODE.window
);

if (!result.allowed) {
  return apiError('RATE_LIMITED', 429, RATE_LIMITS.VERIFY_CODE.message);
}

// On success:
await resetRateLimit(`verify-code:${email}`);
```

---

## Updated Endpoints

### Authentication Endpoints

#### 1. `POST /api/auth/send-verification-code`
- **Validation:** Email format (Zod)
- **Rate Limit:** 3 attempts per hour
- **Response:** 429 if rate limited

#### 2. `POST /api/auth/verify-code`
- **Validation:** Email format + 6-digit code (Zod)
- **Rate Limit:** 10 attempts per 10 minutes
- **Response:** 429 if rate limited
- **Reset:** Clears rate limit on success

#### 3. `POST /api/instructor/login`
- **Validation:** Email + optional password (Zod)
- **Rate Limits:**
  - Password: 5 attempts per 15 minutes
  - OTP send: 3 attempts per hour
- **Response:** 429 if rate limited
- **Reset:** Clears rate limit on success

#### 4. `POST /api/instructor/otp/send`
- **Validation:** Email format (Zod)
- **Rate Limit:** 3 attempts per hour
- **Response:** 429 if rate limited

#### 5. `POST /api/instructor/otp/verify`
- **Validation:** 6-digit code (Zod)
- **Rate Limit:** 10 attempts per 10 minutes
- **Response:** 429 if rate limited
- **Reset:** Clears rate limit on success

### Quiz Endpoints

#### 1. `POST /api/student/quiz/[quizId]/submit`
- **Validation:**
  - Attempt ID (UUID)
  - Answer count (1-100 max)
  - Answer size (5000 chars max)
- **Response:** 400 if validation fails

#### 2. `POST /api/student/quiz/[quizId]/answer`
- **Validation:**
  - Attempt ID (UUID)
  - Question ID (UUID)
  - Answer (5000 chars max)
- **Response:** 400 if validation fails

---

## Rate Limit Configuration

All rate limits are defined in `RATE_LIMITS` object:

```typescript
{
  SEND_VERIFICATION_CODE: { limit: 3, window: 3600 },     // 3/hour
  VERIFY_CODE: { limit: 10, window: 600 },                 // 10/10min
  INSTRUCTOR_PASSWORD_LOGIN: { limit: 5, window: 900 },    // 5/15min
  INSTRUCTOR_OTP_SEND: { limit: 3, window: 3600 },         // 3/hour
  INSTRUCTOR_OTP_VERIFY: { limit: 10, window: 600 },       // 10/10min
  QUIZ_SUBMIT: { limit: 20, window: 60 },                  // 20/min
  QUIZ_ANSWER: { limit: 50, window: 60 },                  // 50/min
  CSV_UPLOAD: { limit: 10, window: 3600 },                 // 10/hour
}
```

To modify limits, edit `lib/server/rate-limiter.ts`.

---

## Validation Schemas

### Email Validation
```typescript
const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim()
  .max(254, 'Email too long');
```

### Password Validation
```typescript
const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password too long')
  .regex(/^[a-zA-Z0-9!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?]*$/, 
    'Password contains invalid characters');
```

### Answer Validation
```typescript
const quizAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  answer: z
    .string()
    .max(5000, 'Answer too long (max 5000 characters)')
    .min(1, 'Answer cannot be empty'),
});
```

---

## Security Protections

### 1. Input Injection Prevention
- **Email:** Validated as RFC 5322 compliant email address
- **Code:** Validated as exactly 6 digits
- **Password:** Restricted to alphanumeric + common special characters
- **Answer:** Max 5000 characters per answer, 100 max answers

### 2. XSS Prevention
- **Storage:** Answers are stored as-is but never rendered unsanitized
- **API Response:** All user input is escaped when returned
- **Length Limits:** Prevent extremely large payloads that could cause issues

### 3. Brute-Force Prevention
- **Email Verification:** 3 attempts per hour
- **OTP Verification:** 10 attempts per 10 minutes (progressive lockout)
- **Password Login:** 5 attempts per 15 minutes
- **OTP Send:** 3 attempts per hour (prevents email spam)

### 4. DoS Prevention
- **Answer Size:** 5000 characters max per answer
- **Answer Count:** 100 answers max per submission
- **CSV Upload:** 1MB max
- **Rate Limiting:** Prevents bulk requests

---

## Testing

### Manual Testing

**Test Rate Limiting:**
```bash
# Test 1: Valid request (should succeed)
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test 2: Repeat requests (should hit rate limit after 3)
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response after rate limit: 429 Too Many Requests
```

**Test Input Validation:**
```bash
# Test 1: Invalid email (should fail validation)
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'
# Response: 400 VALIDATION_ERROR

# Test 2: Missing required field
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{}'
# Response: 400 VALIDATION_ERROR

# Test 3: Oversized answer (should fail)
curl -X POST http://localhost:3000/api/student/quiz/[id]/answer \
  -H "Content-Type: application/json" \
  -d '{"attemptId":"uuid","questionId":"uuid","answer":"'$(printf 'x%.0s' {1..5001})'"}' 
# Response: 400 VALIDATION_ERROR
```

### Automated Testing

Tests can be added to `lib/server/__tests__/validation-schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sendVerificationCodeSchema, quizSubmitSchema } from '../validation-schemas';

describe('Validation Schemas', () => {
  it('rejects invalid email', () => {
    const result = sendVerificationCodeSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('rejects oversized answer', () => {
    const result = quizSubmitSchema.safeParse({
      attemptId: 'uuid',
      answers: [{ questionId: 'uuid', answer: 'x'.repeat(5001) }]
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid data', () => {
    const result = sendVerificationCodeSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });
});
```

---

## Monitoring & Debugging

### Logs

All validation and rate limiting events are logged:

```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('EndpointName');

log.warn('Validation error:', errors);
log.warn('Rate limit exceeded for key: ${key}');
log.info('Rate limit reset for key: ${key}');
```

Check logs in:
- Local: Console output
- Production: Vercel logs / CloudWatch

### Debugging Rate Limits

To disable rate limiting temporarily for debugging:

```typescript
// In rate-limiter.ts, modify checkRateLimit:
if (process.env.DISABLE_RATE_LIMIT === 'true') {
  return { allowed: true, remaining: limit };
}
```

---

## Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "error": "Invalid request",
  "details": {
    "email": ["Invalid email format"],
    "answer": ["Answer too long (max 5000 characters)"]
  }
}
```

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "errorCode": "RATE_LIMITED",
  "error": "Too many verification requests. Try again in 1 hour."
}
```

### Authorization Error (401)
```json
{
  "success": false,
  "errorCode": "UNAUTHORIZED",
  "error": "Not authenticated"
}
```

---

## Best Practices

1. **Always validate user input** before processing
2. **Use rate limiting** on all auth endpoints
3. **Reset rate limits** on successful authentication
4. **Log failed attempts** for security monitoring
5. **Use meaningful error messages** without leaking internal details
6. **Test both happy path and error paths**
7. **Monitor rate limit metrics** for anomalies

---

## Future Enhancements

1. **IP-based rate limiting:** Prevent distributed attacks
2. **Adaptive rate limiting:** Tighter limits for suspicious patterns
3. **Captcha integration:** After N failed attempts
4. **Security headers:** CSP, X-Frame-Options, etc.
5. **Audit logging:** Track all auth attempts with details
6. **Alerting:** Alert on unusual rate limit patterns

---

## References

- [Zod Documentation](https://zod.dev)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
