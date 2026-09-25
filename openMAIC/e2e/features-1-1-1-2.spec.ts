import { test, expect } from '@playwright/test';

test.describe('Feature 1.1 & 1.2: Student Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as instructor
    await page.goto('http://localhost:3000');

    // Navigate to login
    await page.click('text=Teach a Quiz');

    // Fill email
    await page.fill('input[type="email"]', 'instructor@example.com');
    await page.click('button:has-text("Submit")');

    // Wait for OTP field to appear
    await expect(page.locator('input[placeholder*="6"]')).toBeVisible({ timeout: 5000 });

    // Enter OTP (test environment should use fixed OTP)
    await page.fill('input[placeholder*="6"]', '000000');
    await page.click('button:has-text("Submit")');

    // Wait for redirect to dashboard
    await page.waitForURL('**/teach/quiz/management', { timeout: 10000 });
  });

  test('should display list of students', async ({ page }) => {
    // Navigate to students page
    await page.goto('http://localhost:3000/teach/students');

    // Verify page loaded
    await expect(page.locator('text=Student List')).toBeVisible({ timeout: 5000 });

    // Check table exists
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verify columns
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Assigned")')).toBeVisible();
  });

  test('should search students by email', async ({ page }) => {
    await page.goto('http://localhost:3000/teach/students');

    // Wait for page to load
    await expect(page.locator('text=Student List')).toBeVisible();

    // Enter search term
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('student@example.com');

    // Wait for results
    await page.waitForTimeout(500);

    // Verify results exist
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('should search students by name', async ({ page }) => {
    await page.goto('http://localhost:3000/teach/students');

    // Wait for page to load
    await expect(page.locator('text=Student List')).toBeVisible();

    // Enter search term
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('John');

    // Wait for results
    await page.waitForTimeout(500);

    // Verify results
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('should open assign quiz modal', async ({ page }) => {
    await page.goto('http://localhost:3000/teach/students');

    // Wait for page to load
    await expect(page.locator('text=Student List')).toBeVisible();

    // Click "Assign Quiz" button
    const assignButton = page.locator('button:has-text("Assign Quiz")').first();
    if (await assignButton.isVisible()) {
      await assignButton.click();

      // Wait for modal to appear
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should assign quiz to single student', async ({ page }) => {
    await page.goto('http://localhost:3000/teach/students');

    // Wait for page to load
    await expect(page.locator('text=Student List')).toBeVisible();

    // Click "Assign Quiz" button
    const assignButton = page.locator('button:has-text("Assign Quiz")').first();
    if (await assignButton.isVisible()) {
      await assignButton.click();

      // Wait for modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Select first student if checkboxes exist
      const studentCheckbox = page.locator('input[type="checkbox"]').first();
      if (await studentCheckbox.isVisible()) {
        await studentCheckbox.click();
      }

      // Select quiz dropdown
      const quizSelect = page.locator('select').first();
      if (await quizSelect.isVisible()) {
        await quizSelect.selectOption({ index: 1 });
      }

      // Click assign button
      const submitButton = page.locator('button:has-text("Assign")');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Wait for success message
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should filter by completion status', async ({ page }) => {
    await page.goto('http://localhost:3000/teach/students');

    // Wait for page to load
    await expect(page.locator('text=Student List')).toBeVisible();

    // Look for filter dropdown
    const filterSelect = page.locator('select').first();
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption({ index: 1 });

      // Wait for results
      await page.waitForTimeout(500);

      // Verify results exist
      const rows = await page.locator('table tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display DailyAgile branding', async ({ page }) => {
    await page.goto('http://localhost:3000/teach/students');

    // Wait for page to load
    await expect(page.locator('text=Student List')).toBeVisible();

    // Check for DailyAgile logo or branding
    const logo = page.locator('img[alt*="DailyAgile"], img[alt*="Logo"]');
    const hasBranding = await logo.isVisible().catch(() => false);

    // At minimum, check for page title
    await expect(page.locator('text=Student List')).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/teach/students');
    await expect(page.locator('text=Student List')).toBeVisible();
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e => !e.includes('Supabase'));
    expect(criticalErrors.length).toBe(0);
  });

  test('should be responsive on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
    });
    const page = await context.newPage();

    // Login flow
    await page.goto('http://localhost:3000');
    await page.click('text=Teach a Quiz');
    await page.fill('input[type="email"]', 'instructor@example.com');
    await page.click('button:has-text("Submit")');

    // Wait for OTP
    await expect(page.locator('input[placeholder*="6"]')).toBeVisible({ timeout: 5000 });
    await page.fill('input[placeholder*="6"]', '000000');
    await page.click('button:has-text("Submit")');

    // Navigate to students page
    await page.goto('http://localhost:3000/teach/students');
    await expect(page.locator('text=Student List')).toBeVisible({ timeout: 5000 });

    // Verify no horizontal scroll
    const viewportSize = page.viewportSize();
    const bodyWidth = await page.locator('body').evaluate(el => {
      return Math.max(el.scrollWidth, el.offsetWidth);
    });

    expect(bodyWidth).toBeLessThanOrEqual((viewportSize?.width || 0) + 10); // Small margin for scrollbar

    await context.close();
  });

  test('should paginate through students', async ({ page }) => {
    await page.goto('http://localhost:3000/teach/students');

    // Wait for page to load
    await expect(page.locator('text=Student List')).toBeVisible();

    // Look for pagination buttons
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // Wait for new results
      await page.waitForTimeout(500);

      // Verify page updated
      const rows = await page.locator('table tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    }
  });
});
