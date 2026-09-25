/**
 * K6 Load Test: Sustained Grade Endpoint (10 min, 50 VUs)
 *
 * Scenario 4: Hammering just the /api/quiz-grade endpoint
 * Target: p99 latency < 1s (Claude grading adds latency)
 * Target: Rate limiting kicks in at 10 req/min per IP
 * Expected: 429 errors after limit exceeded per IP
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const CSRF_TOKEN = 'test-csrf-token';

// Custom metrics for detailed analysis
const gradeDuration = new Trend('grade_duration');
const gradeErrors = new Counter('grade_errors');
const rateLimitCount = new Counter('rate_limits_hit');
const successfulGrades = new Counter('successful_grades');

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users over 1m
    { duration: '8m', target: 50 }, // Sustain 50 users for 8m
    { duration: '1m', target: 0 }, // Ramp down over 1m
  ],
  thresholds: {
    // Grade endpoint with Claude should be < 1s for p99
    'http_req_duration': ['p(95)<1000', 'p(99)<1000'],
    // Expect some errors due to rate limiting
    'http_req_failed': ['rate<0.15'], // Allow 15% failure rate (rate limits)
  },
};

const GRADING_QUESTIONS = [
  {
    question: 'What is machine learning?',
    answer: 'Machine learning is a branch of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
    points: 10,
  },
  {
    question: 'Explain the difference between supervised and unsupervised learning.',
    answer: 'Supervised learning uses labeled training data and predicts outputs based on input features. Unsupervised learning finds patterns in unlabeled data without predefined outputs.',
    points: 15,
  },
  {
    question: 'What is a neural network?',
    answer: 'A neural network is a computational model inspired by biological neural networks that consists of interconnected nodes (neurons) organized in layers.',
    points: 12,
  },
  {
    question: 'Define deep learning.',
    answer: 'Deep learning is a subset of machine learning using neural networks with multiple layers to learn hierarchical representations of data.',
    points: 15,
  },
  {
    question: 'What is overfitting in machine learning?',
    answer: 'Overfitting occurs when a model learns the training data too well, including its noise, and performs poorly on new unseen data.',
    points: 10,
  },
  {
    question: 'Explain cross-validation.',
    answer: 'Cross-validation is a technique that divides the dataset into subsets, training on some subsets and validating on others to better estimate model performance.',
    points: 12,
  },
  {
    question: 'What is a gradient descent?',
    answer: 'Gradient descent is an optimization algorithm that iteratively adjusts model parameters to minimize the loss function by moving in the direction of steepest descent.',
    points: 14,
  },
  {
    question: 'Define regularization in machine learning.',
    answer: 'Regularization is a technique that adds a penalty term to the loss function to prevent overfitting by constraining model complexity.',
    points: 12,
  },
];

export default function () {
  const studentId = `student-${__VU}`;
  const clientIp = `client-${Math.floor(__VU / 10)}`; // Group VUs by client IP

  group('Quiz Grade Endpoint Stress', () => {
    const questionData = GRADING_QUESTIONS[__ITER % GRADING_QUESTIONS.length];

    const gradePayload = JSON.stringify({
      question: questionData.question,
      userAnswer: questionData.answer,
      points: questionData.points,
      commentPrompt: 'Evaluate comprehensiveness and accuracy',
      questionType: 'short_answer',
      submissionId: `sub-${__VU}-${__ITER}`,
      questionId: `q-${__ITER % GRADING_QUESTIONS.length}`,
      language: 'en',
    });

    const gradeRes = http.post(`${BASE_URL}/api/quiz-grade`, gradePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${studentId}`,
        'X-CSRF-Token': CSRF_TOKEN,
        'X-Forwarded-For': clientIp, // Simulate client IP for rate limiting
      },
      tags: { name: 'QuizGrade' },
    });

    // Track rate limit hits
    if (gradeRes.status === 429) {
      rateLimitCount.add(1);
      check(gradeRes, {
        'rate limit response is 429': (r) => r.status === 429,
        'rate limit includes retry-after': (r) => r.headers['Retry-After'] !== undefined,
      });
    } else if (gradeRes.status === 200) {
      successfulGrades.add(1);
      check(gradeRes, {
        'grade is successful': (r) => r.status === 200,
        'grade has score field': (r) => {
          try {
            return r.json('score') !== undefined;
          } catch {
            return false;
          }
        },
        'grade score is valid number': (r) => {
          try {
            const score = r.json('score');
            return typeof score === 'number' && score >= 0;
          } catch {
            return false;
          }
        },
      });
    } else {
      gradeErrors.add(1);
      check(gradeRes, {
        'grade response is not 500': (r) => r.status !== 500,
        'grade response is not 503': (r) => r.status !== 503,
      });
    }

    gradeDuration.add(gradeRes.timings.duration);

    // Rate limit test: sleep between requests to stay within limit
    // In real scenario, clients would respect Retry-After header
    if (gradeRes.status === 429) {
      // If rate limited, wait before next attempt
      // This simulates proper client behavior
      const retryAfter = parseInt(gradeRes.headers['Retry-After'] || '60', 10);
      // Don't actually sleep in load test, just add to context
    }
  });
}
