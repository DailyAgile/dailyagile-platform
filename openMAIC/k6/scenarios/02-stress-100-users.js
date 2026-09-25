/**
 * K6 Load Test: Stress (100 Concurrent Users - 5 min)
 *
 * Scenario 2: Increased load with 100 simultaneous quiz submissions
 * Target: p99 latency < 2s
 * Target: < 1% error rate
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const CSRF_TOKEN = 'test-csrf-token';

// Custom metrics
const submitAnswerDuration = new Trend('submit_answer_duration');
const quizGradeDuration = new Trend('quiz_grade_duration');
const submitAnswerErrors = new Counter('submit_answer_errors');
const gradeErrors = new Counter('grade_errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up to 100 users over 1m
    { duration: '3m', target: 100 }, // Stay at 100 users for 3m
    { duration: '1m', target: 0 }, // Ramp down to 0 over 1m
  ],
  thresholds: {
    // At 100 VUs, allow p99 latency up to 2 seconds
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    // Error rate must stay below 1%
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const studentId = `student-${__VU}-${__ITER}`;
  const sessionId = `session-${__VU}-${Date.now()}`;
  const quizId = `quiz-stress-${__VU}`;

  group('Quiz Submission Flow - Stress', () => {
    // 1. Submit answer
    const submitAnswerPayload = JSON.stringify({
      session_id: sessionId,
      question_id: `q-${__ITER % 20}`,
      selected_answer: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)],
      time_taken_seconds: Math.floor(Math.random() * 120) + 5,
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

    // 2. Grade with Claude AI
    const questions = [
      'What is machine learning?',
      'Explain neural networks',
      'What is deep learning?',
      'Define supervised learning',
      'What is clustering?',
    ];

    const gradePayload = JSON.stringify({
      question: questions[__ITER % questions.length],
      userAnswer: 'This is a comprehensive answer to the question',
      points: 20,
      questionType: 'short_answer',
      submissionId: `sub-${__VU}`,
      questionId: `q-${__ITER % 20}`,
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
      'grade response status 200': (r) => r.status === 200 || r.status === 429,
      'grade has score': (r) => {
        try {
          return r.json('score') !== undefined;
        } catch {
          return r.status === 429;
        }
      },
    }) || gradeErrors.add(1);

    quizGradeDuration.add(gradeRes.timings.duration);
  });
}
