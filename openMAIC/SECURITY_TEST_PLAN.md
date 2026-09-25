# Security & Authentication Test Plan
**Date:** August 12, 2026  
**Phase:** Security Hardening Sprint (Days 1-2)  
**Focus:** Email delivery for 2FA, JWT auth, and authorization checks

---

## Pre-Test Setup

### 1. Environment Configuration

Verify `.env.local` has these critical variables:

```bash
# Check file exists
ls -la .env.local

# Verify these are set:
grep "JWT_SECRET" .env.local          # Should NOT be empty
grep "BREVO_API_KEY" .env.local        # Should NOT be empty
grep "SUPABASE_URL" .env.local         # Should have ohideepcamksuyvpvpjx.supabase.co
grep "SUPABASE_SERVICE_ROLE_KEY" .env.local  # Should start with sb_secret_
```

### 2. Database Status

Verify migrations are applied:

```bash
# Check Supabase tables exist
supabase tables list

# Should include:
# - pending_2fa_confirmations (from migration 008)
# - quiz_attempts (from migration 007)
# - students (for 2FA validation)
```

### 3. Brevo Account Verification

```bash
# Test Brevo API key
curl -X GET https://api.brevo.com/v3/account \
  -H "api-key: $BREVO_API_KEY" \
  -H "Accept: application/json"

# Should return 200 with account details
```

---

## Test Cases

### TEST 1: Email Service Functionality

**Objective:** Verify Brevo API integration works  
**Prerequisites:** BREVO_API_KEY is valid  

#### 1.1 Direct Email Service Test

```bash
# Start the app
npm run dev

# In another terminal, create a test instructor and quiz:
# Use the API to create a test quiz first
```

**Expected Result:** Email service starts without errors in console logs

#### 1.2 Email Template Rendering

**Test:** Manually call the 2FA email endpoint

```bash
# Step 1: Get JWT token for an instructor
# (You'll need to create instructor account first via signup)

JWT_TOKEN="<token_from_login_response>"
QUIZ_ID="<test_quiz_id>"

# Step 2: Request 2FA code
curl -X POST \
  http://localhost:3000/api/instructor/quiz/$QUIZ_ID/request-delete-confirmation \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteType": "hard"}'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "message": "2FA code sent to instructor@example.com. It will expire in 10 minutes.",
#     "confirmationId": "<uuid>",
#     "expiresIn": 600,
#     "quizTitle": "Test Quiz"
#   }
# }
```

**Expected Result:**
- ✅ HTTP 200 response
- ✅ Email arrives at instructor's email within 5 seconds
- ✅ Email contains 6-digit code
- ✅ Email is branded with DailyAgile colors
- ✅ Subject line contains "Security Code"

---

### TEST 2: 2FA Code Validation Flow

**Objective:** Verify the complete 2FA delete flow works end-to-end

#### 2.1 Request Confirmation Code

```bash
# Request 2FA code (from TEST 1.2)
curl -X POST \
  http://localhost:3000/api/instructor/quiz/$QUIZ_ID/request-delete-confirmation \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteType": "hard"}'

# Extract the confirmationId from response
CONFIRMATION_ID="<from_response>"

# Look for 2FA code in email (will arrive in inbox)
# Extract the 6-digit code
CODE="123456"  # Example
```

**Expected Result:**
- ✅ HTTP 200
- ✅ Code in email matches database
- ✅ Expiration timestamp is ~10 minutes from now

#### 2.2 Submit Wrong Code (Should Fail)

```bash
# Try to delete with wrong code
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_ID/delete?deleteType=hard" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test Quiz", "twoFACode": "000000"}'

# Expected response: 403 Forbidden
# {
#   "success": false,
#   "error": {
#     "code": "FORBIDDEN",
#     "message": "Invalid code. Attempt 1 of 5."
#   }
# }
```

**Expected Result:**
- ✅ HTTP 403 Forbidden
- ✅ Error message shows attempt count
- ✅ Failed attempt count increments in database

#### 2.3 Submit Correct Code (Should Succeed)

```bash
# Try to delete with correct code from email
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_ID/delete?deleteType=hard" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test Quiz", "twoFACode": "123456"}'

# Expected response: 200 OK
# {
#   "success": true,
#   "data": {
#     "message": "Quiz \"Test Quiz\" permanently deleted...",
#     "quizId": "$QUIZ_ID",
#     "deleteType": "hard",
#     "canRestore": false,
#     "snapshotsPreserved": 0,
#     "deletedBy": "instructor@example.com",
#     "deletedAt": "2026-08-12T..."
#   }
# }
```

**Expected Result:**
- ✅ HTTP 200 OK
- ✅ Quiz is deleted from database
- ✅ 2FA code marked as used
- ✅ Audit log shows deletion

#### 2.4 Try to Reuse Same Code (Should Fail)

