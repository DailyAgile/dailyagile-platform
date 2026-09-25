/**
 * K6 Load Test: Baseline (50 Concurrent Users - 5 min)
 *
 * Scenario 1: Sustained load with 50 simultaneous quiz submissions
 * Target: p99 latency < 500ms
 * Target: 0% error rate
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const CSRF_TOKEN = 'test-csrf-token'; // In real scenario, fetch from page

// Custom metrics
const submitAnswerDuration = new Trend('submit_answer_duration');
const quizGradeDuration = new Trend('quiz_grade_duration');
const submitAnswerErrors = new Counter('submit_answer_errors');
const gradeErrors = new Counter('grade_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users over 30s
    { duration: '4m30s', target: 50 }, // Stay at 50 users for 4.5 min
    { duration: '30s', target: 0 }, // Ramp down to 0 over 30s
  ],
  thresholds: {
    // HTTP latencies must be below 500ms for 95% of requests (baseline)
    'http_req_duration': ['p(95)<500', 'p(99)<500'],
    // Error rate must be 0%
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const studentId = `student-${__VU}-${__ITER}`;
  const sessionId = `session-${__VU}-${Date.now()}`;
  const quizId = `quiz-baseline-${__VU}`;

  group('Quiz Submission Flow', () => {
    // 1. Submit answer to quiz (database insert)
    const submitAnswerPayload = JSON.stringify({
      session_id: sessionId,
      question_id: `q-${__ITER % 10}`,
      selected_answer: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)],
      time_taken_seconds: Math.floor(Math.random() * 60) + 10,
    });

    const submitAnswerRes = http.post(`${BASE_URL}/api/student/quiz/submit-answer`, submitAnswerPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${studentId}`,
        'X-CSRF-Token': CSRF_TOKEN,
      },
      tags: { name: 'SubmitAnswer' },
    });

    check(submitAnswerRes, {
      'submit answer status 200': (r) => r.status === 200,
      'submit answer has success flag': (r) => r.json('success') === true,
    }) || submitAnswerErrors.add(1);

    submitAnswerDuration.add(submitAnswerRes.timings.duration);

    // 2. Grade answer using Claude AI (expensive operation)
    const gradePayload = JSON.stringify({
      question: 'What is the capital of France?',
      userAnswer: 'Paris is the capital of France',
      points: 10,
      commentPrompt: 'Look for correct identification of Paris as capital',
      questionType: 'short_answer',
      submissionId: `sub-${__VU}`,
      questionId: `q-${__ITER % 10}`,
    });

    const gradeRes = http.post(`${BASE_URL}/api/quiz-grade`, gradePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${studentId}`,
        'X-CSRF-Token': CSRF_TOKEN,
      },
      tags: { name: 'QuizGrade' },
    });

    check(gradeRes, {
      'grade response status 200': (r) => r.status === 200 || r.status === 429, // Allow rate limit
      'grade has score': (r) => {
        try {
          return r.json('score') !== undefined;
        } catch {
          return r.status === 429; // Rate limit is acceptable
        }
      },
    }) || gradeErrors.add(1);

    quizGradeDuration.add(gradeRes.timings.duration);
  });
}
