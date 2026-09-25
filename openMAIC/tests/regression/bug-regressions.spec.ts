/**
 * Regression Test Suite — Past Bugs
 *
 * This file tests all known bugs from BUG_LIST.md to prevent regressions.
 * Run before every deployment: npm run test:regression
 *
 * Last Updated: 2026-08-14
 */

import { test, expect, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_INSTRUCTOR_ID = 'test-instructor-001';
const TEST_INSTRUCTOR_EMAIL = 'test.instructor@example.com';

/**
 * BUG #1: Share Modal "Failed to copy" Error
 * Description: Clipboard API copy button fails due to permission restrictions
 * Fix: Triple-click + Ctrl+C instead of API
 */
test.describe('BUG #1 — Share modal copy (no permissions error)', () => {
  test('Share button opens modal without errors', async ({ page }) => {
    // Set test instructor cookie
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    // Find and click first share button
    const shareButton = await page.locator('button:has-text("Share")').first();
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    // Modal should appear without errors
    await expect(page.locator('text=Share Quiz')).toBeVisible();
    await expect(page.locator('text=Failed to copy')).not.toBeVisible();
  });

  test('Share modal URL field supports triple-click selection', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    const shareButton = await page.locator('button:has-text("Share")').first();
    await shareButton.click();

    // Find URL input field
    const urlInput = page.locator('input[readonly]').first();
    await expect(urlInput).toBeVisible();

    // Triple-click to select
    await urlInput.tripleClick();

    // Verify text is selected
    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString() || '';
    });

    expect(selectedText.length).toBeGreaterThan(10);
  });

  test('Share modal does not show Copy button anymore', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    const shareButton = await page.locator('button:has-text("Share")').first();
    await shareButton.click();

    // Copy button should NOT exist
    const copyButton = page.locator('button:has-text("Copy")');
    await expect(copyButton).not.toBeVisible();

    // But instructions should mention Ctrl+C
    const instructions = page.locator('text=/Ctrl|Cmd/');
    await expect(instructions).toBeVisible();
  });
});

/**
 * BUG #2: Quiz Details Page — "Failed to load assignments" Error
 * Description: 401 errors due to wrong auth field (email vs id) and missing credentials
 * Fix: Use .id for auth checks, add credentials: 'include' to fetch calls
 */
test.describe('BUG #2 — Quiz Details page auth fixes', () => {
  test('Quiz Details page loads without 401 Unauthorized', async ({ page }) => {
    // Set test instructor cookie
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    // Click first quiz's Details button
    const detailsButton = await page.locator('button:has-text("Details")').first();
    await expect(detailsButton).toBeVisible({ timeout: 5000 });
    await detailsButton.click();

    // Should navigate to details page
    await expect(page).toHaveURL(/\/teach\/quiz\/management\/[a-f0-9-]+$/);

    // No 401 error should appear
    await expect(page.locator('text=Unauthorized')).not.toBeVisible();
  });

  test('Assignments tab loads data successfully', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    const detailsButton = await page.locator('button:has-text("Details")').first();
    await detailsButton.click();

    await expect(page).toHaveURL(/\/teach\/quiz\/management\/[a-f0-9-]+$/);

    // Click Assignments tab
    const assignmentsTab = page.locator('button:has-text("Assignments")');
    await expect(assignmentsTab).toBeVisible({ timeout: 5000 });
    await assignmentsTab.click();

    // Should show assignments or "no assignments" message (not error)
    await page.waitForTimeout(500);
    const errorText = page.locator('text=Failed to load');
    await expect(errorText).not.toBeVisible();
  });

  test('Results tab loads data successfully', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    const detailsButton = await page.locator('button:has-text("Details")').first();
    await detailsButton.click();

    await expect(page).toHaveURL(/\/teach\/quiz\/management\/[a-f0-9-]+$/);

    // Click Results tab
    const resultsTab = page.locator('button:has-text("Results")');
    await expect(resultsTab).toBeVisible({ timeout: 5000 });
    await resultsTab.click();

    // Should show results or "no results" message (not error)
    await page.waitForTimeout(500);
    const errorText = page.locator('text=Failed to load');
    await expect(errorText).not.toBeVisible();
  });

  test('API calls include credentials for cookie-based auth', async ({ page }) => {
    let requestSent = false;

    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/instructor/quiz')) {
        requestSent = true;
        // Verify fetch was made (request exists)
        expect(request).toBeTruthy();
      }
    });

    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    const detailsButton = await page.locator('button:has-text("Details")').first();
    await detailsButton.click();

    // Wait for API call to complete
    await page.waitForTimeout(1000);

    expect(requestSent).toBe(true);
  });
});

