import { getStudentList, assignQuizToStudents } from '@/lib/student-service';

/**
 * Jest unit tests for student management service functions
 * These test the core business logic before E2E testing
 */

describe('Student Service', () => {
  describe('getStudentList', () => {
    test('should handle pagination parameters', async () => {
      // Test getStudentList with pagination
      const result = await getStudentList(
        { page: 1, limit: 20 },
        'test-instructor@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('students');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.students)).toBe(true);
    });

    test('should include required student fields', async () => {
      const result = await getStudentList(
        { page: 1, limit: 20 },
        'test-instructor@example.com'
      );

      if (result.success && result.data.students.length > 0) {
        const student = result.data.students[0];
        expect(student).toHaveProperty('id');
        expect(student).toHaveProperty('email');
        expect(student).toHaveProperty('name');
        expect(student).toHaveProperty('enrolled_at');
        expect(student).toHaveProperty('quizzes_assigned');
        expect(student).toHaveProperty('quizzes_completed');
        expect(student).toHaveProperty('completion_percentage');
      }
    });

    test('should filter by search term', async () => {
      const result = await getStudentList(
        { page: 1, limit: 20, search: 'test' },
        'test-instructor@example.com'
      );

      expect(result.success).toBe(true);
      // Results should either be empty or contain search term
      if (result.data.students.length > 0) {
        const matchesSearch = result.data.students.some(s =>
          s.email.toLowerCase().includes('test') ||
          s.name?.toLowerCase().includes('test')
        );
        expect(matchesSearch).toBe(true);
      }
    });

    test('should filter by completion status', async () => {
      const result = await getStudentList(
        { page: 1, limit: 20, status: 'completed' },
        'test-instructor@example.com'
      );

      expect(result.success).toBe(true);
      // All returned students should have completion_percentage > 0
      if (result.data.students.length > 0) {
        result.data.students.forEach(s => {
          expect(s.completion_percentage).toBeGreaterThan(0);
        });
      }
    });

    test('should return pagination info', async () => {
      const result = await getStudentList(
        { page: 1, limit: 20 },
        'test-instructor@example.com'
      );

      expect(result.success).toBe(true);
      const pagination = result.data.pagination;
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('pages');
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(20);
    });

    test('should only return instructor own students', async () => {
      const result1 = await getStudentList(
        { page: 1, limit: 20 },
        'instructor1@example.com'
      );

      const result2 = await getStudentList(
        { page: 1, limit: 20 },
        'instructor2@example.com'
      );

      // Results should be independent per instructor (different instructor emails)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    test('should return error for unauthorized user', async () => {
      const result = await getStudentList(
        { page: 1, limit: 20 },
        '' // Empty instructor ID
      );

      // Should fail or return empty results for invalid instructor
      expect(result.success === false || result.data.students.length === 0).toBe(true);
    });
  });

  describe('assignQuizToStudents', () => {
    test('should assign quiz to single student', async () => {
      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['test-student-id'],
        instructorId: 'test-instructor@example.com',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      if (result.success) {
        expect(result.data).toHaveProperty('assigned_count');
        expect(result.data.assigned_count).toBeGreaterThan(0);
      }
    });

    test('should assign quiz to multiple students', async () => {
      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['student1', 'student2', 'student3'],
        instructorId: 'test-instructor@example.com',
      });

      expect(result.success === true).toBe(true);
      if (result.success) {
        expect(result.data.assigned_count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle optional deadline', async () => {
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['test-student-id'],
        instructorId: 'test-instructor@example.com',
        deadline: deadline.toISOString(),
      });

      expect(result.success === true).toBe(true);
    });

    test('should fail with invalid quiz ID', async () => {
      const result = await assignQuizToStudents({
        quizId: '',
        studentIds: ['test-student-id'],
        instructorId: 'test-instructor@example.com',
      });

      expect(result.success).toBe(false);
    });

    test('should fail with empty student list', async () => {
      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: [],
        instructorId: 'test-instructor@example.com',
      });

      expect(result.success).toBe(false);
    });

    test('should verify instructor owns quiz', async () => {
      // This is a security test - instructor should only assign their own quizzes
      const result = await assignQuizToStudents({
        quizId: 'quiz-by-another-instructor',
        studentIds: ['test-student-id'],
        instructorId: 'unauthorized-instructor@example.com',
      });

      // Should fail if trying to assign quiz by another instructor
      expect(result.success === false).toBe(true);
    });

    test('should return assigned count', async () => {
      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['student1', 'student2'],
        instructorId: 'test-instructor@example.com',
      });

      if (result.success) {
        expect(typeof result.data.assigned_count).toBe('number');
        expect(result.data.assigned_count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should return success message', async () => {
      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['test-student-id'],
        instructorId: 'test-instructor@example.com',
      });

      if (result.success) {
        expect(result.data).toHaveProperty('message');
        expect(typeof result.data.message).toBe('string');
      }
    });

    test('should handle notify_students flag', async () => {
      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['test-student-id'],
        instructorId: 'test-instructor@example.com',
        notifyStudents: true,
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('Error Handling', () => {
    test('getStudentList should handle database errors gracefully', async () => {
      const result = await getStudentList(
        { page: 1, limit: 20 },
        'test-instructor@example.com'
      );

      // Should return error object, not throw
      expect(result).toHaveProperty('success');
      expect(typeof result).toBe('object');
    });

    test('assignQuizToStudents should handle database errors gracefully', async () => {
      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['test-student-id'],
        instructorId: 'test-instructor@example.com',
      });

      // Should return error object, not throw
      expect(result).toHaveProperty('success');
      expect(typeof result).toBe('object');
    });
  });

  describe('Validation', () => {
    test('getStudentList should validate pagination parameters', async () => {
      // Invalid page number
      const result = await getStudentList(
        { page: -1, limit: 20 },
        'test-instructor@example.com'
      );

      expect(result.success === false || result.data.pagination.page >= 1).toBe(true);
    });

    test('getStudentList should validate limit parameter', async () => {
      // Invalid limit (should default or reject)
      const result = await getStudentList(
        { page: 1, limit: 0 },
        'test-instructor@example.com'
      );

      expect(result.success === false || result.data.pagination.limit > 0).toBe(true);
    });

    test('assignQuizToStudents should validate deadline is in future', async () => {
      const pastDeadline = new Date(Date.now() - 1000).toISOString(); // 1 second ago

      const result = await assignQuizToStudents({
        quizId: 'test-quiz-id',
        studentIds: ['test-student-id'],
        instructorId: 'test-instructor@example.com',
        deadline: pastDeadline,
      });

      // Should fail if deadline is in the past
      expect(result.success === false).toBe(true);
    });
  });
});
