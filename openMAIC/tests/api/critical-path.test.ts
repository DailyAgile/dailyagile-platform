/**
 * API-Level Automated Tests
 * Tests the complete flow via HTTP requests (no browser)
 * Run: npx vitest tests/api/critical-path.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3000';
const INSTRUCTOR_EMAIL = 'tkiran204@gmail.com';
const INSTRUCTOR_PASSWORD = 'test123456';
const STUDENT_EMAIL = 'tkiran204@gmail.com'; // Same email, different role

let instructorToken = '';
let studentToken = '';
let quizId = '';
let studentId = '';
let assignmentCode = '';

describe('API Critical Path Tests', () => {
  describe('1️⃣ Instructor Authentication', () => {
    it('should login instructor and get JWT token', async () => {
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
      expect(data.success).toBe(true);
      expect(data.data?.instructor_id).toBeTruthy();

      console.log('✅ Instructor login successful');
    });

    it('should get JWT token from /api/instructor/get-jwt-token', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/get-jwt-token`, {
        method: 'GET',
        credentials: 'include',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.token).toBeTruthy();

      instructorToken = data.token;
      console.log('✅ JWT token retrieved:', instructorToken.substring(0, 50) + '...');
    });
  });

  describe('2️⃣ Quiz Management', () => {
    it('should list instructor quizzes', async () => {
      const response = await fetch(`${BASE_URL}/api/instructor/quiz/list`, {
        headers: {
          'Authorization': `Bearer ${instructorToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data?.quizzes)).toBe(true);

      // Get first quiz ID for assignment
      if (data.data?.quizzes?.length > 0) {
        quizId = data.data.quizzes[0].id;
        console.log('✅ Quiz found:', quizId);
      } else {
        console.warn('⚠️ No quizzes found - skipping assignment tests');
      }
    });

    it('should publish a quiz', async () => {
      if (!quizId) this.skip();

      const response = await fetch(`${BASE_URL}/api/instructor/quiz/${quizId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${instructorToken}`,
        },
        body: JSON.stringify({ publish: true }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      console.log('✅ Quiz published');
    });
  });

  describe('3️⃣ Student Assignment', () => {
    it('should get available students', async () => {
      if (!quizId) this.skip();

      const response = await fetch(
        `${BASE_URL}/api/instructor/quiz/${quizId}/available-students`,
        {
          headers: {
            'Authorization': `Bearer ${instructorToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data?.students)).toBe(true);

      if (data.data?.students?.length > 0) {
        studentId = data.data.students[0].id;
        console.log('✅ Student found:', studentId);
      }
    });

    it('should assign quiz to student', async () => {
      if (!quizId || !studentId) this.skip();

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const response = await fetch(
        `${BASE_URL}/api/instructor/quiz/${quizId}/assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${instructorToken}`,
          },
          body: JSON.stringify({
            student_ids: [studentId],
            expires_at: expiryDate.toISOString().split('T')[0],
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.assignments?.length).toBe(1);

      assignmentCode = data.data.assignments[0].assignment_code;
      console.log('✅ Assignment created with code:', assignmentCode);
    });

    it('should list assignments for instructor', async () => {
      if (!quizId) this.skip();

      const response = await fetch(
        `${BASE_URL}/api/instructor/quiz/${quizId}/assignments`,
        {
          headers: {
            'Authorization': `Bearer ${instructorToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.assignments?.length).toBeGreaterThan(0);
      console.log('✅ Assignments listed:', data.data.assignments.length);
    });
  });

  describe('4️⃣ Student Authentication', () => {
    it('should login student and get JWT token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: STUDENT_EMAIL,
          password: INSTRUCTOR_PASSWORD,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.token).toBeTruthy();

      studentToken = data.data.token;
      console.log('✅ Student login successful');
    });
  });

  describe('5️⃣ Student Assignment Access', () => {
    it('should get student assignments with auth token', async () => {
      if (!studentId) this.skip();

      const response = await fetch(
        `${BASE_URL}/api/quiz/assignments?studentId=${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${studentToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.active?.length).toBeGreaterThan(0);
      console.log('✅ Student can see assigned quizzes:', data.data.active.length);
    });

    it('should NOT access other students assignments (401/403)', async () => {
      const response = await fetch(
        `${BASE_URL}/api/quiz/assignments?studentId=fake-student-id-12345`,
        {
          headers: {
            'Authorization': `Bearer ${studentToken}`,
          },
        }
      );

      // Should be 401 (unauthorized) or 403 (forbidden)
      expect([401, 403]).toContain(response.status);
      console.log('✅ Security check passed - student cannot access other data');
    });

    it('should require auth token', async () => {
      const response = await fetch(
        `${BASE_URL}/api/quiz/assignments?studentId=${studentId}`
        // NO Authorization header
      );

      expect(response.status).toBe(401);
      console.log('✅ API requires authentication');
    });
  });

  describe('6️⃣ Token Isolation', () => {
    it('instructor token should NOT work for student endpoints', async () => {
      if (!studentId) this.skip();

      const response = await fetch(
        `${BASE_URL}/api/quiz/assignments?studentId=${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${instructorToken}`,
          },
        }
      );

      // Should fail because instructor token is for instructor role, not student
      expect([401, 403]).toContain(response.status);
      console.log('✅ Role isolation working - instructor token rejected for student endpoint');
    });
  });
});