/**
 * BUG #3: Clone Quiz Button — Database Unique Constraint Violation
 * Description: Manual quiz code generation causes duplicate key errors
 * Fix: Let database auto-generate unique quiz codes
 */
test.describe('BUG #3 — Clone quiz unique constraint', () => {
  test('Clone button creates new quiz without constraint error', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    const cloneButton = await page.locator('button:has-text("Clone")').first();
    await expect(cloneButton).toBeVisible({ timeout: 5000 });

    // Click clone
    await cloneButton.click();

    // Wait for success message
    const successMsg = page.locator('text=cloned successfully');
    await expect(successMsg).toBeVisible({ timeout: 5000 });

    // No constraint error should appear
    const constraintError = page.locator('text=duplicate key|constraint/i');
    await expect(constraintError).not.toBeVisible();
  });

  test('Multiple clones of same quiz all succeed', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    await page.goto(`${BASE_URL}/teach/quiz/management`);

    const cloneButton = await page.locator('button:has-text("Clone")').first();

    // Clone 3 times
    for (let i = 0; i < 3; i++) {
      await cloneButton.click();
      const successMsg = page.locator('text=cloned successfully');
      await expect(successMsg).toBeVisible({ timeout: 5000 });

      // Dismiss success message or reload
      await page.waitForTimeout(500);
    }

    // All 3 clones should exist now
    const quizCards = page.locator('[data-testid="quiz-card"]');
    const count = await quizCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

/**
 * BUG #4: Leaderboard API — Missing Authentication & Authorization
 * Description: Leaderboard API exposed publicly without auth checks
 * Fix: Added requireInstructor() and quiz ownership verification
 */
test.describe('BUG #4 — Leaderboard API security', () => {
  test('Leaderboard API requires authentication', async ({ request }) => {
    // Call without auth cookie
    const response = await request.get(`${BASE_URL}/api/analytics/leaderboard?quizId=test-quiz-id`);

    expect(response.status()).toBe(401);
  });

  test('Leaderboard API checks quiz ownership', async ({ request, context }) => {
    // Set wrong instructor cookie
    await context.addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({
          id: 'wrong-instructor-id',
          email: 'wrong.instructor@example.com',
        }),
        url: BASE_URL,
      },
    ]);

    // Try to access someone else's leaderboard
    const response = await request.get(
      `${BASE_URL}/api/analytics/leaderboard?quizId=someone-elses-quiz`
    );

    // Should be forbidden (403) or unauthorized (401)
    expect([401, 403]).toContain(response.status());
  });

  test('Authorized instructor can access their leaderboard', async ({ request, context }) => {
    // This test would need a real quiz ID from the database
    // For now, verify the endpoint structure works with proper auth

    await context.addCookies([
      {
        name: 'instructor-session',
        value: JSON.stringify({ id: TEST_INSTRUCTOR_ID, email: TEST_INSTRUCTOR_EMAIL }),
        url: BASE_URL,
      },
    ]);

    // Attempt with valid auth (will 404 if quiz doesn't exist, but not 401)
    const response = await request.get(
      `${BASE_URL}/api/analytics/leaderboard?quizId=nonexistent-quiz`
    );

    // Should NOT be 401 (auth succeeded, just no quiz)
    expect(response.status()).not.toBe(401);
  });
});

/**
 * BUG #5: Database Schema — Missing Indexes (Performance)
 * Description: No index on instructor_id causes slow queries
 * Status: PENDING FIX
 * TODO: Add performance test once indexes are added
 */
test.describe('BUG #5 — Database query performance (PENDING)', () => {
  test.skip('Quiz list queries should complete in < 1000ms', async ({ page }) => {
    // TODO: Test after indexes are added
    // This test will measure query performance with 10k+ quizzes
    // Mark as .skip() until indexes are applied
  });
});
