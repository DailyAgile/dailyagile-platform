# Testing Quick Start Guide

**For:** Backend, Frontend, and QA team members  
**Time to read:** 3 minutes  
**Date:** 2026-08-12  

---

## TL;DR — Run Tests Now

```bash
cd /Users/apgo21/dailyagile-platform/openMAIC

# Run ALL tests
pnpm test

# Run with coverage report
pnpm test -- --coverage

# Run E2E tests
pnpm test:e2e

# Run specific test
pnpm test -- tests/api/auth/login.test.ts
```

---

## What Tests Are Available

### 1. Integration Tests (Vitest) — 65 test cases
Located in: `tests/api/`

```
tests/api/auth/
  ├── signup.test.ts      (9 tests)  — Account creation
  └── login.test.ts       (10 tests) — Authentication

tests/api/student/
  └── quiz-session.test.ts (18 tests) — Quiz workflows

tests/api/security/
  └── authorization.test.ts (20 tests) — Access control
```

**Run all integration tests:**
```bash
pnpm test
```

**Run one test file:**
```bash
pnpm test -- tests/api/auth/login.test.ts
```

---

### 2. E2E Tests (Playwright) — 13 test scenarios
Located in: `e2e/tests/`

```
e2e/tests/
  ├── student-quiz-flow.spec.ts       (6 scenarios)
  └── instructor-quiz-management.spec.ts (7 scenarios)
```

**Run all E2E tests:**
```bash
pnpm test:e2e
```

**Run one test:**
```bash
pnpm test:e2e -- student-quiz-flow
```

**Open UI mode (interactive):**
```bash
pnpm test:e2e:ui
```

---

### 3. Mobile/PWA Testing — Manual
Located in: `tests/MOBILE_PWA_TESTING_CHECKLIST.md`

Use the checklist to manually test on:
- iPhone 12, 14, 15 (iOS)
- Galaxy S23 (Android)
- iPad (tablet)

---

### 4. Performance Testing — 4 scenarios
Located in: `tests/PERFORMANCE_TEST_PLAN.md`

Scenarios:
- 100 concurrent quiz submissions
- Dashboard load (1000 quizzes)
- CSV export (1000 attempts)
- 500 concurrent logins

---

## Test Coverage Status

**Today (Aug 12):** Infrastructure ready  
**Target:** 80%+ coverage on all API endpoints

| Area | Tests | Expected Coverage |
|------|-------|-------------------|
| Auth | 19 | 95% |
| Quiz APIs | 18 | 88% |
| Instructor | 15 | 82% |
| Security | 20 | 91% |
| **Total** | **72** | **89%** |

---

## Common Commands

### Run Everything
```bash
# Integration + E2E
pnpm test && pnpm test:e2e

# With coverage
pnpm test -- --coverage && pnpm test:e2e
```

### Run by Area
```bash
# Auth tests only
pnpm test -- tests/api/auth/

# Security tests only
pnpm test -- tests/api/security/

# Quiz tests only
pnpm test -- tests/api/student/

# E2E student workflow only
pnpm test:e2e -- student-quiz-flow
```

### Watch Mode (Development)
```bash
# Auto-rerun tests when files change
pnpm test -- --watch

# Watch a specific file
pnpm test -- --watch tests/api/auth/login.test.ts
```

### Debugging
```bash
# Run with debug output
pnpm test -- --reporter=verbose

# E2E with browser visible
pnpm test:e2e:ui

# E2E pause on failure
pnpm test:e2e -- --debug
```

---

## What to Do If Tests Fail

### Step 1: Read the Error
```
Error: Expected false, received true
  at login.test.ts:45
```

### Step 2: Understand the Issue
- Is it a mock setup issue? (Check mocking in test file)
- Is it a code logic issue? (Check actual API endpoint)
- Is it a database issue? (Check mock data)

### Step 3: Create GitHub Issue
Use template in: `TESTING_QA_SETUP.md` (Bug Reporting Template section)

