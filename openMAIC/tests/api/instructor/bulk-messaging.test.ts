import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

describe('Bulk Messaging API (Feature 3.3)', () => {
  let instructorEmail: string;
  let authToken: string;
  let studentIds: string[] = [];
  let quizId: string;

  beforeAll(async () => {
    // Setup: Create test instructor
    instructorEmail = `test-instructor-${Date.now()}@example.com`;

    // Create instructor in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: instructorEmail,
      password: 'TestPassword123!',
      user_metadata: { role: 'instructor' },
    });

    if (authError || !authData.user) {
      console.error('Failed to create test instructor:', authError);
      throw new Error('Setup failed');
    }

    // Get auth token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: instructorEmail,
      password: 'TestPassword123!',
    });

    if (signInError || !signInData.session?.access_token) {
      throw new Error('Failed to get auth token');
    }

    authToken = signInData.session.access_token;

    // Create test students
    for (let i = 0; i < 3; i++) {
      const studentEmail = `student-${Date.now()}-${i}@example.com`;
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([{ email: studentEmail, name: `Test Student ${i}` }])
        .select('id');

      if (!studentError && studentData && studentData[0]) {
        studentIds.push(studentData[0].id);
      }
    }

    // Create test quiz
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .insert([
        {
          title: 'Test Quiz for Messaging',
          instructor_id: instructorEmail,
          classroom_id: 'test-classroom',
          is_active: true,
        },
      ])
      .select('id');

    if (quizData && quizData[0]) {
      quizId = quizData[0].id;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await supabase
      .from('message_recipients')
      .delete()
      .in('student_id', studentIds);

    await supabase
      .from('instructor_messages')
      .delete()
      .eq('instructor_id', instructorEmail);

    for (const studentId of studentIds) {
      await supabase.from('students').delete().eq('id', studentId);
    }

    if (quizId) {
      await supabase.from('quizzes').delete().eq('id', quizId);
    }

    // Delete instructor
    await supabase.auth.admin.deleteUser(instructorEmail);
  });

  it('should send message to individual student', async () => {
    const response = await fetch('/api/instructor/send-bulk-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'general',
        subject: 'Test Message',
        body: 'This is a test message',
        recipient_type: 'individual',
        recipient_ids: [studentIds[0]],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data?.recipient_count).toBe(1);
  });

  it('should send message to multiple students', async () => {
    const response = await fetch('/api/instructor/send-bulk-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'general',
        subject: 'Bulk Message',
        body: 'This is a message to multiple students',
        recipient_type: 'individual',
        recipient_ids: studentIds,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data?.recipient_count).toBe(studentIds.length);
  });

  it('should send reminder message with quiz context', async () => {
    const response = await fetch('/api/instructor/send-bulk-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'reminder',
        subject: 'Quiz Reminder',
        body: 'Please complete the quiz by Friday',
        recipient_type: 'individual',
        recipient_ids: [studentIds[0]],
        quiz_id: quizId,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should reject request without authorization', async () => {
    const response = await fetch('/api/instructor/send-bulk-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'general',
        subject: 'Test',
        body: 'Test message',
        recipient_type: 'individual',
        recipient_ids: [studentIds[0]],
      }),
    });

    expect(response.status).toBe(401);
  });

  it('should validate required fields', async () => {
    const response = await fetch('/api/instructor/send-bulk-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'general',
        subject: 'Test',
        // Missing body
        recipient_type: 'individual',
        recipient_ids: [studentIds[0]],
      }),
    });

    expect(response.status).toBe(400);
  });

  it('should reject invalid message type', async () => {
    const response = await fetch('/api/instructor/send-bulk-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'invalid',
        subject: 'Test',
        body: 'Test message',
        recipient_type: 'individual',
        recipient_ids: [studentIds[0]],
      }),
    });

    expect(response.status).toBe(400);
  });

  it('should list instructor messages', async () => {
    // First send a message
    await fetch('/api/instructor/send-bulk-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'general',
        subject: 'List Test',
        body: 'Message for listing test',
        recipient_type: 'individual',
        recipient_ids: [studentIds[0]],
      }),
    });

    // Then list messages
    const response = await fetch('/api/instructor/messages', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data?.messages)).toBe(true);
    expect(data.data?.pagination).toBeDefined();
  });

  it('should support pagination', async () => {
    const response = await fetch('/api/instructor/messages?page=1&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data?.pagination?.page).toBe(1);
    expect(data.data?.pagination?.limit).toBe(10);
  });
});
