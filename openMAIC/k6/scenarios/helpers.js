/**
 * K6 Helper Functions for DailyAgile Load Testing
 *
 * Provides utility functions for:
 * - Getting CSRF tokens
 * - Setting up test cookies
 * - Creating valid JWT tokens
 * - Handling auth headers
 */

import http from 'k6/http';
import encoding from 'k6/encoding';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

/**
 * Get CSRF token by making a request to a page that sets it
 * In development, we can fetch from the API base URL
 */
export function getCSRFToken() {
  const res = http.get(`${BASE_URL}/`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  // Extract CSRF token from Set-Cookie header
  const cookies = res.headers['Set-Cookie'] || [];
  for (const cookie of cookies) {
    if (cookie.includes('csrf-token')) {
      const match = cookie.match(/csrf-token=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
  }

  // If we can't get CSRF token, use a default (for development)
  return 'development-csrf-token-' + Math.random().toString(36).substring(7);
}

/**
 * Create a test JWT token for a student
 * In development, you might accept mock tokens
 * In production, you would need proper JWT signing
 */
export function createTestStudentToken(studentId) {
  // For development testing, we use test cookies instead of JWT
  // In real scenarios, you would sign a proper JWT here
  return `test-token-student-${studentId}-${Date.now()}`;
}

/**
 * Create headers with CSRF protection for API requests
 */
export function createAPIHeaders(token, csrfToken) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken,
    'User-Agent': 'k6-load-test/1.0',
  };
}

/**
 * Setup test environment - returns headers and cookies for authenticated requests
 */
export function setupTestSession(studentId) {
  const authToken = createTestStudentToken(studentId);
  const csrfToken = getCSRFToken();

  return {
    token: authToken,
    csrfToken: csrfToken,
    headers: createAPIHeaders(authToken, csrfToken),
  };
}

/**
 * Generate realistic quiz answer data
 */
export function generateQuizAnswer() {
  const answers = ['A', 'B', 'C', 'D', 'E'];
  const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
  const timeTaken = Math.floor(Math.random() * 180) + 5; // 5-185 seconds

  return {
    answer: randomAnswer,
    timeTaken: timeTaken,
  };
}

/**
 * Generate realistic short answer text
 */
export function generateShortAnswer(questionIndex) {
  const answers = [
    'Machine learning is a subset of artificial intelligence that enables systems to learn from data without being explicitly programmed.',
    'Neural networks are computational models inspired by biological neural networks that learn through experience.',
    'Deep learning uses multiple layers of neural networks to learn hierarchical representations of data.',
    'Supervised learning uses labeled training data to predict outputs based on input features.',
    'Unsupervised learning discovers patterns in unlabeled data without predefined outcomes.',
    'Reinforcement learning enables agents to learn through interaction and reward signals.',
    'Data preprocessing is crucial for improving model accuracy and training efficiency.',
    'Cross-validation helps estimate model performance on unseen data more reliably.',
  ];

  return answers[questionIndex % answers.length];
}

/**
 * Handle errors and log them for analysis
 */
export function handleResponseError(response, context) {
  if (response.status >= 400) {
    console.log(
      `Error in ${context}: Status ${response.status} - ${response.statusText}`,
    );
    if (response.body && response.body.length < 500) {
      console.log(`Response: ${response.body}`);
    }
  }
  return response;
}
