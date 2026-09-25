/**
 * Completion Stats Endpoint Tests
 * GET /api/instructor/quizzes/completion-stats
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

describe('GET /api/instructor/quizzes/completion-stats', () => {
  let client: ReturnType<typeof createClient>;
  let instructorId: string;
  let studentId: string;
  let quizId: string;

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
  });

  beforeEach(async () => {
    // Setup: Create test instructor
    const { data: instructorData } = await client.auth.signUp({
      email: `instructor-${Date.now()}@test.com`,
      password: 'TestPassword123!',
    });
    instructorId = instructorData?.user?.id || '';

    // Create quiz
    const { data: quizData } = await client
      .from('quizzes')
      .insert({
        title: 'Test Quiz',
        quiz_code: `TEST-${Date.now()}`,
        instructor_id: instructorId,
        total_questions: 5,
        total_points: 100,
        is_published: true,
      })
      .select()
      .single();

    quizId = quizData?.id || '';

    // Setup: Create test student
    const { data: studentData } = await client.auth.signUp({
      email: `student-${Date.now()}@test.com`,
      password: 'StudentPassword123!',
    });
    studentId = studentData?.user?.id || '';
  });

  it('should return empty stats for quiz with no assignments', async () => {
    const response = await fetch('/api/instructor/quizzes/completion-stats', {
      headers: {
        Authorization: `Bearer ${process.env.TEST_INSTRUCTOR_TOKEN}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.stats)).toBe(true);
  });

  it('should calculate completion percentage correctly', async () => {
    // Create assignments
    const { data: assignmentData } = await client
      .from('quiz_assignments')
      .insert([
        { quiz_id: quizId, student_id: studentId, assigned_at: new Date().toISOString() },
        { quiz_id: quizId, student_id: 'other-student', assigned_at: new Date().toISOString() },
      ])
      .select();

    // Create completion for first student
    await client
      .from('quiz_sessions')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        status: 'completed',
        score: 85,
        completed_at: new Date().toISOString(),
      });

    const response = await fetch('/api/instructor/quizzes/completion-stats', {
      headers: {
        Authorization: `Bearer ${process.env.TEST_INSTRUCTOR_TOKEN}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    const quizStats = data.data.stats.find((s: any) => s.quiz_id === quizId);
    expect(quizStats).toBeDefined();
    expect(quizStats.assigned_count).toBe(2);
    expect(quizStats.completed_count).toBe(1);
    expect(quizStats.completion_percentage).toBe(50);
  });

  it('should calculate average score correctly', async () => {
    // Create multiple completions
    const scores = [75, 85, 95];

    for (const score of scores) {
      await client
        .from('quiz_sessions')
        .insert({
          quiz_id: quizId,
          student_id: `student-${score}`,
          status: 'completed',
          score,
          completed_at: new Date().toISOString(),
        });

      // Also create assignments
      await client
        .from('quiz_assignments')
        .insert({
          quiz_id: quizId,
          student_id: `student-${score}`,
          assigned_at: new Date().toISOString(),
        });
    }

    const response = await fetch('/api/instructor/quizzes/completion-stats', {
      headers: {
        Authorization: `Bearer ${process.env.TEST_INSTRUCTOR_TOKEN}`,
      },
    });

    const data = await response.json();
    const quizStats = data.data.stats.find((s: any) => s.quiz_id === quizId);

    expect(quizStats).toBeDefined();
    expect(quizStats.avg_score).toBe(85);
  });

  it('should include last completion date', async () => {
    const completedAt = new Date().toISOString();

    await client
      .from('quiz_assignments')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        assigned_at: new Date().toISOString(),
      });

    await client
      .from('quiz_sessions')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        status: 'completed',
        score: 90,
        completed_at: completedAt,
      });

    const response = await fetch('/api/instructor/quizzes/completion-stats', {
      headers: {
        Authorization: `Bearer ${process.env.TEST_INSTRUCTOR_TOKEN}`,
      },
    });

    const data = await response.json();
    const quizStats = data.data.stats.find((s: any) => s.quiz_id === quizId);

    expect(quizStats).toBeDefined();
    expect(quizStats.last_completion_date).toBeDefined();
  });

  it('should only return stats for instructor\'s own quizzes', async () => {
    // Create quiz for different instructor
    const { data: otherInstructorData } = await client.auth.signUp({
      email: `other-instructor-${Date.now()}@test.com`,
      password: 'TestPassword123!',
    });

    const otherInstructorId = otherInstructorData?.user?.id || '';

    const { data: otherQuizData } = await client
      .from('quizzes')
      .insert({
        title: 'Other Quiz',
        quiz_code: `OTHER-${Date.now()}`,
        instructor_id: otherInstructorId,
        total_questions: 5,
        total_points: 100,
        is_published: true,
      })
      .select()
      .single();

    const response = await fetch('/api/instructor/quizzes/completion-stats', {
      headers: {
        Authorization: `Bearer ${process.env.TEST_INSTRUCTOR_TOKEN}`,
      },
    });

    const data = await response.json();
    const otherQuizStats = data.data.stats.find((s: any) => s.quiz_id === otherQuizData?.id);

    expect(otherQuizStats).toBeUndefined();
  });

  it('should require instructor authentication', async () => {
    const response = await fetch('/api/instructor/quizzes/completion-stats');

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});
