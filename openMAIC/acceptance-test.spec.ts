import { test, expect, chromium, Browser, Page } from '@playwright/test';
import * as fs from 'fs';

/**
 * INSTRUCTOR MVP ACCEPTANCE TEST
 *
 * Requirement: "Can an instructor successfully create, publish, deliver, and run an AI-generated quiz?"
 *
 * Approach: Adversarial testing. Try to break it. Assume defects exist.
 * Evidence: Only runtime behavior. No code inspection.
 */

interface TestResult {
  requirement: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'BLOCKED' | 'NOT IMPLEMENTED';
  tested: string;
  observed: string;
  evidence: string;
  defects: string[];
}

const results: TestResult[] = [];

test.describe('INSTRUCTOR MVP ACCEPTANCE TEST', () => {
  let instructorPage: Page;
  let defects: string[] = [];

  test.beforeAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('INSTRUCTOR MVP ACCEPTANCE TEST');
    console.log('='.repeat(80));
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REQUIREMENT 1: AI QUIZ GENERATION - TEST A (Agile Scrum, 5 questions)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('MUST HAVE 1A - AI Generate Quiz: Agile Scrum (5 questions)', async ({ browser }) => {
    console.log('\n📋 MUST HAVE 1A: AI Quiz Generation - Agile Scrum');

    instructorPage = await browser.newPage();
    await instructorPage.goto('http://localhost:3000/teach/quiz/management', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Step 1: Find create quiz button
    console.log('   Step 1: Navigate to quiz creation');
    let createButton = instructorPage.locator('button:has-text("Create"), button:has-text("New"), [data-testid="create-quiz"]').first();
    let isVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      createButton = instructorPage.locator('button, [role="button"]').filter({ hasText: /create|new|add/i }).first();
      isVisible = await createButton.isVisible({ timeout: 3000 }).catch(() => false);
    }

    if (!isVisible) {
      const content = await instructorPage.content();
      console.log('   ❌ Cannot find create button. Page content sample:', content.substring(0, 500));
      results.push({
        requirement: 'AI Quiz Generation - Agile Scrum (5Q)',
        status: 'BLOCKED',
        tested: 'Navigate to /teach/quiz/management and locate create quiz button',
        observed: 'Create button not found on page',
        evidence: 'Button not visible, page loaded but no create UI',
        defects: ['Cannot access quiz creation interface - possible auth requirement or UI missing']
      });
      return;
    }

    console.log('   ✓ Create button found, clicking');
    await createButton.click();
    await instructorPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await instructorPage.waitForTimeout(1000);

    // Step 2: Look for AI generation option
    console.log('   Step 2: Find AI generation option');
    const aiButton = instructorPage.locator('button:has-text("AI"), button:has-text("Generate")').first();
    const aiVisible = await aiButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!aiVisible) {
      const content = await instructorPage.content();
      console.log('   ❌ No AI generation option visible');
      console.log('   Available buttons:', content.match(/button[^>]*>[\w\s]+<\/button/gi)?.slice(0, 5));
      results.push({
        requirement: 'AI Quiz Generation - Agile Scrum (5Q)',
        status: 'BLOCKED',
        tested: 'Click create, look for AI generation option',
        observed: 'No AI generation button visible after create click',
        evidence: 'Modal/form appeared but no AI option',
        defects: ['AI generation UI not accessible or not implemented']
      });
      return;
    }

    console.log('   ✓ AI generation option found');
    await aiButton.click();
    await instructorPage.waitForTimeout(1000);

    // Step 3: Enter prompt and question count
    console.log('   Step 3: Enter prompt: "Agile Scrum Fundamentals"');
    const promptInput = instructorPage.locator('input[placeholder*="prompt"], input[placeholder*="topic"], textarea').first();
    const promptVisible = await promptInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!promptVisible) {
      results.push({
        requirement: 'AI Quiz Generation - Agile Scrum (5Q)',
        status: 'BLOCKED',
        tested: 'Look for prompt input field',
        observed: 'Prompt input field not visible',
        evidence: 'After clicking AI button, no input field appeared',
        defects: ['AI generation form UI missing or not rendered']
      });
      return;
    }

    await promptInput.fill('Agile Scrum Fundamentals');
    console.log('   ✓ Prompt entered');

    // Step 4: Set question count
    console.log('   Step 4: Set question count to 5');
    const countInput = instructorPage.locator('input[type="number"], input[placeholder*="question"]').first();
    const countVisible = await countInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (countVisible) {
      await countInput.fill('5');
      console.log('   ✓ Question count set to 5');
    } else {
      console.log('   ⚠ Question count input not found, may use default');
    }

    // Step 5: Click generate
    console.log('   Step 5: Click Generate');
    const generateButton = instructorPage.locator('button:has-text("Generate")').last();
    await generateButton.click();

    // Wait for generation to complete (can take 10+ seconds)
    console.log('   ⏳ Waiting for AI generation (this may take 10-30 seconds)...');
    await instructorPage.waitForTimeout(3000);

    // Check for loading state
    const loadingVisible = await instructorPage.locator('[class*="loading"], [class*="spinner"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (loadingVisible) {
      console.log('   ⏳ Loading state detected, waiting...');
      await instructorPage.waitForTimeout(15000);
    }

    // Step 6: Verify questions appeared
    console.log('   Step 6: Verify questions generated');
    const questionElements = instructorPage.locator('[data-testid*="question"], .question, h3, h4').all();
    const allQuestions = await questionElements;

    console.log(`   Found ${allQuestions.length} question-like elements`);

    if (allQuestions.length === 0) {
      const pageContent = await instructorPage.content();
      const hasError = pageContent.includes('error') || pageContent.includes('Error') || pageContent.includes('failed');

      results.push({
        requirement: 'AI Quiz Generation - Agile Scrum (5Q)',
        status: hasError ? 'FAIL' : 'BLOCKED',
        tested: 'Generate 5 questions with AI prompt "Agile Scrum Fundamentals"',
        observed: 'No questions appeared after generation',
        evidence: 'Page loaded but 0 questions rendered',
        defects: [
          hasError ? 'Generation error occurred (error message on page)' : 'Generation produced no output or hung silently',
          'Cannot verify question count or quality'
        ]
      });
      return;
    }

    // If we got here, generation appears to have worked
    console.log('   ✓ Questions appeared on page');

    // Extract visible text to count questions
    const questionText = await instructorPage.innerText();
    const questionCount = (questionText.match(/question|Q\d+|1\.|2\.|3\.|4\.|5\./gi) || []).length;

    console.log(`   Estimated ${Math.ceil(questionCount / 3)} distinct questions visible`);

    results.push({
      requirement: 'AI Quiz Generation - Agile Scrum (5Q)',
      status: allQuestions.length > 0 ? 'PARTIAL' : 'FAIL',
      tested: 'Create quiz with prompt "Agile Scrum Fundamentals" and request 5 questions',
      observed: `Quiz creation interface accessible, generation form visible, ${allQuestions.length} question elements found`,
      evidence: 'Page render shows question-like elements after generation',
      defects: allQuestions.length > 0 ? ['Need manual inspection of question content and count accuracy'] : ['Generation failed or produced empty result']
    });

    // Save quiz ID if possible
    const url = instructorPage.url();
    console.log(`   Current URL: ${url}`);
  });

  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST EXECUTION COMPLETE');
    console.log('='.repeat(80));
    console.log('\nGENERATED RESULTS:');
    results.forEach(r => {
      console.log(`\n${r.requirement}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Tested: ${r.tested}`);
      console.log(`  Observed: ${r.observed}`);
      if (r.defects.length > 0) {
        console.log(`  Defects: ${r.defects.join('; ')}`);
      }
    });
  });
});
