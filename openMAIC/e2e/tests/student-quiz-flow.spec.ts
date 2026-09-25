/**
 * Student Quiz Flow E2E Test
 * Complete workflow: login → view assignments → start quiz → submit answers → see results
 *
 * Tests the entire student experience from start to finish
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_STUDENT_EMAIL = 'test-student-e2e@example.com';
const TEST_STUDENT_PASSWORD = 'SecurePass123!';

test.describe('Student Quiz Flow', () => {
  let studentId: string;
  let authToken: string;

  test.beforeAll(async () => {
    // Note: In real test, would use API to create test account
    // This is a placeholder for the flow
  });

  test('complete quiz workflow: signup → login → take quiz → view results', async ({ page }) => {
    // Step 1: Navigate to signup page
    await page.goto(`${BASE_URL}/signup`);
    await expect(page).toHaveTitle(/Sign Up/i);

    // Step 2: Fill signup form
    await page.fill('input[name="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[name="password"]', TEST_STUDENT_PASSWORD);
    await page.fill('input[name="fullName"]', 'Test Student');
    await page.click('button:has-text("Create Account")');

    // Step 3: Verify email sent (check for success message)
    await expect(page.locator('text=verification email')).toBeVisible({ timeout: 5000 });

    // Step 4: Check email for verification link (in real test, use email API)
    // For now, simulate clicking verification link
    const verificationCode = 'FAKE-CODE-123'; // Would extract from email
    await page.goto(`${BASE_URL}/verify-email?code=${verificationCode}`);
    await expect(page.locator('text=Email verified')).toBeVisible({ timeout: 5000 });

    // Step 5: Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[name="password"]', TEST_STUDENT_PASSWORD);
    await page.click('button:has-text("Log In")');

    // Step 6: Verify logged in (check for dashboard)
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 5000 });
    await expect(page.locator('text=My Assignments')).toBeVisible();

    // Step 7: View available assignments
    await page.click('text=Available Quizzes');
    await expect(page.locator('text=Quiz 1')).toBeVisible();

    // Step 8: Start a quiz
    await page.click('text=Quiz 1');
    await page.click('button:has-text("Start Quiz")');

    // Verify quiz started
    await expect(page).toHaveURL(/\/quiz\/[a-z0-9-]+/);
    await expect(page.locator('text=Question 1')).toBeVisible();

    // Step 9: Answer questions
    // Answer Q1
    await page.click('input[value="Option A"]');
    await page.click('button:has-text("Next")');

    // Answer Q2
    await page.click('input[value="Option B"]');
    await page.click('button:has-text("Next")');

    // Answer Q3
    await page.click('input[value="Option C"]');
    await page.click('button:has-text("Finish Quiz")');

    // Step 10: View results
    await expect(page.locator('text=Quiz Complete')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(/Your Score: \d+\//)).toBeVisible();

    // Verify results show in dashboard
    await page.click('text=Back to Dashboard');
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('text=Quiz 1')).toContainText(/Score: \d+/);
  });

  test('student cannot start expired assignment', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[name="password"]', TEST_STUDENT_PASSWORD);
    await page.click('button:has-text("Log In")');

    // Navigate to expired assignment
    await page.goto(`${BASE_URL}/quiz/EXPIRED-CODE`);

    // Should see expiry message
    await expect(page.locator(/Assignment expired/)).toBeVisible({ timeout: 5000 });
  });

  test('quiz timer counts down correctly', async ({ page }) => {
    // Login and start quiz
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[name="password"]', TEST_STUDENT_PASSWORD);
    await page.click('button:has-text("Log In")');

    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('text=Quiz 1');
    await page.click('button:has-text("Start Quiz")');

    // Verify timer is visible
    await expect(page.locator(/Time Remaining: \d+:\d+/)).toBeVisible();

    // Verify timer updates (wait 2 seconds and check it decreased)
    const timerBefore = await page.locator(/Time Remaining: (\d+):(\d+)/).first().textContent();
    await page.waitForTimeout(2000);
    const timerAfter = await page.locator(/Time Remaining: (\d+):(\d+)/).first().textContent();

    expect(timerAfter).not.toEqual(timerBefore);
  });

  test('submitted answers are saved correctly', async ({ page }) => {
    // Login and start quiz
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[name="password"]', TEST_STUDENT_PASSWORD);
    await page.click('button:has-text("Log In")');

    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('text=Quiz 1');
    await page.click('button:has-text("Start Quiz")');

    // Answer a question
    await page.click('input[value="Option A"]');

    // Go to next question
    await page.click('button:has-text("Next")');

    // Go back to previous question
    await page.click('button:has-text("Previous")');

    // Verify answer is still selected
    const selectedOption = await page.locator('input[value="Option A"][checked]');
    await expect(selectedOption).toBeChecked();
  });

  test('student receives score after completing quiz', async ({ page }) => {
    // Complete full quiz flow...
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[name="password"]', TEST_STUDENT_PASSWORD);
    await page.click('button:has-text("Log In")');

    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('text=Quiz 1');
    await page.click('button:has-text("Start Quiz")');

    // Answer all questions
    for (let i = 0; i < 3; i++) {
      await page.click(`input[value="Option ${String.fromCharCode(65 + i)}"]`);
      if (i < 2) {
        await page.click('button:has-text("Next")');
      }
    }

    await page.click('button:has-text("Finish Quiz")');

    // Verify score is displayed
    const scoreRegex = /Your Score: (\d+)\/(\d+)/;
    await expect(page.locator(scoreRegex)).toBeVisible({ timeout: 5000 });

    // Extract and verify score is reasonable
    const scoreText = await page.locator(/Your Score: \d+\/\d+/).textContent();
    const match = scoreText?.match(/(\d+)\/(\d+)/);
    expect(match).toBeTruthy();

    const [_, score, total] = match || [];
    const numScore = parseInt(score);
    const numTotal = parseInt(total);
    expect(numScore).toBeLessThanOrEqual(numTotal);
    expect(numScore).toBeGreaterThanOrEqual(0);
  });

  test('offline mode: quiz submission queued when offline', async ({ page, context }) => {
    // Start quiz
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[name="password"]', TEST_STUDENT_PASSWORD);
    await page.click('button:has-text("Log In")');

    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('text=Quiz 1');
    await page.click('button:has-text("Start Quiz")');

    // Answer a question
    await page.click('input[value="Option A"]');

    // Go offline
    await context.setOffline(true);

    // Attempt to submit answer
    await page.click('button:has-text("Submit Answer")');

    // Should see offline message or queue indicator
    await expect(
      page.locator(/offline|queued|will sync/i)
    ).toBeVisible({ timeout: 3000 });

    // Come back online
    await context.setOffline(false);

    // Should automatically sync
    await expect(
      page.locator(/synced|submitted/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