```bash
# Request another code
curl -X POST \
  http://localhost:3000/api/instructor/quiz/$QUIZ_ID_2/request-delete-confirmation \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteType": "hard"}'

# Try to use first code (already used)
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_ID_2/delete?deleteType=hard" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test Quiz 2", "twoFACode": "123456"}'

# Expected response: 403 Forbidden
# {
#   "success": false,
#   "error": {
#     "code": "FORBIDDEN",
#     "message": "No 2FA code sent. Request hard delete first."
#   }
# }
```

**Expected Result:**
- ✅ HTTP 403 Forbidden
- ✅ Cannot reuse old code
- ✅ Must request new code

---

### TEST 3: JWT Authentication Checks

**Objective:** Verify JWT token validation works

#### 3.1 Missing Authorization Header

```bash
# Try to delete without token
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_ID/delete?deleteType=soft" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test"}'

# Expected: 401 Unauthorized
```

**Expected Result:**
- ✅ HTTP 401 Unauthorized
- ✅ Message: "Unauthorized: Please login"

#### 3.2 Invalid Token

```bash
# Try with invalid token
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_ID/delete?deleteType=soft" \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test"}'

# Expected: 401 Unauthorized
```

**Expected Result:**
- ✅ HTTP 401 Unauthorized
- ✅ Message: "Invalid or expired token"

#### 3.3 Student Token Cannot Access Instructor Endpoint

```bash
# Get student JWT token
STUDENT_TOKEN="<token_from_student_login>"

# Try to create assignment (instructor-only)
curl -X POST \
  http://localhost:3000/api/quiz/assignments/create \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quizId": "'$QUIZ_ID'", ...}'

# Expected: 403 Forbidden
```

**Expected Result:**
- ✅ HTTP 403 Forbidden
- ✅ Message: "Insufficient permissions"

---

### TEST 4: Ownership Authorization Checks

**Objective:** Verify instructors can only manage their own quizzes

#### 4.1 Instructor Cannot Delete Other's Quiz

```bash
# Create quiz as Instructor A
INST_A_TOKEN="<token>"
curl -X POST http://localhost:3000/api/quiz/create \
  -H "Authorization: Bearer $INST_A_TOKEN" \
  -d '{"title": "Quiz A"}'
# Returns QUIZ_A_ID

# Try to delete as Instructor B
INST_B_TOKEN="<token>"
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_A_ID/delete?deleteType=soft" \
  -H "Authorization: Bearer $INST_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Quiz A"}'

# Expected: 403 Forbidden
```

**Expected Result:**
- ✅ HTTP 403 Forbidden
- ✅ Message: "You do not have permission to delete this quiz"

#### 4.2 Student Cannot Access Other Student's Assignment

```bash
# Create assignment for Student A
STUDENT_A_ID="<uuid>"
curl -X POST http://localhost:3000/api/quiz/assignments/create \
  -H "Authorization: Bearer $INST_TOKEN" \
  -d '{"quizId": "'$QUIZ_ID'", "studentIds": ["'$STUDENT_A_ID'"], ...}'
# Returns ASSIGNMENT_ID

# Student B tries to request extension
STUDENT_B_TOKEN="<token>"
curl -X POST \
  "http://localhost:3000/api/quiz/assignments/$ASSIGNMENT_ID/request-extension" \
  -H "Authorization: Bearer $STUDENT_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requestType": "extension"}'

# Expected: 403 Forbidden
```

**Expected Result:**
- ✅ HTTP 403 Forbidden
- ✅ Cannot view other student's assignment

---

### TEST 5: Code Expiration

**Objective:** Verify 2FA codes expire after 10 minutes

#### 5.1 Use Expired Code

```bash
# Request 2FA code
# WAIT 11 minutes (or update created_at in DB to -11 minutes)

# Try to use expired code
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_ID/delete?deleteType=hard" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test Quiz", "twoFACode": "123456"}'

# Expected: 403 Forbidden
# Message should mention code expired
```

**Expected Result:**
- ✅ HTTP 403 Forbidden
- ✅ Message: "2FA code has expired (valid for 10 minutes only)"

**Shortcut (for testing):**
```sql
-- In Supabase SQL editor, update test code to expire immediately
UPDATE pending_2fa_confirmations
SET expires_at = NOW() - INTERVAL '1 minute'
WHERE instructor_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

---

### TEST 6: Email Service Error Handling

**Objective:** Verify app continues working if email fails

#### 6.1 Invalid Brevo API Key

```bash
# Edit .env.local and set invalid key
BREVO_API_KEY=invalid_key_12345

# Restart app (should warn but not crash)
npm run dev

# Request 2FA code
curl -X POST \
  http://localhost:3000/api/instructor/quiz/$QUIZ_ID/request-delete-confirmation \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteType": "hard"}'

