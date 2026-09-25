/**
 * K6 Load Test: Spike (500 Concurrent Users - 2 min)
 *
 * Scenario 3: Extreme spike load to test graceful degradation
 * Target: Graceful degradation (queue requests, no 503s)
 * Target: < 5% error rate
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
const rateLimitHits = new Counter('rate_limit_hits');

export const options = {
  stages: [
    { duration: '30s', target: 500 }, // Spike to 500 users over 30s
    { duration: '90s', target: 500 }, // Stay at 500 users for 1.5m
    { duration: '30s', target: 0 }, // Ramp down over 30s
  ],
  thresholds: {
    // At 500 VUs, allow higher latency but measure it
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    // Allow up to 5% error rate (rate limiting)
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  const studentId = `student-${__VU}-${__ITER}`;
  const sessionId = `session-${__VU}-${Date.now()}`;

  group('Quiz Submission Flow - Spike', () => {
    // 1. Submit answer
    const submitAnswerPayload = JSON.stringify({
      session_id: sessionId,
      question_id: `q-${__ITER % 30}`,
      selected_answer: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)],
      time_taken_seconds: Math.floor(Math.random() * 180),
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
      'submit answer success': (r) => {
        try {
          return r.json('success') === true;
        } catch {
          return false;
        }
      },
    }) || submitAnswerErrors.add(1);

    submitAnswerDuration.add(submitAnswerRes.timings.duration);

    // 2. Grade with Claude AI - expect many rate limits
    const gradePayload = JSON.stringify({
      question: 'Explain the concept of machine learning and its applications',
      userAnswer: 'Machine learning is a subset of AI that enables systems to learn from data',
      points: 25,
      questionType: 'essay',
      submissionId: `sub-${__VU}`,
      questionId: `q-${__ITER % 30}`,
    });

    const gradeRes = http.post(`${BASE_URL}/api/quiz-grade`, gradePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${studentId}`,
        'X-CSRF-Token': CSRF_TOKEN,
      },
      tags: { name: 'QuizGrade' },
    });

    if (gradeRes.status === 429) {
      rateLimitHits.add(1);
    }

    check(gradeRes, {
      'grade response not 503': (r) => r.status !== 503,
      'grade response 200 or 429': (r) => r.status === 200 || r.status === 429,
      'grade has score or is rate limited': (r) => {
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
