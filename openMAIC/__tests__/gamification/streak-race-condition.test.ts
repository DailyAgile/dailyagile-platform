/**
 * Test Suite: Streak Race Condition Fix
 *
 * Purpose: Verify that concurrent quiz submissions correctly increment streaks
 * using database-level locking (SELECT FOR UPDATE) instead of app-level logic.
 *
 * Scenarios tested:
 * 1. Sequential streak updates (baseline)
 * 2. Concurrent updates to same student/quiz combination
 * 3. Concurrent updates to different quizzes (should be independent)
 * 4. Same-day re-submission (should not double-increment)
 */

import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { updateStreak } from '@/lib/student/gamification/streaks';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

describe('Streak Race Condition Fix', () => {
  const testStudentId = 'race-test-student-' + Math.random().toString(36).substr(2, 9);
  const testQuizId = 'race-test-quiz-' + Math.random().toString(36).substr(2, 9);
  const timezone = 'America/New_York';

  beforeAll(async () => {
    // Create test student and quiz
    await supabase.from('students').insert({
      id: testStudentId,
      email: `race-test-${Math.random()}@test.local`,
    });

    await supabase.from('quizzes').insert({
      id: testQuizId,
      title: 'Race Condition Test Quiz',
      description: 'Test quiz for race condition verification',
      pass_rate: 75,
    });
  });

  afterAll(async () => {
    // Cleanup
    await supabase
      .from('student_streaks')
      .delete()
      .eq('student_id', testStudentId);

    await supabase.from('students').delete().eq('id', testStudentId);
    await supabase.from('quizzes').delete().eq('id', testQuizId);
  });

  it('should correctly increment streak in sequential updates', async () => {
    // First quiz completion (Day 1)
    const result1 = await updateStreak(testStudentId, testQuizId, timezone, supabase);
    expect(result1.currentStreak).toBe(1);
    expect(result1.longestStreak).toBe(1);
    expect(result1.streakContinued).toBe(false);

    // MANUAL: Advance to next day in database (for testing)
    // In production, this happens naturally based on current date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Update the test record to yesterday's date
    await supabase
      .from('student_streaks')
      .update({ last_quiz_date: tomorrowStr.split('-')[0] + '-' + tomorrowStr.split('-')[1] + '-' + String(parseInt(tomorrowStr.split('-')[2]) - 1).padStart(2, '0') })
      .eq('student_id', testStudentId)
      .eq('quiz_id', testQuizId);

    // Second quiz completion (Day 2 - streak should continue)
    const result2 = await updateStreak(testStudentId, testQuizId, timezone, supabase);
    expect(result2.currentStreak).toBe(2);
    expect(result2.longestStreak).toBe(2);
    expect(result2.streakContinued).toBe(true);
  });

  it('should handle concurrent updates without double-incrementing', async () => {
    // This is the critical test: simulate two concurrent requests
    // Both calling updateStreak at the same time for same student/quiz

    const concurrentQuizId = 'concurrent-test-quiz-' + Math.random().toString(36).substr(2, 9);

    // Create test quiz
    await supabase.from('quizzes').insert({
      id: concurrentQuizId,
      title: 'Concurrent Test Quiz',
      description: 'Test quiz for concurrent race condition',
      pass_rate: 75,
    });

    // First submission (establishes baseline)
    const first = await updateStreak(testStudentId, concurrentQuizId, timezone, supabase);
    expect(first.currentStreak).toBe(1);

    // Set up for next day test
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    await supabase
      .from('student_streaks')
      .update({ last_quiz_date: yesterdayStr })
      .eq('student_id', testStudentId)
      .eq('quiz_id', concurrentQuizId);

    // Simulate two concurrent updates (would both read streak=1 without locking)
    // With FOR UPDATE locking, they should serialize:
    // Request A: lock → read 1 → calculate 2 → write 2, unlock
    // Request B: (waits for lock) → lock → read 2 → calculate 3 → write 3, unlock
    const [concurrent1, concurrent2] = await Promise.all([
      updateStreak(testStudentId, concurrentQuizId, timezone, supabase),
      updateStreak(testStudentId, concurrentQuizId, timezone, supabase),
    ]);

    // Both should see they already took quiz today, so streakContinued = true
    // and current streak should be 2 (no further increment on same day)
    expect(concurrent1.currentStreak).toBe(2);
    expect(concurrent2.currentStreak).toBe(2);
    expect(concurrent1.streakContinued).toBe(true);
    expect(concurrent2.streakContinued).toBe(true);

    // Verify in database
    const { data } = await supabase
      .from('student_streaks')
      .select('current_streak')
      .eq('student_id', testStudentId)
      .eq('quiz_id', concurrentQuizId)
      .single();

    expect(data?.current_streak).toBe(2);

    // Cleanup
    await supabase.from('quizzes').delete().eq('id', concurrentQuizId);
  });

  it('should allow concurrent updates to different quizzes independently', async () => {
    const quiz1 = 'quiz1-' + Math.random().toString(36).substr(2, 9);
    const quiz2 = 'quiz2-' + Math.random().toString(36).substr(2, 9);

    // Create test quizzes
    await supabase.from('quizzes').insert([
      { id: quiz1, title: 'Quiz 1', pass_rate: 75 },
      { id: quiz2, title: 'Quiz 2', pass_rate: 75 },
    ]);

    // Concurrent updates to different quizzes should work independently
    const [result1, result2] = await Promise.all([
      updateStreak(testStudentId, quiz1, timezone, supabase),
      updateStreak(testStudentId, quiz2, timezone, supabase),
    ]);

    expect(result1.currentStreak).toBe(1);
    expect(result2.currentStreak).toBe(1);

    // Verify both were created independently
    const { data: streak1 } = await supabase
      .from('student_streaks')
      .select('current_streak')
      .eq('student_id', testStudentId)
      .eq('quiz_id', quiz1)
      .single();

    const { data: streak2 } = await supabase
      .from('student_streaks')
      .select('current_streak')
      .eq('student_id', testStudentId)
      .eq('quiz_id', quiz2)
      .single();

    expect(streak1?.current_streak).toBe(1);
    expect(streak2?.current_streak).toBe(1);

    // Cleanup
    await supabase.from('quizzes').delete().in('id', [quiz1, quiz2]);
  });

  it('should prevent double-increment on same-day re-submission', async () => {
    const sameDay = 'same-day-test-' + Math.random().toString(36).substr(2, 9);

    await supabase.from('quizzes').insert({
      id: sameDay,
      title: 'Same Day Test',
      pass_rate: 75,
    });

    // First submission of the day
    const first = await updateStreak(testStudentId, sameDay, timezone, supabase);
    expect(first.currentStreak).toBe(1);
    expect(first.streakContinued).toBe(false);

    // Second submission same day (should not increment)
    const second = await updateStreak(testStudentId, sameDay, timezone, supabase);
    expect(second.currentStreak).toBe(1);
    expect(second.streakContinued).toBe(true);

    // Third submission same day (should still not increment)
    const third = await updateStreak(testStudentId, sameDay, timezone, supabase);
    expect(third.currentStreak).toBe(1);
    expect(third.streakContinued).toBe(true);

    // Verify database shows single increment only
    const { data } = await supabase
      .from('student_streaks')
      .select('current_streak')
      .eq('student_id', testStudentId)
      .eq('quiz_id', sameDay)
      .single();

    expect(data?.current_streak).toBe(1);

    await supabase.from('quizzes').delete().eq('id', sameDay);
  });

  it('should award 7-day streak badge atomically', async () => {
    const sevenDayTest = 'seven-day-test-' + Math.random().toString(36).substr(2, 9);

    await supabase.from('quizzes').insert({
      id: sevenDayTest,
      title: 'Seven Day Test',
      pass_rate: 75,
    });

    // Simulate 7 consecutive days of quiz completion
    let currentDate = new Date();
    for (let day = 1; day <= 7; day++) {
      // Set the date in DB
      const dateStr = currentDate.toISOString().split('T')[0];

      if (day === 1) {
        // First entry
        const result = await updateStreak(testStudentId, sevenDayTest, timezone, supabase);
        expect(result.currentStreak).toBe(1);
      } else {
        // Update to previous day in DB, then update streak
        const previousDate = new Date(currentDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const previousStr = previousDate.toISOString().split('T')[0];

        await supabase
          .from('student_streaks')
          .update({ last_quiz_date: previousStr })
          .eq('student_id', testStudentId)
          .eq('quiz_id', sevenDayTest);

        const result = await updateStreak(testStudentId, sevenDayTest, timezone, supabase);
        expect(result.currentStreak).toBe(day);

        if (day === 7) {
          expect(result.badge7DayAwarded).toBe(true);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Verify badge was awarded
    const { data: badges } = await supabase
      .from('student_badges')
      .select('badge_id')
      .eq('student_id', testStudentId)
      .eq('badge_id', 'streaker');

    expect(badges?.length).toBeGreaterThan(0);

    await supabase.from('quizzes').delete().eq('id', sevenDayTest);
  });
});

/**
 * INTEGRATION TEST: Load Test with Many Concurrent Submissions
 *
 * Run this test to stress-test the concurrent update handling
 * Uncomment the 'only' to run this test in isolation
 */
describe.skip('Streak Race Condition - Load Test', () => {
  const loadTestStudentId = 'load-test-student-' + Math.random().toString(36).substr(2, 9);
  const loadTestQuizId = 'load-test-quiz-' + Math.random().toString(36).substr(2, 9);

  beforeAll(async () => {
    await supabase.from('students').insert({
      id: loadTestStudentId,
      email: `load-test-${Math.random()}@test.local`,
    });

    await supabase.from('quizzes').insert({
      id: loadTestQuizId,
      title: 'Load Test Quiz',
      pass_rate: 75,
    });
  });

  afterAll(async () => {
    await supabase
      .from('student_streaks')
      .delete()
      .eq('student_id', loadTestStudentId);

    await supabase.from('students').delete().eq('id', loadTestStudentId);
    await supabase.from('quizzes').delete().eq('id', loadTestQuizId);
  });

  it('should handle 100 concurrent streak updates without data corruption', async () => {
    const concurrentRequests = Array(100)
      .fill(0)
      .map(() =>
        updateStreak(loadTestStudentId, loadTestQuizId, 'America/New_York', supabase)
      );

    const results = await Promise.all(concurrentRequests);

    // All requests on same day should return same streak value (no increment)
    expect(results.every((r) => r.currentStreak === 1)).toBe(true);

    // Verify database integrity
    const { data } = await supabase
      .from('student_streaks')
      .select('current_streak, updated_at')
      .eq('student_id', loadTestStudentId)
      .eq('quiz_id', loadTestQuizId)
      .single();

    expect(data?.current_streak).toBe(1);
  }, 30000); // 30 second timeout for load test
});
