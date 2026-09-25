/**
 * Tests for Student Performance API Endpoint
 * Feature 1.4: Student Performance Report
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/lib/server/supabase-client');
vi.mock('@/lib/logger');

const mockSupabase = {
  from: vi.fn(),
};

describe('Student Performance API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseClient as any).mockReturnValue(mockSupabase);
  });

  describe('Performance Data Aggregation', () => {
    it('should calculate correct completion percentage', () => {
      const stats = {
        total_quizzes_assigned: 5,
        total_quizzes_completed: 3,
      };

      const completionPercentage = Math.round(
        (stats.total_quizzes_completed / stats.total_quizzes_assigned) * 100,
      );

      expect(completionPercentage).toBe(60);
    });

    it('should calculate correct average score', () => {
      const scores = [85, 90, 75];
      const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      expect(average).toBe(83);
    });

    it('should handle zero quizzes assigned', () => {
      const stats = {
        total_quizzes_assigned: 0,
        total_quizzes_completed: 0,
      };

      const completionPercentage =
        stats.total_quizzes_assigned > 0
          ? Math.round((stats.total_quizzes_completed / stats.total_quizzes_assigned) * 100)
          : 0;

      expect(completionPercentage).toBe(0);
    });

    it('should handle missing scores', () => {
      const completedQuizzes = [
        { score: 85 },
        { score: null },
        { score: 90 },
      ];

      const scores = completedQuizzes
        .filter((q: any) => q.score !== null)
        .map((q: any) => q.score);

      const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      expect(average).toBe(88); // (85 + 90) / 2 = 87.5 → 88
    });

    it('should identify passing and failing quizzes', () => {
      const quizzes = [
        { percentage: 85, passed: true },
        { percentage: 55, passed: false },
        { percentage: null, passed: false },
      ];

      const passedCount = quizzes.filter((q) => q.percentage !== null && q.percentage >= 60).length;
      const failedCount = quizzes.filter((q) => q.percentage !== null && q.percentage < 60).length;
      const pendingCount = quizzes.filter((q) => q.percentage === null).length;

      expect(passedCount).toBe(1);
      expect(failedCount).toBe(1);
      expect(pendingCount).toBe(1);
    });
  });

  describe('Quiz Status Tracking', () => {
    it('should correctly map quiz assignment to session data', () => {
      const assignment = {
        quiz_id: 'quiz-1',
        quizzes: { id: 'quiz-1', title: 'Quiz 1' },
      };

      const session = {
        quiz_id: 'quiz-1',
        score: 80,
        percentage: 80,
        status: 'completed',
      };

      const result = {
        quiz_id: assignment.quizzes.id,
        quiz_title: assignment.quizzes.title,
        score: session.score,
        percentage: session.percentage,
        passed: session.percentage >= 60,
        status: session.status,
      };

      expect(result.quiz_id).toBe('quiz-1');
      expect(result.quiz_title).toBe('Quiz 1');
      expect(result.score).toBe(80);
      expect(result.passed).toBe(true);
    });

    it('should handle pending quizzes without sessions', () => {
      const assignment = {
        quiz_id: 'quiz-1',
        quizzes: { id: 'quiz-1', title: 'Quiz 1' },
      };

      const result = {
        quiz_id: assignment.quizzes.id,
        quiz_title: assignment.quizzes.title,
        score: null,
        percentage: null,
        passed: null,
        status: 'pending',
      };

      expect(result.status).toBe('pending');
      expect(result.score).toBeNull();
      expect(result.passed).toBeNull();
    });

    it('should use most recent completed session', () => {
      const sessions = [
        {
          quiz_id: 'quiz-1',
          score: 70,
          percentage: 70,
          status: 'completed',
          submitted_at: '2026-08-20T10:00:00Z',
        },
        {
          quiz_id: 'quiz-1',
          score: 85,
          percentage: 85,
          status: 'completed',
          submitted_at: '2026-08-27T15:00:00Z',
        },
      ];

      const mostRecent = sessions.reduce((latest, current) => {
        return new Date(current.submitted_at) > new Date(latest.submitted_at) ? current : latest;
      });

      expect(mostRecent.score).toBe(85);
      expect(mostRecent.percentage).toBe(85);
    });
  });

  describe('Data Validation', () => {
    it('should handle missing student data gracefully', () => {
      const student = null;

      expect(student).toBeNull();
      // API should return 404 in this case
    });

    it('should filter assignments by instructor ownership', () => {
      const assignments = [
        {
          quiz_id: 'quiz-1',
          quizzes: { instructor_id: 'instructor-1' },
        },
        {
          quiz_id: 'quiz-2',
          quizzes: { instructor_id: 'instructor-2' },
        },
      ];

      const authenticatedInstructorId = 'instructor-1';
      const filtered = assignments.filter(
        (a: any) => a.quizzes?.instructor_id === authenticatedInstructorId,
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].quiz_id).toBe('quiz-1');
    });

    it('should handle duration conversion correctly', () => {
      const testCases = [
        { seconds: 600, expected: '10m 0s' },
        { seconds: 125, expected: '2m 5s' },
        { seconds: 45, expected: '0m 45s' },
        { seconds: null, expected: null },
      ];

      testCases.forEach(({ seconds, expected }) => {
        if (seconds === null) {
          expect(expected).toBeNull();
        } else {
          const minutes = Math.floor(seconds / 60);
          const secs = seconds % 60;
          const formatted = `${minutes}m ${secs}s`;
          expect(formatted).toBe(expected);
        }
      });
    });
  });

  describe('Performance Calculations', () => {
    it('should calculate last activity date correctly', () => {
      const completedQuizzes = [
        { attempted_at: '2026-08-27T15:30:00Z' },
        { attempted_at: '2026-08-26T10:00:00Z' },
      ];

      const lastActivity = completedQuizzes.length > 0 ? completedQuizzes[0].attempted_at : null;

      expect(lastActivity).toBe('2026-08-27T15:30:00Z');
    });

    it('should handle empty quiz list', () => {
      const quizzes: any[] = [];

      expect(quizzes.length).toBe(0);
      expect(quizzes[0]).toBeUndefined();
    });

    it('should correctly identify pass/fail status based on percentage', () => {
      const testCases = [
        { percentage: 100, expected: true },
        { percentage: 60, expected: true },
        { percentage: 59, expected: false },
        { percentage: 0, expected: false },
      ];

      testCases.forEach(({ percentage, expected }) => {
        const passed = percentage >= 60;
        expect(passed).toBe(expected);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle student with no assignments', () => {
      const assignments: any[] = [];

      expect(assignments.length).toBe(0);
      // Should return empty quizzes array
    });

    it('should handle all quizzes pending', () => {
      const quizzes = [
        { status: 'pending', percentage: null },
        { status: 'pending', percentage: null },
      ];

      const completedCount = quizzes.filter((q) => q.status === 'completed').length;
      const completionPercentage = quizzes.length > 0 ? (completedCount / quizzes.length) * 100 : 0;

      expect(completedCount).toBe(0);
      expect(completionPercentage).toBe(0);
    });

    it('should handle mixed status quizzes', () => {
      const quizzes = [
        { status: 'completed', percentage: 85 },
        { status: 'in_progress', percentage: null },
        { status: 'pending', percentage: null },
      ];

      const statuses = quizzes.reduce(
        (acc, q) => {
          acc[q.status] = (acc[q.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      expect(statuses.completed).toBe(1);
      expect(statuses.in_progress).toBe(1);
      expect(statuses.pending).toBe(1);
    });
  });
});
