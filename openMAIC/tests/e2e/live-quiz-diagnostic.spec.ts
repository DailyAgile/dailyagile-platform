/**
 * Diagnostic test to verify server connectivity and basic API responses
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Live Quiz Diagnostic', () => {
  test('Server is accessible', async ({ page }) => {
    console.log(`\n🔍 Checking if server is accessible at ${BASE_URL}`);

    try {
      const response = await page.goto(`${BASE_URL}/api/health`, { waitUntil: 'networkidle' });
      console.log(`Response status: ${response?.status()}`);

      // Try to get any API response
      if (!response?.ok()) {
        console.log('Health check endpoint not available, trying home page...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        console.log(`✅ Server is accessible`);
      } else {
        console.log(`✅ Server health check passed`);
      }
    } catch (err) {
      console.error(`❌ Server not accessible:`, err);
      expect(false).toBe(true); // Force failure with clear message
    }
  });

  test('API endpoint responds to GET', async ({ page }) => {
    console.log(`\n🔍 Testing GET request to API`);

    try {
      const response = await page.request.get(`${BASE_URL}/api/quizzes`);
      console.log(`GET /api/quizzes status: ${response.status()}`);

      if (response.status() < 500) {
        console.log(`✅ API endpoint responding (status ${response.status()})`);
      } else {
        console.log(`⚠️  Server error (status ${response.status()})`);
      }
    } catch (err) {
      console.error(`❌ API GET failed:`, err);
    }
  });

  test('POST to /api/live-quiz/start without auth (should be 401)', async ({ page }) => {
    console.log(`\n🔍 Testing POST to /api/live-quiz/start without auth`);

    try {
      const response = await page.request.post(`${BASE_URL}/api/live-quiz/start`, {
        data: { quizId: 'test-quiz' },
      });

      console.log(`POST /api/live-quiz/start status: ${response.status()}`);
      const data = await response.json().catch(() => ({}));
      console.log(`Response:`, data);

      if (response.status() === 401) {
        console.log(`✅ Correctly rejected without auth (401)`);
      } else if (response.status() < 500) {
        console.log(`⚠️  Got status ${response.status()} (expected 401)`);
      } else {
        console.log(`❌ Server error (status ${response.status()})`);
      }
    } catch (err) {
      console.error(`❌ Request failed:`, err);
    }
  });

  test('POST to /api/live-quiz/start with instructor session cookie', async ({ page }) => {
    console.log(`\n🔍 Testing POST to /api/live-quiz/start WITH auth`);

    try {
      // Set test instructor session cookie
      const sessionData = {
        id: 'instructor-test-' + Date.now(),
        email: 'test.instructor@dailyagile.com',
        role: 'instructor',
        verified: true,
      };
      const sessionCookie = JSON.stringify(sessionData);

      console.log(`Setting instructor-session cookie...`);
      await page.context().addCookies([{
        name: 'instructor-session',
        value: sessionCookie,
        url: BASE_URL,
      }]);

      const response = await page.request.post(`${BASE_URL}/api/live-quiz/start`, {
        data: { quizId: 'test-quiz-' + Date.now() },
      });

      console.log(`POST /api/live-quiz/start status: ${response.status()}`);
      const data = await response.json().catch(() => ({}));
      console.log(`Response:`, JSON.stringify(data, null, 2));

      if (response.ok()) {
        console.log(`✅ Session started successfully`);
        if (data.data?.joinCode) {
          console.log(`   Join Code: ${data.data.joinCode}`);
          console.log(`   Session ID: ${data.data.sessionId}`);
        }
      } else if (response.status() === 401) {
        console.log(`❌ Still got 401 - auth cookie not working`);
      } else if (response.status() < 500) {
        console.log(`⚠️  Got status ${response.status()}`);
      } else {
        console.log(`❌ Server error (status ${response.status()})`);
      }
    } catch (err) {
      console.error(`❌ Request failed:`, err);
    }
  });
});
