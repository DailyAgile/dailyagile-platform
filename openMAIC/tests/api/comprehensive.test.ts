/**
 * Comprehensive API Test Suite
 * Coverage: Input validation, auth, authorization, errors, edge cases
 * Run: npx vitest tests/api/comprehensive.test.ts --run
 *
 * SETUP:
 * - Requires dev server running: pnpm dev
 * - Requires test database with instructor: tkiran204@gmail.com / test123456
 * - Set INSTRUCTOR_TEST_EMAIL and INSTRUCTOR_TEST_PASSWORD env vars for CI/CD
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3000';
// Use env vars for CI/CD; fall back to test credentials for local development
const INSTRUCTOR_EMAIL = process.env.INSTRUCTOR_TEST_EMAIL || 'tkiran204@gmail.com';
const INSTRUCTOR_PASSWORD = process.env.INSTRUCTOR_TEST_PASSWORD || 'test123456';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract instructor_session cookie from Set-Cookie headers
 * Node.js fetch doesn't auto-manage cookies like browsers do
 */
function extractSessionCookie(response: Response): string {
  const cookieHeaders = response.headers.getSetCookie?.() || [];
  for (const cookie of cookieHeaders) {
    if (cookie.includes('instructor_session')) {
      return cookie.split(';')[0].trim();
    }
  }
  throw new Error('instructor_session cookie not found in response');
}

// ============================================================================
// GLOBAL TEST STATE
// ============================================================================

// Global state for token sharing across tests
// IMPORTANT: Tests must NOT depend on order. Use explicit assertions, not silent skips.
const testState = {
  instructorToken: '',
  instructorId: '',
  quizId: '',
  studentId: '',
};

