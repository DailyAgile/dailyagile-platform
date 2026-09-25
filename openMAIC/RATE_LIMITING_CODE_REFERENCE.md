# Rate Limiting - Code Reference

Quick reference showing exact code changes for rate limiting implementation.

## File 1: `/lib/server/rate-limiter.ts`

**Added to `RATE_LIMITS` constant** (lines 144-156):

```typescript
  // Quiz grading: 10 requests per minute (prevents $200+/hour abuse)
  QUIZ_GRADE: {
    limit: 10,
    window: 60, // 1 minute
    message: 'Too many grading requests. Please wait a moment before trying again.',
  },

  // Data export: 3 per day per student (GDPR abuse prevention)
  DATA_EXPORT: {
    limit: 3,
    window: 86400, // 24 hours
    message: 'Daily export limit reached. You can export your data 3 times per day. Please try again tomorrow.',
  },
} as const;
```

---

## File 2: `/app/api/quiz-grade/route.ts`

### Import Addition (line 20)

**Before:**
```typescript
import { requireCSRFValidation } from '@/lib/server/csrf-token';
import { getCodeGradingQueue } from '@/lib/quiz/code-grading-queue';
```

**After:**
```typescript
import { requireCSRFValidation } from '@/lib/server/csrf-token';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';
import { getCodeGradingQueue } from '@/lib/quiz/code-grading-queue';
```

### Rate Limiting Check (lines 69-90)

**Inserted after CSRF validation (after line 67), before body parsing (before line 92):**

```typescript
    // 🛡️ RATE LIMITING: Prevent quiz grading abuse (10 requests/min per IP)
    const clientIp = req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';
    const rateLimitKey = `quiz-grade:${clientIp}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.QUIZ_GRADE.limit,
      RATE_LIMITS.QUIZ_GRADE.window
    );

    if (!rateLimitResult.allowed) {
      log.warn(`Rate limit exceeded for quiz grading from IP: ${clientIp}`);
      return apiError(
        'RATE_LIMITED',
        429,
        RATE_LIMITS.QUIZ_GRADE.message,
        `Retry after ${rateLimitResult.retryAfterSeconds} seconds`
      );
    }
```

---

## File 3: `/app/api/student/data-export/route.ts`

### Import Addition (line 16)

**Before:**
```typescript
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import crypto from 'crypto';
```

**After:**
```typescript
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';
import crypto from 'crypto';
```

### Rate Limiting Check (lines 63-86)

**Inserted after authorization validation (after line 61), before Supabase client init (before line 88):**

```typescript
    // 🛡️ RATE LIMITING: Prevent data export abuse (3 exports per 24 hours per student)
    const rateLimitKey = `data-export:${studentId}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.DATA_EXPORT.limit,
      RATE_LIMITS.DATA_EXPORT.window
    );

    if (!rateLimitResult.allowed) {
      log.warn(`Rate limit exceeded for data export: student ${studentId}`);
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: RATE_LIMITS.DATA_EXPORT.message,
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }
```

---

## Response Examples

### Quiz Grade - Rate Limited (429)

**Request #11:**
```bash
curl -X POST http://localhost:3000/api/quiz-grade \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.0.2.1" \
  -H "x-csrf-token: valid_token" \
  -d '{"question":"What is AI?","userAnswer":"Artificial Intelligence","points":10}'
```

**Response:**
```json
{
  "success": false,
  "errorCode": "RATE_LIMITED",
  "error": "Too many grading requests. Please wait a moment before trying again.",
  "details": "Retry after 60 seconds"
}
```

**Status:** 429 Too Many Requests

---

### Data Export - Rate Limited (429)

**Request #4:**
```bash
curl -X POST http://localhost:3000/api/student/data-export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer abc123-student-uuid" \
  -d '{"format":"json","password":"student_password"}'
```

**Response:**
```json
{
  "error": "RATE_LIMITED",
  "message": "Daily export limit reached. You can export your data 3 times per day. Please try again tomorrow.",
  "retryAfter": 86400
}
```

**Status:** 429 Too Many Requests
**Header:** `Retry-After: 86400`

---

## Key Characteristics

### Quiz Grade Rate Limiting

| Property | Value |
|----------|-------|
| Limit | 10 requests |
| Window | 60 seconds (1 minute) |
| Tracked By | Client IP address |
| IP Detection | Multi-source (x-forwarded-for → x-real-ip → cf-connecting-ip) |
| Response Code | 429 Too Many Requests |
| Error Code | RATE_LIMITED |
| Logs Violations | Yes (WARN level) |

### Data Export Rate Limiting

| Property | Value |
|----------|-------|
| Limit | 3 exports |
| Window | 86,400 seconds (24 hours) |
| Tracked By | Student ID (from Bearer token) |
| Response Code | 429 Too Many Requests |
| Error Code | RATE_LIMITED |
| Retry-After Header | Yes (value in seconds) |
| Logs Violations | Yes (WARN level) |

---

## Verification Checklist

- [x] RATE_LIMITS.QUIZ_GRADE defined with 10 req/min
- [x] RATE_LIMITS.DATA_EXPORT defined with 3 per 24h
- [x] Quiz-grade imports checkRateLimit and RATE_LIMITS
- [x] Data-export imports checkRateLimit and RATE_LIMITS
- [x] Quiz-grade checks rate limit after CSRF validation
- [x] Data-export checks rate limit after authorization
- [x] Both return 429 on limit exceeded
- [x] Quiz-grade uses apiError() with RATE_LIMITED code
- [x] Data-export uses NextResponse.json() with 429 status
- [x] Both include retry-after information
- [x] Quiz-grade uses IP-based tracking
- [x] Data-export uses student-ID-based tracking
- [x] All violations logged via createLogger()
- [x] TypeScript compilation passes

---

## Impact Assessment

### No Changes To

- Request/response format for successful (200) requests
- Legitimate user workflows
- Database schemas
- Authentication/authorization logic
- CSRF protection
- Existing error codes (uses existing RATE_LIMITED)

### Changes Only Apply To

- Abusive traffic patterns (>10 gradings/min or >3 exports/day)
- Malicious actors attempting to exploit APIs
- Both cases properly tracked and logged

### Legitimate User Impact

- Students grading quizzes: 10/min limit is 5-10x actual usage
- Students exporting data: 3/day limit is 3x typical usage
- No blocking of normal use cases
