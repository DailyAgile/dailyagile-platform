# Security Fix Validation — Day 6 Verification

**Timeline:** Day 6 (after Backend Agent completes 8 security fixes)  
**Duration:** ~2 hours for full validation  
**Pass Criteria:** All 8 fixes verified working, 100% pass rate

---

## The 8 Critical Security Fixes

### 1️⃣ Quiz Answer Leakage Fix
**Vulnerability:** Student can view other students' answers before quiz ends

**Validation Test:**
```bash
pnpm test -- tests/api/security/answer-leakage.test.ts
```

**What we'll check:**
- [ ] Student A cannot fetch Student B's answer
- [ ] Answers hidden until quiz closes
- [ ] API returns 403 if trying to access others' answers
- [ ] Progress tracking shows only own answers

**Expected result:** ✅ All 4 checks pass


### 2️⃣ Submission Spoofing Fix
**Vulnerability:** Student can submit quiz as another student (change student_id in request)

**Validation Test:**
```bash
pnpm test -- tests/api/security/submission-spoofing.test.ts
```

**What we'll check:**
- [ ] JWT token validates student_id matches request
- [ ] Submission from Student A registers to Student A (not Student B)
- [ ] Attempt to submit with different student_id returns 401
- [ ] Audit log shows correct student

**Expected result:** ✅ All 4 checks pass


### 3️⃣ Password Hashing Fix
**Vulnerability:** Passwords stored in plaintext or weak hash (SHA-256 without salt)

**Validation Test:**
```bash
pnpm test -- tests/api/security/password-hash.test.ts
```

**What we'll check:**
- [ ] Passwords stored with strong hash (bcrypt or argon2)
- [ ] Salt is random per password
- [ ] Plaintext password never logged
- [ ] Old SHA-256 hashes migrated to strong algo

**Expected result:** ✅ All 4 checks pass


### 4️⃣ Verification Code Fix
**Vulnerability:** Verification code is predictable or reusable (stays valid forever)

**Validation Test:**
```bash
pnpm test -- tests/api/security/verification-code.test.ts
```

**What we'll check:**
- [ ] Verification code expires (10 min timeout)
- [ ] Code is cryptographically random (not sequential)
- [ ] Used code cannot be reused
- [ ] Expired codes rejected with clear message

**Expected result:** ✅ All 4 checks pass


### 5️⃣ JWT Fix
**Vulnerability:** JWT not validated on every request OR token never expires

**Validation Test:**
```bash
pnpm test -- tests/api/security/jwt-validation.test.ts
```

**What we'll check:**
- [ ] Invalid JWT returns 401 on all endpoints
- [ ] Expired JWT returns 401 (refresh needed)
- [ ] JWT signature verified (tampered token rejected)
- [ ] Token expiry is 7 days (not infinite)

**Expected result:** ✅ All 4 checks pass


### 6️⃣ Rate Limiting Fix
**Vulnerability:** No rate limit on login attempts (brute force attack possible)

**Validation Test:**
```bash
pnpm test -- tests/api/security/rate-limiting.test.ts
```

**What we'll check:**
- [ ] 5 failed login attempts → temporary lockout
- [ ] Lockout duration: 15 minutes
- [ ] Lockout message clear to user
- [ ] Rate limit headers present in response

**Expected result:** ✅ All 4 checks pass


### 7️⃣ Auth Check Fix
**Vulnerability:** Some endpoints not checking if user is authenticated

**Validation Test:**
```bash
pnpm test -- tests/api/security/auth-required.test.ts
```

**What we'll check:**
- [ ] All quiz endpoints require JWT token
- [ ] All student endpoints require JWT token
- [ ] All instructor endpoints require JWT token
- [ ] Unauthenticated request returns 401

**Expected result:** ✅ All 4 checks pass


### 8️⃣ Account Lockout Fix
**Vulnerability:** No account lockout after suspicious activity

**Validation Test:**
```bash
pnpm test -- tests/api/security/account-lockout.test.ts
```

**What we'll check:**
- [ ] 10 failed login attempts → account locked
- [ ] Locked account cannot login
- [ ] Admin can unlock account
- [ ] Lockout notification sent to email

**Expected result:** ✅ All 4 checks pass

---

## Day 6 Readiness Checklist

Before running security validation:

- [ ] **Backend Agent:** All 8 security fixes implemented
- [ ] **Database Agent:** Migrations applied (password hash migration if needed)
- [ ] **Staging DB:** Ready with test data
  - [ ] Test student account: `test@example.com` / `SecurePass123`
  - [ ] Test instructor account: `instructor@example.com` / `SecurePass123`
- [ ] **Feature Flags:** Security fixes enabled
- [ ] **Environment:** `.env.local` configured for staging DB

---

## Validation Execution (Day 6 Timeline)

**09:00 - Setup** (15 min)
- [ ] Verify staging DB ready
- [ ] Confirm all 8 fixes merged to main
- [ ] Pull latest code

**09:15 - Run Fix 1-3** (30 min)
```bash
pnpm test -- tests/api/security/answer-leakage.test.ts
pnpm test -- tests/api/security/submission-spoofing.test.ts
pnpm test -- tests/api/security/password-hash.test.ts
```
- Report pass/fail
- File issues if failed

**09:45 - Run Fix 4-6** (30 min)
```bash
pnpm test -- tests/api/security/verification-code.test.ts
pnpm test -- tests/api/security/jwt-validation.test.ts
pnpm test -- tests/api/security/rate-limiting.test.ts
```
- Report pass/fail
- File issues if failed

**10:15 - Run Fix 7-8** (20 min)
```bash
pnpm test -- tests/api/security/auth-required.test.ts
pnpm test -- tests/api/security/account-lockout.test.ts
```
- Report pass/fail
- File issues if failed

**10:35 - Summary** (10 min)
- [ ] All 8 fixes validated
- [ ] 0 failing tests
- [ ] Ready for TIER 1-6 launch
- [ ] Green light for full testing

---

## Failure Escalation

If any security fix validation FAILS:

1. **Immediate:** Alert Backend Agent
2. **Root cause:** Review fix implementation
3. **Revalidate:** Run test again after fix
4. **Escalate:** If not fixed by 11:00 AM, block Day 6+ testing

```bash
# Quick re-test command
pnpm test -- tests/api/security/ 2>&1 | grep -E "FAIL|PASS|Error"
```

---

## Success Path (Expected)

All 8 fixes pass validation → **GREEN LIGHT** → Launch TIER 1-6 testing immediately

```
10:35 - All security fixes validated ✅
10:36 - Launch TIER 1 auth tests
10:40 - Launch TIER 2 E2E tests
10:45 - Daily standup: Full testing operational
```

---

## Sign-Off

Security validation complete: **_____ (Date/Time)**  
Validator: Testing & QA Agent  
Result: ✅ GO / ❌ NO-GO

---

*Prepared by: Testing & QA Agent*  
*Date: 2026-08-12*  
*Status: Ready for Day 6 execution*
