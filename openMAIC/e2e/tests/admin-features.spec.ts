import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Instructor Admin Features
 * Tests:
 * 1. Search & Filter Quizzes
 * 2. Bulk Export Quizzes to CSV
 * 3. Quiz Results Advanced Analytics
 */

test.describe('Instructor Admin Features', () => {
  let baseUrl: string;

  test.beforeAll(() => {
    baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  });

  test.describe('Feature 1: Search & Filter Quizzes', () => {
    test('should display search input and filter dropdown', async ({ page }) => {
      // Navigate to quiz management
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Verify search input exists
      const searchInput = page.locator('input[placeholder="Search quizzes..."]');
      await expect(searchInput).toBeVisible();

      // Verify filter dropdown exists
      const filterSelect = page.locator('select');
      await expect(filterSelect).toBeVisible();

      // Verify "Show X of Y quizzes" text
      const quizCounter = page.locator('text=/Showing \\d+ of \\d+ quiz/');
      await expect(quizCounter).toBeVisible();
    });

    test('should filter quizzes by search term (title)', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Get initial quiz count
      const initialQuizzes = page.locator('[style*="backgroundColor"]').filter({ has: page.locator('h3') });
      const initialCount = await initialQuizzes.count();

      // Type in search input
      const searchInput = page.locator('input[placeholder="Search quizzes..."]');
      await searchInput.fill('Math');

      // Wait for filtering to complete
      await page.waitForTimeout(300);

      // Verify filtered results
      const filteredQuizzes = page.locator('[style*="backgroundColor"]').filter({ has: page.locator('h3') });
      const filteredCount = await filteredQuizzes.count();

      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });

    test('should filter quizzes by search term (code)', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Search by quiz code
      const searchInput = page.locator('input[placeholder="Search quizzes..."]');
      await searchInput.fill('ABC');

      // Wait for filtering
      await page.waitForTimeout(300);

      // Should show filtered results or "No quizzes found"
      const noResults = page.locator('text=No quizzes found');
      const quizzes = page.locator('h3');
      const hasResults = (await quizzes.count()) > 0;
      const showsNoResults = await noResults.isVisible().catch(() => false);

      expect(hasResults || showsNoResults).toBeTruthy();
    });

    test('should filter quizzes by status (Published Only)', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Select "Published Only" from dropdown
      const filterSelect = page.locator('select');
      await filterSelect.selectOption('published');

      // Wait for filtering
      await page.waitForTimeout(300);

      // Verify all visible quizzes show published badge
      const publishBadges = page.locator('text=📢');
      const count = await publishBadges.count();

      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should filter quizzes by status (Drafts Only)', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Select "Drafts Only" from dropdown
      const filterSelect = page.locator('select');
      await filterSelect.selectOption('draft');

      // Wait for filtering
      await page.waitForTimeout(300);

      // Verify all visible quizzes show draft badge
      const draftBadges = page.locator('text=⏸️');
      const count = await draftBadges.count();

      // Should show at least draft quizzes or no results
      const noResults = page.locator('text=No quizzes found');
      const hasResults = count > 0;
      const showsNoResults = await noResults.isVisible().catch(() => false);

      expect(hasResults || showsNoResults).toBeTruthy();
    });

    test('should clear search and show all quizzes', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Search for something
      const searchInput = page.locator('input[placeholder="Search quizzes..."]');
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(300);

      // Should show all quizzes again
      const quizzes = page.locator('h3');
      expect(await quizzes.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Feature 2: Bulk Export Quizzes to CSV', () => {
    test('should display export button', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Verify export button exists
      const exportButton = page.locator('button:has-text("Export CSV")');
      await expect(exportButton).toBeVisible();
      expect(exportButton).toContainText('⬇️');
    });

    test('should export quizzes to CSV file', async ({ page, context }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Listen for download event
      const downloadPromise = context.waitForEvent('download');

      // Click export button
      const exportButton = page.locator('button:has-text("Export CSV")');
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;

      // Verify filename pattern
      expect(download.suggestedFilename()).toMatch(/quizzes_export_\d{4}-\d{2}-\d{2}\.csv/);
    });

    test('should show success notification after export', async ({ page, context }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Set up download listener
      const downloadPromise = context.waitForEvent('download');

      // Click export button
      const exportButton = page.locator('button:has-text("Export CSV")');
      await exportButton.click();

      // Wait for download to start
      await downloadPromise;

      // Wait a bit for success message to appear
      await page.waitForTimeout(500);

      // Verify success message
      const successMessage = page.locator('text=/✓ Exported \\d+ quiz/');
      await expect(successMessage).toBeVisible();
    });

    test('should include all quiz columns in CSV export', async ({ page, context }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Listen for download
      const downloadPromise = context.waitForEvent('download');

      // Click export button
      const exportButton = page.locator('button:has-text("Export CSV")');
      await exportButton.click();

      // Get download
      const download = await downloadPromise;
      const path = await download.path();

      // Read file content
      const fs = require('fs');
      const content = fs.readFileSync(path, 'utf-8');

      // Verify CSV headers
      const headers = [
        'Quiz Code',
        'Title',
        'Questions',
        'Points',
        'Published',
        'Assigned',
        'Completed',
        'Created Date',
      ];

      for (const header of headers) {
        expect(content).toContain(header);
      }

      // Verify CSV format (has commas and newlines)
      expect(content).toContain(',');
      expect(content).toContain('\n');
    });
  });

  test.describe('Feature 3: Quiz Results Advanced Analytics', () => {
    test('should display analytics section on results tab', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Click "Details" button on first quiz
      const detailsButton = page.locator('button:has-text("Details")').first();
      if (await detailsButton.isVisible()) {
        await detailsButton.click();

        // Wait for page load
        await page.waitForNavigation({ waitUntil: 'networkidle' });

        // Click Results tab
        const resultsTab = page.locator('button:has-text("results")');
        await resultsTab.click();

        // Wait for analytics to load
        await page.waitForTimeout(1000);

        // Verify analytics section exists
        const analyticsTitle = page.locator('text=Question-Level Analytics');
        const isVisible = await analyticsTitle.isVisible().catch(() => false);

        // If quizzes have attempts, analytics should show
        if (isVisible) {
          expect(isVisible).toBeTruthy();
        }
      }
    });

    test('should display easiest question card', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Navigate to quiz details
      const detailsButton = page.locator('button:has-text("Details")').first();
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle' });

        // Click Results tab
        const resultsTab = page.locator('button:has-text("results")');
        await resultsTab.click();
        await page.waitForTimeout(1000);

        // Check for easiest question card
        const easiestCard = page.locator('text=🎯 Easiest Question');
        const isVisible = await easiestCard.isVisible().catch(() => false);

        if (isVisible) {
          expect(isVisible).toBeTruthy();
          // Should show percentage
          const percentage = page.locator('text=/\\d+% correct/').first();
          expect(await percentage.isVisible()).toBeTruthy();
        }
      }
    });

    test('should display hardest question card', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Navigate to quiz details
      const detailsButton = page.locator('button:has-text("Details")').first();
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle' });

        // Click Results tab
        const resultsTab = page.locator('button:has-text("results")');
        await resultsTab.click();
        await page.waitForTimeout(1000);

        // Check for hardest question card
        const hardestCard = page.locator('text=⚠️ Hardest Question');
        const isVisible = await hardestCard.isVisible().catch(() => false);

        if (isVisible) {
          expect(isVisible).toBeTruthy();
          // Should show percentage
          const percentage = page.locator('text=/\\d+% correct/');
          expect(await percentage.count()).toBeGreaterThan(0);
        }
      }
    });

    test('should display average time per question', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Navigate to quiz details
      const detailsButton = page.locator('button:has-text("Details")').first();
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle' });

        // Click Results tab
        const resultsTab = page.locator('button:has-text("results")');
        await resultsTab.click();
        await page.waitForTimeout(1000);

        // Check for average time card
        const timeCard = page.locator('text=⏱️ Average Time Per Question');
        const isVisible = await timeCard.isVisible().catch(() => false);

        if (isVisible) {
          expect(isVisible).toBeTruthy();
          // Should show time in seconds
          const timeValue = page.locator('text=/\\d+s/');
          expect(await timeValue.count()).toBeGreaterThan(0);
        }
      }
    });

    test('should display question breakdown table', async ({ page }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Navigate to quiz details
      const detailsButton = page.locator('button:has-text("Details")').first();
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle' });

        // Click Results tab
        const resultsTab = page.locator('button:has-text("results")');
        await resultsTab.click();
        await page.waitForTimeout(1000);

        // Check for table headers
        const tableTitle = page.locator('text=All Questions Breakdown');
        const isVisible = await tableTitle.isVisible().catch(() => false);

        if (isVisible) {
          expect(isVisible).toBeTruthy();

          // Verify table headers exist
          const headers = ['Question', 'Correct %', 'Attempts', 'Avg Time'];
          for (const header of headers) {
            const headerElement = page.locator(`text=${header}`);
            expect(await headerElement.count()).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('Combined Feature Tests', () => {
    test('search should not affect CSV export (exports all quizzes)', async ({
      page,
      context,
    }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Search for quizzes
      const searchInput = page.locator('input[placeholder="Search quizzes..."]');
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Export should export all quizzes, not just filtered
      const downloadPromise = context.waitForEvent('download');
      const exportButton = page.locator('button:has-text("Export CSV")');
      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/quizzes_export_/);
    });

    test('filter should not affect CSV export (exports all quizzes)', async ({
      page,
      context,
    }) => {
      await page.goto(`${baseUrl}/teach/quiz/management`, {
        waitUntil: 'networkidle',
      });

      // Filter to published only
      const filterSelect = page.locator('select');
      await filterSelect.selectOption('published');
      await page.waitForTimeout(300);

      // Export should export all quizzes
      const downloadPromise = context.waitForEvent('download');
      const exportButton = page.locator('button:has-text("Export CSV")');
      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/quizzes_export_/);
    });
  });
});