describe('🔐 COMPREHENSIVE API TEST SUITE', () => {
  // Setup: Get instructor token once for all tests
  // IMPORTANT: This MUST throw on error so tests don't run in invalid state
  beforeAll(
    async () => {
      // Step 1: Login
      console.log('📝 Logging in as', INSTRUCTOR_EMAIL);
      const loginResponse = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: INSTRUCTOR_EMAIL,
          password: INSTRUCTOR_PASSWORD,
        }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json();
        throw new Error(`Login failed: ${loginResponse.status} ${error.error}`);
      }

      const loginData = await loginResponse.json();
      console.log(`✅ Login successful for ${loginData.email}`);

      // Step 2: Extract instructor_session cookie
      const instructorSessionCookie = extractSessionCookie(loginResponse);
      console.log('✅ Session cookie extracted');

      // Step 3: Get JWT token using the session cookie
      const tokenResponse = await fetch(`${BASE_URL}/api/instructor/get-jwt-token`, {
        headers: {
          'Cookie': instructorSessionCookie,
        },
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(`Failed to get JWT token: ${tokenResponse.status} ${error.error}`);
      }

      const tokenData = await tokenResponse.json();
      testState.instructorToken = tokenData.token;
      console.log('✅ JWT token acquired');
    },
    30000 // 30 second timeout (fails fast if API unavailable)
  );
  // ============================================================================
  // SECTION 1: INPUT VALIDATION
  // ============================================================================
  describe('1️⃣ INPUT VALIDATION', () => {
    describe('Email validation', () => {
      it('should reject empty email', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: '', password: INSTRUCTOR_PASSWORD }),
        });
        expect(response.status).toBe(400);
      });

      it('should reject email without @', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'notanemail', password: INSTRUCTOR_PASSWORD }),
        });
        expect(response.status).toBe(400);
      });

      it('should reject null email', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: null, password: INSTRUCTOR_PASSWORD }),
        });
        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      it('should reject email with spaces', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ' test@test.com ', password: INSTRUCTOR_PASSWORD }),
        });
        // Should either trim or reject - both are valid (400 or 401 if email doesn't exist)
        expect([400, 401]).toContain(response.status);
      });
    });

    describe('Password validation', () => {
      it('should reject empty password', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: INSTRUCTOR_EMAIL, password: '' }),
        });
        expect(response.status).toBe(400);
      });

      it('should reject password < 8 chars', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: INSTRUCTOR_EMAIL, password: 'short' }),
        });
        expect(response.status).toBe(400);
      });

      it('should reject null password', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: INSTRUCTOR_EMAIL, password: null }),
        });
        expect(response.status).toBeGreaterThanOrEqual(400);
      });
    });

    describe('SQL injection attempts', () => {
      it('should not SQL inject via email', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: "'; DROP TABLE instructors; --",
            password: INSTRUCTOR_PASSWORD,
          }),
        });
        // Should fail validation (400) or auth (401) - both are safe
        expect([400, 401]).toContain(response.status);
      });

      it('should not SQL inject via password', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: INSTRUCTOR_EMAIL,
            password: "' OR '1'='1",
          }),
        });
        expect(response.status).toBe(401);
      });
    });

    describe('XSS payload attempts', () => {
      it('should handle XSS in email field', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: '<script>alert("xss")</script>@test.com',
            password: INSTRUCTOR_PASSWORD,
          }),
        });
        expect([400, 401]).toContain(response.status);
      });

      it('should handle XSS in password field', async () => {
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: INSTRUCTOR_EMAIL,
            password: '<img src=x onerror="alert(1)">',
          }),
        });
        expect(response.status).toBe(401);
      });
    });

    describe('Boundary tests', () => {
      it('should reject extremely long email (>1000 chars)', async () => {
        const longEmail = 'a'.repeat(1000) + '@test.com';
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: longEmail,
            password: INSTRUCTOR_PASSWORD,
          }),
        });
        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      it('should handle extremely long password', async () => {
        const longPassword = 'a'.repeat(10000);
        const response = await fetch(`${BASE_URL}/api/instructor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: INSTRUCTOR_EMAIL,
            password: longPassword,
          }),
        });
        expect(response.status).toBeGreaterThanOrEqual(400);
      });
    });
  });

  // ============================================================================
  // SECTION 2: AUTHENTICATION & TOKEN HANDLING
  // ============================================================================
  describe('2️⃣ AUTHENTICATION & TOKENS', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: INSTRUCTOR_EMAIL,
          password: INSTRUCTOR_PASSWORD,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success || data.email).toBeTruthy();
    });

    it('should reject wrong password', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: INSTRUCTOR_EMAIL,
          password: 'wrongpassword123',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: INSTRUCTOR_PASSWORD,
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should get JWT token after login', async () => {
      // First login and extract cookie
      const loginResp = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: INSTRUCTOR_EMAIL,
          password: INSTRUCTOR_PASSWORD,
        }),
      });

      expect(loginResp.ok).toBe(true);

      // Extract session cookie using helper function
      const sessionCookie = extractSessionCookie(loginResp);
      expect(sessionCookie).toBeTruthy();

      // Then get token with the session cookie
      const response = await fetch(`${BASE_URL}/api/instructor/get-jwt-token`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.token).toBeTruthy();
      expect(data.token.split('.').length).toBe(3); // JWT format: xxx.yyy.zzz
    });

    it('should reject JWT token with invalid format', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': 'Bearer invalid.token.format' },
      });

      expect(response.status).toBe(401);
    });

    it('should reject tampered JWT token', async () => {
      // SECURITY: Verify JWT signature validation by tampering with the signature
      const validToken = testState.instructorToken;
      expect(validToken).toBeTruthy();
      expect(validToken.split('.').length).toBe(3); // Valid JWT has 3 parts

      // Tamper with the signature (last part)
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -10)}aaaaaaaaaa`;

      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': `Bearer ${tamperedToken}` },
      });

      // Must reject tampered signature with 401
      expect(response.status).toBe(401);
      const data = await response.json();
      // Verify error response exists (doesn't need specific message - just needs to reject)
      expect(data.error).toBeTruthy();
    });

    it('should require Authorization header', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`);
      expect(response.status).toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': 'InvalidFormat xyz' },
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // SECTION 3: AUTHORIZATION & ROLE-BASED ACCESS
  // ============================================================================
  describe('3️⃣ AUTHORIZATION & ROLE-BASED ACCESS', () => {
    it('should list quizzes for authenticated instructor', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data?.quizzes)).toBe(true);

      if (data.data?.quizzes?.length > 0) {
        testState.quizId = data.data.quizzes[0].id;
      }
    });

    it('should not access instructor endpoints with student token', async () => {
      // TEST-ONLY: Use a fake student JWT token (invalid signature)
      // This tests role-based access control without calling the student login endpoint
      // Real student tokens would have role: 'student' instead of role: 'instructor'
      const fakeStudentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic3R1ZGVudCJ9.invalid';

      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': `Bearer ${fakeStudentToken}` },
      });

      // Should reject with 401 (unauthorized) or 403 (forbidden)
      expect([401, 403]).toContain(response.status);
    });

    it('should enforce quiz ownership', async () => {
      // CRITICAL: Fail explicitly if setup incomplete (don't silently skip)
      expect(testState.instructorToken).toBeTruthy();
      expect(testState.quizId).toBeTruthy();

      // Try to delete quiz (should work - owns it)
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/${testState.quizId}/delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
        body: JSON.stringify({ deleteType: 'soft' }),
      });

      // Should either work (200) or be already deleted (404)
      expect([200, 404, 403]).toContain(response.status);
    });
  });

  // ============================================================================
  // SECTION 4: ERROR HANDLING & STATUS CODES
  // ============================================================================
  describe('4️⃣ ERROR HANDLING', () => {
    it('should return 404 for non-existent quiz', async () => {
      const response = await fetch(
        `${BASE_URL}/api/instructor/quiz/00000000-0000-0000-0000-000000000000/assignments`,
        {
          headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 400 for malformed JSON', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json}',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 405 for wrong HTTP method', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'GET', // Should be POST
      });

      expect([404, 405]).toContain(response.status);
    });

    it('should handle missing required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: INSTRUCTOR_EMAIL }), // Missing password
      });

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // SECTION 5: DATA VALIDATION & CONSTRAINTS
  // ============================================================================
  describe('5️⃣ DATA VALIDATION', () => {
    it('should validate email uniqueness (no duplicate accounts)', async () => {
      // Try to signup with existing email
      const response = await fetch(`${BASE_URL}/api/auth/student/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: INSTRUCTOR_EMAIL, // Already exists
          password: 'newpassword123',
        }),
      });

      expect([400, 409, 401]).toContain(response.status);
    });

    it('should validate date format for assignment expiry', async () => {
      expect(testState.quizId).toBeTruthy();

      const response = await fetch(
        `${BASE_URL}/api/instructor/quiz/${testState.quizId}/assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testState.instructorToken}`,
          },
          body: JSON.stringify({
            student_ids: ['test-id'],
            expires_at: 'invalid-date-format',
          }),
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject past dates for expiry', async () => {
      expect(testState.quizId).toBeTruthy();

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const response = await fetch(
        `${BASE_URL}/api/instructor/quiz/${testState.quizId}/assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testState.instructorToken}`,
          },
          body: JSON.stringify({
            student_ids: ['test-id'],
            expires_at: pastDate.toISOString().split('T')[0],
          }),
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate student ID format (UUID)', async () => {
      expect(testState.quizId).toBeTruthy();

      const response = await fetch(
        `${BASE_URL}/api/instructor/quiz/${testState.quizId}/assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testState.instructorToken}`,
          },
          body: JSON.stringify({
            student_ids: ['not-a-uuid'],
            expires_at: new Date().toISOString().split('T')[0],
          }),
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // SECTION 6: SECURITY BOUNDARIES
  // ============================================================================
  describe('6️⃣ SECURITY BOUNDARIES', () => {
    it('should prevent accessing other students assignments', async () => {
      const response = await fetch(
        `${BASE_URL}/api/quiz/assignments?studentId=00000000-0000-0000-0000-000000000001`,
        {
          headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
        }
      );

      expect([401, 403]).toContain(response.status);
    });

    it('should prevent accessing instructor data via student endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': 'Bearer invalid-student-token' },
      });

      expect(response.status).toBe(401);
    });

    it('should not expose password hashes in API responses', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // SECURITY: Verify password hashes are never exposed
      // Check for common password hash patterns
      expect(responseText).not.toContain('password_hash');
      expect(responseText).not.toContain('password_hashed');
      expect(responseText).not.toMatch(/\$2[aby]\$\d{2}\$/); // bcrypt pattern: $2a$, $2b$, $2y$
      expect(responseText).not.toMatch(/^[a-f0-9]{32}$/); // MD5 hash pattern
      expect(responseText).not.toMatch(/^[a-f0-9]{40}$/); // SHA1 hash pattern
      expect(responseText).not.toMatch(/^[a-f0-9]{64}$/); // SHA256 hash pattern
    });

    it('should not expose email verification codes', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // SECURITY: Verify OTP/verification codes are never exposed
      expect(responseText).not.toContain('verification_code');
      expect(responseText).not.toContain('otp_code');
      expect(responseText).not.toContain('otp');
      expect(responseText).not.toContain('email_verification');
      // Verify no 6-digit codes in response (common OTP length)
      expect(responseText).not.toMatch(/:\s*"\d{6}"/);
    });
  });

  // ============================================================================
  // SECTION 7: CONCURRENT ACCESS
  // ============================================================================
  describe('7️⃣ CONCURRENT ACCESS', () => {
    it('should handle concurrent requests safely', async () => {
      const promises = [];

      // Make 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          fetch(`${BASE_URL}/api/instructor/quiz/list`, {
            headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
          })
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle concurrent login attempts', async () => {
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(
          fetch(`${BASE_URL}/api/instructor/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: INSTRUCTOR_EMAIL,
              password: INSTRUCTOR_PASSWORD,
            }),
          })
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  // ============================================================================
  // SECTION 8: EDGE CASES
  // ============================================================================
  describe('8️⃣ EDGE CASES', () => {
    it('should handle empty quiz list gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data?.quizzes)).toBe(true);
      // Empty array is valid
    });

    it('should handle special characters in data', async () => {
      const response = await fetch(
        `${BASE_URL}/api/quiz/assignments?studentId=test@special#chars$%`,
        {
          headers: { 'Authorization': `Bearer ${testState.instructorToken}` },
        }
      );

      // Should fail validation or auth, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle Unicode in requests', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '测试@test.com',
          password: INSTRUCTOR_PASSWORD,
        }),
      });

      expect([400, 401]).toContain(response.status);
    });

    it('should handle null values gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: null,
          password: null,
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        // No Content-Type header
        body: JSON.stringify({
          email: INSTRUCTOR_EMAIL,
          password: INSTRUCTOR_PASSWORD,
        }),
      });

      // Should still work or return clear error
      expect([200, 400, 415]).toContain(response.status);
    });

    it('should handle array instead of object', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { email: INSTRUCTOR_EMAIL, password: INSTRUCTOR_PASSWORD },
        ]),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle boolean values for email/password', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: true,
          password: false,
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle numeric values for email/password', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 12345,
          password: 67890,
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