# Expected: 200 OK (doesn't fail the operation)
# But logs will show email failure
```

**Expected Result:**
- ✅ HTTP 200 OK (graceful degradation)
- ✅ Console logs: "Failed to send 2FA email"
- ✅ Code still generated and stored in DB
- ✅ User can retry or manually contact instructor

---

### TEST 7: Soft Delete (No 2FA Required)

**Objective:** Verify soft delete doesn't require 2FA

#### 7.1 Archive Quiz Without Code

```bash
# Create a test quiz
QUIZ_ID="<test_id>"

# Delete as soft (archive) without 2FA code
curl -X DELETE \
  "http://localhost:3000/api/instructor/quiz/$QUIZ_ID/delete?deleteType=soft" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test Quiz"}'

# Expected: 200 OK (doesn't need 2FA)
# {
#   "success": true,
#   "data": {
#     "message": "Quiz \"Test Quiz\" archived successfully",
#     "canRestore": true
#   }
# }
```

**Expected Result:**
- ✅ HTTP 200 OK
- ✅ Quiz marked as deleted_at with is_active = false
- ✅ No 2FA code required
- ✅ Can be restored later

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| TEST 1.1: Email Service Starts | ⭕ To Do | |
| TEST 1.2: Email Delivery | ⭕ To Do | Manual verification in inbox |
| TEST 2.1: Request Confirmation | ⭕ To Do | |
| TEST 2.2: Wrong Code Fails | ⭕ To Do | |
| TEST 2.3: Correct Code Succeeds | ⭕ To Do | |
| TEST 2.4: Code Reuse Prevented | ⭕ To Do | |
| TEST 3.1: Missing Auth Header | ⭕ To Do | |
| TEST 3.2: Invalid Token | ⭕ To Do | |
| TEST 3.3: Role Check Works | ⭕ To Do | |
| TEST 4.1: Ownership Check | ⭕ To Do | |
| TEST 4.2: Student Data Isolated | ⭕ To Do | |
| TEST 5.1: Code Expiration | ⭕ To Do | |
| TEST 6.1: Email Failure Handling | ⭕ To Do | |
| TEST 7.1: Soft Delete | ⭕ To Do | |

---

## Automated Test Script

Save this as `test-security.sh` and run after deployments:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
INST_TOKEN="$1"
STUDENT_TOKEN="$2"
QUIZ_ID="$3"

echo "🔐 Running Security Tests..."

# Test 1: Missing auth
echo -n "Test 1: Missing auth header... "
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/resp.json \
  -X DELETE "$BASE_URL/api/instructor/quiz/$QUIZ_ID/delete?deleteType=soft")
if [ "$RESPONSE" = "401" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL (got $RESPONSE)"
fi

# Test 2: Student cannot delete
echo -n "Test 2: Student authorization check... "
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/resp.json \
  -X DELETE "$BASE_URL/api/instructor/quiz/$QUIZ_ID/delete?deleteType=soft" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test"}')
if [ "$RESPONSE" = "403" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL (got $RESPONSE)"
fi

# Test 3: Soft delete succeeds
echo -n "Test 3: Soft delete works... "
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/resp.json \
  -X DELETE "$BASE_URL/api/instructor/quiz/$QUIZ_ID/delete?deleteType=soft" \
  -H "Authorization: Bearer $INST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmQuizName": "Test Quiz"}')
if [ "$RESPONSE" = "200" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL (got $RESPONSE)"
  cat /tmp/resp.json | jq .
fi

echo "✅ Tests complete"
```

**Usage:**
```bash
chmod +x test-security.sh
./test-security.sh "$INSTRUCTOR_JWT" "$STUDENT_JWT" "quiz-uuid"
```

---

## Debugging Guide

### Email Not Arriving?

1. Check Brevo API key is valid:
   ```bash
   curl -X GET https://api.brevo.com/v3/account \
     -H "api-key: $BREVO_API_KEY" \
     -H "Accept: application/json"
   ```

2. Check app logs for email errors:
   ```bash
   # Look for: "Failed to send 2FA email"
   # Check response from Brevo API
   ```

3. Check spam folder (Brevo may be marked as spam initially)

### Token Not Working?

1. Verify token is from recent login (not old token)
2. Check token includes required fields:
   ```bash
   # Decode JWT (https://jwt.io)
   # Should have: id, email, role, verified, iat, exp
   ```

3. Check JWT_SECRET matches signing key

### 2FA Code Not Validating?

1. Verify code matches exactly (6 digits)
2. Check code hasn't expired (10 min window)
3. Check code hasn't been used already
4. Verify you haven't exceeded 5 attempts

---

## Sign-Off

**Tests Ready:** ✅ All test cases documented  
**Manual Testing Required:** ✅ Email delivery (requires actual email address)  
**Automated Testing:** ✅ Non-email tests can be automated

**Next Steps:**
1. Run TEST 1-7 with real test accounts
2. Verify email delivery is working
3. Monitor logs for any security warnings
4. Deploy to staging before production

---

**End of Test Plan**
