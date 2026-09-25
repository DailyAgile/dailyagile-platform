import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

describe('Question Analytics API (Feature 3.4)', () => {
  let instructorEmail: string;
  let authToken: string;
  let quizId: string;
  let questionIds: string[] = [];
  let sessionId: string;
  let studentId: string;

  beforeAll(async () => {
    // Setup: Create test instructor
    instructorEmail = `test-instructor-analytics-${Date.now()}@example.com`;

    // Create instructor in auth
    const { data: authData } = await supabase.auth.admin.createUser({
      email: instructorEmail,
      password: 'TestPassword123!',
      user_metadata: { role: 'instructor' },
    });

    if (!authData.user) {
      throw new Error('Failed to create test instructor');
    }

    // Get auth token
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: instructorEmail,
      password: 'TestPassword123!',
    });

    if (!signInData.session?.access_token) {
      throw new Error('Failed to get auth token');
    }

    authToken = signInData.session.access_token;

    // Create test quiz
    const { data: quizData } = await supabase
      .from('quizzes')
      .insert([
        {
          title: 'Analytics Test Quiz',
          instructor_id: instructorEmail,
          classroom_id: 'test-classroom',
          is_active: true,
          total_questions: 3,
        },
      ])
      .select('id');

    if (!quizData || !quizData[0]) {
      throw new Error('Failed to create quiz');
    }

    quizId = quizData[0].id;

    // Create test questions
    const questionTexts = [
      'What is 2+2?',
      'What is the capital of France?',
      'What is the largest planet?',
    ];

    for (let i = 0; i < questionTexts.length; i++) {
      const { data: qData } = await supabase
        .from('quiz_questions')
        .insert([
          {
            quiz_id: quizId,
            question_text: questionTexts[i],
            question_order: i + 1,
            option_a: i === 0 ? '4' : i === 1 ? 'London' : 'Jupiter',
            option_b: i === 0 ? '3' : i === 1 ? 'Paris' : 'Saturn',
            option_c: i === 0 ? '5' : i === 1 ? 'Berlin' : 'Neptune',
            option_d: i === 0 ? '2' : i === 1 ? 'Madrid' : 'Earth',
            correct_answer: i === 0 ? 'A' : i === 1 ? 'B' : 'A',
          },
        ])
        .select('id');

      if (qData && qData[0]) {
        questionIds.push(qData[0].id);
      }
    }

    // Create test student
    const { data: studentData } = await supabase
      .from('students')
      .insert([{ email: `student-analytics-${Date.now()}@example.com`, name: 'Test Student' }])
      .select('id');

    if (studentData && studentData[0]) {
      studentId = studentData[0].id;
    }

    // Create test quiz session
    const { data: sessionData } = await supabase
      .from('quiz_sessions')
      .insert([
        {
          quiz_id: quizId,
          student_id: studentId,
          instructor_id: instructorEmail,
          classroom_id: 'test-classroom',
          status: 'completed',
          score: 66,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ])
      .select('id');

    if (sessionData && sessionData[0]) {
      sessionId = sessionData[0].id;
    }

    // Create responses for the session
    const responses = [
      { question_id: questionIds[0], is_correct: true, time_taken_seconds: 30 }, // Easy (1/1 correct)
      { question_id: questionIds[1], is_correct: true, time_taken_seconds: 45 }, // Medium (1/1 correct)
      { question_id: questionIds[2], is_correct: false, time_taken_seconds: 60 }, // Hard (0/1 correct)
    ];

    for (const response of responses) {
      await supabase.from('quiz_responses').insert([
        {
          session_id: sessionId,
          question_id: response.question_id,
          selected_answer: response.is_correct ? 'A' : 'B',
          is_correct: response.is_correct,
          time_taken_seconds: response.time_taken_seconds,
        },
      ]);
    }
  });

  afterAll(async () => {
    // Cleanup
    if (sessionId) {
      await supabase.from('quiz_responses').delete().eq('session_id', sessionId);
      await supabase.from('quiz_sessions').delete().eq('id', sessionId);
    }

    if (quizId) {
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
      await supabase.from('quizzes').delete().eq('id', quizId);
    }

    if (studentId) {
      await supabase.from('students').delete().eq('id', studentId);
    }

    // Delete instructor
    await supabase.auth.admin.deleteUser(instructorEmail);
  });

  it('should return question analytics for quiz', async () => {
    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data?.quiz_id).toBe(quizId);
    expect(data.data?.all_questions).toBeDefined();
    expect(data.data?.all_questions?.length).toBeGreaterThan(0);
  });

  it('should calculate percentage correct for each question', async () => {
    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();
    const allQuestions = data.data?.all_questions || [];

    expect(allQuestions.length).toBe(3);

    // First question should be 100% correct (easy)
    const q1 = allQuestions.find((q: any) => q.question_id === questionIds[0]);
    expect(q1?.percentage_correct).toBe(100);
    expect(q1?.difficulty).toBe('easy');

    // Third question should be 0% correct (hard)
    const q3 = allQuestions.find((q: any) => q.question_id === questionIds[2]);
    expect(q3?.percentage_correct).toBe(0);
    expect(q3?.difficulty).toBe('hard');
  });

  it('should include average time spent per question', async () => {
    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();
    const allQuestions = data.data?.all_questions || [];

    expect(allQuestions.length).toBeGreaterThan(0);
    expect(allQuestions[0]).toHaveProperty('average_time_seconds');
    expect(typeof allQuestions[0].average_time_seconds).toBe('number');
  });

  it('should identify hardest questions', async () => {
    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();
    expect(data.data?.hardest_questions).toBeDefined();
    expect(data.data?.hardest_questions?.length).toBeGreaterThan(0);

    // Verify hardest questions are sorted by lowest percentage correct
    const hardest = data.data?.hardest_questions || [];
    for (let i = 1; i < hardest.length; i++) {
      expect(hardest[i].percentage_correct).toBeLessThanOrEqual(
        hardest[i - 1].percentage_correct
      );
    }
  });

  it('should identify easiest questions', async () => {
    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();
    expect(data.data?.easiest_questions).toBeDefined();

    // Verify easiest questions are sorted by highest percentage correct
    const easiest = data.data?.easiest_questions || [];
    for (let i = 1; i < easiest.length; i++) {
      expect(easiest[i].percentage_correct).toBeLessThanOrEqual(
        easiest[i - 1].percentage_correct
      );
    }
  });

  it('should require quiz_id parameter', async () => {
    const response = await fetch('/api/instructor/quiz/question-analytics', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(400);
  });

  it('should require authorization', async () => {
    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
      }
    );

    expect(response.status).toBe(401);
  });

  it('should reject access to other instructor quizzes', async () => {
    // Create another instructor
    const otherInstructor = `other-instructor-${Date.now()}@example.com`;
    const { data: authData } = await supabase.auth.admin.createUser({
      email: otherInstructor,
      password: 'TestPassword123!',
      user_metadata: { role: 'instructor' },
    });

    if (!authData.user) {
      throw new Error('Failed to create other instructor');
    }

    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: otherInstructor,
      password: 'TestPassword123!',
    });

    const otherToken = signInData.session?.access_token;

    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${otherToken}`,
        },
      }
    );

    expect(response.status).toBe(404);

    // Cleanup
    await supabase.auth.admin.deleteUser(otherInstructor);
  });

  it('should include overall quiz statistics', async () => {
    const response = await fetch(
      `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();
    expect(data.data?.quiz_title).toBeDefined();
    expect(data.data?.total_students).toBeDefined();
    expect(data.data?.total_attempts).toBeDefined();
    expect(data.data?.average_score).toBeDefined();
  });
});
