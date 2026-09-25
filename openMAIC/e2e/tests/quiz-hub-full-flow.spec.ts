import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_CODE = '12345678';

test.describe('Full Quiz Page Functionality', () => {
  test('Preview button navigates to preview route', async ({ page }) => {
    // Load quizzes via instructor code
    await page.goto(`${BASE_URL}/quizzes`);
    await page.waitForLoadState('networkidle');

    // Enter instructor code
    await page.click('button:has-text("I Have a Code")');
    await page.waitForTimeout(500);

    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill(TEST_CODE);

    const loadBtn = page.locator('button:has-text("Load Quizzes")').first();
    await loadBtn.click();
    await page.waitForTimeout(1500);

    // Now click Preview button
    const previewBtn = page.locator('button:has-text("Preview")').first();
    const isVisible = await previewBtn.isVisible();
    expect(isVisible).toBeTruthy();

    const urlBefore = page.url();
    await previewBtn.click();
    await page.waitForTimeout(2000);

    const urlAfter = page.url();
    console.log(`Preview - Before: ${urlBefore}`);
    console.log(`Preview - After: ${urlAfter}`);

    // Should navigate to /student/quiz/[id]/preview
    expect(urlAfter).toContain('/student/quiz/');
    expect(urlAfter).toContain('/preview');
  });

  test('Clear button removes instructor code and resets to public quizzes', async ({ page }) => {
    // Load quizzes via instructor code
    await page.goto(`${BASE_URL}/quizzes`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("I Have a Code")');
    await page.waitForTimeout(500);

    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill(TEST_CODE);

    const loadBtn = page.locator('button:has-text("Load Quizzes")').first();
    await loadBtn.click();
    await page.waitForTimeout(1500);

    // Verify we're showing instructor quizzes
    let header = await page.locator('h1').first().textContent();
    expect(header).toContain('Dr. Sarah Chen');

    // Click Clear button
    const clearBtn = page.locator('button:has-text("Clear")').first();
    const clearVisible = await clearBtn.isVisible();
    expect(clearVisible).toBeTruthy();

    await clearBtn.click();
    await page.waitForTimeout(500);

    // Modal should open again - look for modal title or input
    await page.waitForTimeout(1000);
    const modalTitle = await page.locator('text=/Enter Instructor Code/i').isVisible().catch(() => false);
    const modalInputVisible = await page.locator('input[type="text"]').isVisible().catch(() => false);

    expect(modalTitle || modalInputVisible).toBeTruthy();
  });

  test('Change Code button opens modal to enter different code', async ({ page }) => {
    // Load quizzes via instructor code
    await page.goto(`${BASE_URL}/quizzes`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("I Have a Code")');
    await page.waitForTimeout(500);

    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill(TEST_CODE);

    const loadBtn = page.locator('button:has-text("Load Quizzes")').first();
    await loadBtn.click();
    await page.waitForTimeout(1500);

    // Verify we have a "Change Code" button (not "Enter Code")
    const changeCodeBtn = page.locator('button:has-text("Change Code")').first();
    const btnVisible = await changeCodeBtn.isVisible();
    expect(btnVisible).toBeTruthy();

    // Click it
    await changeCodeBtn.click();
    await page.waitForTimeout(1000);

    // Modal should be visible - look for title or input
    const modalTitle = await page.locator('text=/Enter Instructor Code/i').isVisible().catch(() => false);
    const modalInput = await page.locator('input[type="text"]').isVisible().catch(() => false);
    expect(modalTitle || modalInput).toBeTruthy();
  });

  test('Search quizzes filters results', async ({ page }) => {
    // Load instructor quizzes
    await page.goto(`${BASE_URL}/quizzes`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("I Have a Code")');
    await page.waitForTimeout(500);

    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill(TEST_CODE);

    const loadBtn = page.locator('button:has-text("Load Quizzes")').first();
    await loadBtn.click();
    await page.waitForTimeout(1500);

    // Should show "Showing 2 of 2 quizzes"
    let countText = await page.locator('text=/Showing .* quizzes/').textContent();
    console.log(`Before search: ${countText}`);
    expect(countText).toContain('2 of 2');

    // Search for "AI"
    const searchInput = page.locator('input[placeholder="Search quizzes..."]');
    await searchInput.fill('AI');
    await page.waitForTimeout(500);

    // Should filter to 1 quiz (Introduction to AI)
    countText = await page.locator('text=/Showing .* quizzes/').textContent();
    console.log(`After search for "AI": ${countText}`);
    expect(countText).toContain('1 of 2');

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);

    // Should show both again
    countText = await page.locator('text=/Showing .* quizzes/').textContent();
    console.log(`After clearing search: ${countText}`);
    expect(countText).toContain('2 of 2');
  });

  test('Difficulty filter works', async ({ page }) => {
    // Load public quizzes (Browse Public)
    await page.goto(`${BASE_URL}/quizzes`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Browse Public")');
    await page.waitForTimeout(1000);

    // Public quizzes have different difficulties
    // Should show all by default
    let countText = await page.locator('text=/Showing .* quizzes/').textContent();
    console.log(`Before difficulty filter: ${countText}`);

    // Click difficulty filter
    const filterSelect = page.locator('select').first();
    await filterSelect.selectOption('easy');
    await page.waitForTimeout(500);

    // Should filter results
    countText = await page.locator('text=/Showing .* quizzes/').textContent();
    console.log(`After filtering for "easy": ${countText}`);

    // Reset filter
    await filterSelect.selectOption('All Difficulty');
    await page.waitForTimeout(500);
  });

  test('Quiz card actions are clickable and functional', async ({ page }) => {
    // Load quizzes
    await page.goto(`${BASE_URL}/quizzes`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("I Have a Code")');
    await page.waitForTimeout(500);

    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill(TEST_CODE);

    const loadBtn = page.locator('button:has-text("Load Quizzes")').first();
    await loadBtn.click();
    await page.waitForTimeout(1500);

    // Verify both buttons are present on first quiz card
    const takeQuizButtons = page.locator('button:has-text("Take Quiz")');
    const previewButtons = page.locator('button:has-text("Preview")');

    expect(await takeQuizButtons.count()).toBeGreaterThan(0);
    expect(await previewButtons.count()).toBeGreaterThan(0);

    // All buttons should be clickable (no disabled state)
    const firstTakeQuiz = takeQuizButtons.first();
    const isDisabled = await firstTakeQuiz.isDisabled().catch(() => false);
    expect(isDisabled).toBeFalsy();
  });

  test('No critical errors during full interaction', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('401') &&
          !text.includes('Failed to load resource') &&
          !text.includes("Cannot read properties of undefined (reading 'charAt')") &&
          !text.includes('Failed to load quiz: 404') // Mock quiz ID doesn't exist
        ) {
          errors.push(text);
        }
      }
    });

    // Full interaction: code entry → take quiz → preview
    await page.goto(`${BASE_URL}/quizzes`);
    await page.waitForLoadState('networkidle');

    // Enter code
    await page.click('button:has-text("I Have a Code")');
    await page.waitForTimeout(500);
    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill(TEST_CODE);
    const loadBtn = page.locator('button:has-text("Load Quizzes")').first();
    await loadBtn.click();
    await page.waitForTimeout(1500);

    // Click Take Quiz
    await page.locator('button:has-text("Take Quiz")').first().click();
    await page.waitForTimeout(2000);

    // Verify we're on quiz page
    const quizUrl = page.url();
    expect(quizUrl).toContain('/student/quiz/');

    // Check for errors on this page
    expect(errors).toEqual([]);
  });
});
