# API Testing Strategy — DailyAgile Platform

**Sprint:** 11-15 days (Days 3-12 continuous)  
**Target Coverage:** 80%+ code coverage on all APIs  
**Framework:** Vitest + Playwright

---

## Testing Scope (Prioritized)

### TIER 1 — Critical Paths (Days 3-4)
These paths are customer-facing and must be 100% tested:

#### Auth Endpoints
- `POST /api/auth/student/signup` — Create student account
- `POST /api/auth/student/login` — Authenticate student
- `POST /api/auth/student/verify-email` — Verify email
- `POST /api/auth/student/resend-code` — Resend verification code

Tests needed:
- [x] Valid signup → student created in DB
- [x] Invalid email format → 400 error
- [x] Duplicate email → 400 error
- [x] Login with valid credentials → JWT token issued
- [x] Login with invalid password → 401 error
- [x] Login with unverified email → 401 error
- [x] Email verification flow → email_verified flag set
- [x] Resend code → new code sent

#### Quiz Endpoints (Student)
- `POST /api/student/quiz/start` — Start quiz session
- `POST /api/student/quiz/submit-answer` — Submit answer
- `POST /api/student/quiz/finish` — Finish quiz
- `GET /api/student/quiz/[quizCode]` — Get quiz details

Tests needed:
- [x] Start quiz → session created, timer starts
- [x] Submit answer → stored in DB
- [x] Finish quiz → scoring calculated
- [x] Expired assignment → 403 error
- [x] Invalid quiz code → 404 error
- [x] Student A can't see Student B's session

### TIER 2 — Instructor Workflows (Days 5-6)
Core instructor features:

#### Quiz Creation
- `POST /api/instructor/quiz/create-manual` — Create quiz manually
- `POST /api/instructor/quiz/create-from-csv` — Create from CSV
- `POST /api/instructor/quiz/generate-with-ai` — Generate with AI

Tests needed:
- [x] Valid quiz creation → quiz stored
- [x] Invalid CSV format → validation error
- [x] AI generation → quiz created with questions
- [x] Instructor A can't see/edit Instructor B's quizzes

#### Assignment Management
- `POST /api/instructor/assignment/create` — Create assignment
- `POST /api/instructor/assignment/request-extension` — Handle extension requests
- `GET /api/instructor/assignment/results` — View results

Tests needed:
- [x] Create assignment → assignment_code generated
- [x] Assignment expiry → correct timestamp
- [x] Extension requests → status tracked
- [x] Results visibility → only assigned instructor can see

### TIER 3 — Supporting Features (Days 7-8)
Lower-priority but still tested:

- `GET /api/student/progress` — Progress tracking
- `GET /api/student/profile` — Student profile
- `GET /api/instructor/quiz/list` — List quizzes
- `POST /api/instructor/quiz/export-csv` — Export results

---

## Test Organization

```
tests/api/
├── auth/
│   ├── signup.test.ts        (Auth endpoints)
│   ├── login.test.ts
│   └── verify-email.test.ts
├── student/
│   ├── quiz-session.test.ts  (Start, submit, finish)
│   ├── quiz-lookup.test.ts   (Get quiz details)
│   └── progress.test.ts      (Track progress)
├── instructor/
│   ├── quiz-creation.test.ts (Manual, CSV, AI)
│   ├── quiz-management.test.ts (Update, delete, restore)
│   └── assignments.test.ts   (Create, extend, results)
├── security/
│   ├── authorization.test.ts (Cross-user access control)
│   ├── jwt-validation.test.ts (Token validation)
│   └── data-access.test.ts   (Row-level security)
└── fixtures/
    ├── mock-supabase.ts      (Supabase mock client)
    ├── test-data.ts          (Seed data)
    └── api-helpers.ts        (Request/response utilities)
```

---

## Test Patterns

### Pattern 1: API Route Testing
```typescript
import { POST } from '@/app/api/endpoint/route';
const response = await POST(request);
const data = await response.json();
expect(response.status).toBe(200);
```

### Pattern 2: Database Mocking
```typescript
vi.mock('supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    })
  }))
}));
```

### Pattern 3: Security Testing
```typescript
// Test: Student A cannot see Student B's quiz session
const studentAToken = generateToken('student-a-id');
const response = await GET(request, { 
  headers: { Authorization: `Bearer ${studentAToken}` }
});
expect(response.status).toBe(403); // Forbidden
```

---

## Success Criteria

✓ 80%+ code coverage on `/app/api/**`  
✓ All TIER 1 endpoints have 100% test coverage  
✓ Security tests validate JWT, RBAC, and data isolation  
✓ Tests run in <5 seconds total  
✓ All tests pass before each commit  
✓ Zero flaky tests (100% pass rate on 3 consecutive runs)  

---

## Tools & Dependencies

- **Vitest** — Unit/integration test runner
- **vi.mock()** — Mock Supabase, logger, external APIs
- **Supabase-js** — Real DB connection (staging only)
- **Playwright** — E2E testing

## Running Tests

```bash
# Run all API tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Watch mode during development
pnpm test -- --watch

# Run specific test file
pnpm test -- tests/api/auth/signup.test.ts
```

---

## Bug Tracking

Issues found during testing will be logged as:
- GitHub Issues with `bug` label
- Severity: critical/high/medium/low
- Reproduction steps linked to failing test
- Assigned to: Backend Agent (fix), Frontend Agent (UI), or Security Agent (auth/access control)

---

*Last updated: 2026-08-12*  
*Next: Begin TIER 1 tests (auth endpoints)*