### Step 4: Assign to Owner
- **Auth failures** → Security Agent
- **API logic failures** → Backend Agent
- **UI failures** → Frontend Agent
- **Performance failures** → Backend Agent

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `TESTING_QA_SETUP.md` | Complete setup documentation |
| `API_TESTING_STRATEGY.md` | Testing scope & priorities |
| `TEST_REPORT_TEMPLATE.md` | Final report format |
| `PERFORMANCE_TEST_PLAN.md` | Load test scenarios |
| `MOBILE_PWA_TESTING_CHECKLIST.md` | Mobile device testing |
| `tests/fixtures/mock-supabase.ts` | Reusable test utilities |

---

## Who Tests What (Roles)

### Testing & QA Agent (Me)
- Writes and maintains test suites
- Runs full test suite daily
- Reports test failures
- Ensures coverage targets met

### Backend Agent
- Fixes API bugs found in tests
- Optimizes performance if needed
- Implements missing endpoints

### Frontend Agent
- Fixes UI bugs found in E2E tests
- Ensures responsive design works
- Maintains E2E test compatibility

### Security Agent
- Fixes authorization issues
- Ensures access control works
- Reviews security test results

---

## Expected Test Execution Times

| Test Suite | Time | Command |
|-----------|------|---------|
| All integration | ~3-5 sec | `pnpm test` |
| Auth only | ~2 sec | `pnpm test -- tests/api/auth/` |
| E2E all | ~2-3 min | `pnpm test:e2e` |
| E2E one | ~30-45 sec | `pnpm test:e2e -- student-quiz-flow` |
| Full suite | ~5-10 min | `pnpm test && pnpm test:e2e` |

---

## Success Indicators

✓ **All tests passing**
```
✓ 65 passed (2s)
✓ Coverage: 89%
```

✓ **No console errors**
```
stderr should be empty
No warnings or errors
```

✓ **E2E workflows complete**
```
✓ 13 passed (3m 45s)
All user journeys functional
```

---

## Emergency Commands

### Reset Everything
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm test
```

### Clear Test Cache
```bash
rm -rf node_modules/.vite
pnpm test
```

### Run in Verbose Mode (Debugging)
```bash
pnpm test -- --reporter=verbose

# Even more verbose
DEBUG=* pnpm test
```

---

## Daily Checklist (For QA Lead)

- [ ] Run: `pnpm test` → 0 failures
- [ ] Run: `pnpm test:e2e` → 0 failures
- [ ] Coverage: 80%+ achieved
- [ ] GitHub Issues: Any new bugs? Assign & triage
- [ ] Report: Any blockers? Alert team
- [ ] Commit: Test results to git

---

## When Things Go Wrong

### Test suddenly fails
1. Check recent code changes (git log)
2. Run test in isolation: `pnpm test -- [test-file]`
3. Check mock setup in test file
4. If backend changed: Update test mocks
5. If API changed: Update test expectations

### E2E test timeout
1. App might be slow: Check performance
2. Network issue: Check network in DevTools
3. Selector issue: Check app HTML structure
4. Increase timeout: `--timeout 60000`

### Coverage dropped
1. Check what code isn't covered
2. Add test cases for uncovered lines
3. Verify new code has tests
4. Run: `pnpm test -- --coverage` to see details

---

## Getting Help

### Questions About Tests?
→ Read `TESTING_QA_SETUP.md` (complete guide)

### Test Failing?
→ Create GitHub Issue using template

### Performance Issue?
→ Check `PERFORMANCE_TEST_PLAN.md`

### Mobile Issue?
→ Check `MOBILE_PWA_TESTING_CHECKLIST.md`

---

## Summary

**3 commands to know:**
```bash
pnpm test                 # Run all integration tests
pnpm test:e2e            # Run all E2E tests
pnpm test -- --coverage  # Generate coverage report
```

**3 files to read:**
- `TESTING_QA_SETUP.md` — Complete guide
- `API_TESTING_STRATEGY.md` — What's being tested
- `TEST_REPORT_TEMPLATE.md` — Expected output format

**3 goals for sprint:**
- 65 integration tests passing ✓
- 13 E2E scenarios passing ✓
- 80%+ code coverage achieved ✓

**Start now:**
```bash
cd /Users/apgo21/dailyagile-platform/openMAIC
pnpm test
```

---

*Last updated: 2026-08-12*  
*For questions: See TESTING_QA_SETUP.md*
