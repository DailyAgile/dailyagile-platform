/**
 * Instructor Quiz Management E2E Test
 * Complete workflow: login → create quiz → create assignment → view results → manage extensions
 *
 * Tests the instructor experience
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_INSTRUCTOR_EMAIL = 'test-instructor-e2e@example.com';
const TEST_INSTRUCTOR_PASSWORD = 'SecurePass123!';

test.describe('Instructor Quiz Management', () => {
  test('complete instructor workflow: create quiz → assign → view results', async ({ page }) => {
    // Step 1: Login as instructor
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_INSTRUCTOR_EMAIL);
    await page.fill('input[name="password"]', TEST_INSTRUCTOR_PASSWORD);
    await page.click('button:has-text("Log In")');

    // Step 2: Verify instructor dashboard
    await expect(page).toHaveURL(`${BASE_URL}/instructor/dashboard`, { timeout: 5000 });
    await expect(page.locator('text=Create Quiz')).toBeVisible();

    // Step 3: Create quiz manually
    await page.click('button:has-text("Create Quiz")');
    await page.click('text=Create Manually');

    // Fill quiz details
    await page.fill('input[name="title"]', 'Advanced AI Quiz');
    await page.fill('textarea[name="description"]', 'Test your AI knowledge');
    await page.fill('input[name="totalPoints"]', '100');

    // Add questions
    await page.click('button:has-text("Add Question")');
    await page.fill('input[name="question-1"]', 'What is machine learning?');
    await page.fill('input[name="option-1-a"]', 'A type of AI');
    await page.fill('input[name="option-1-b"]', 'A programming language');
    await page.fill('input[name="option-1-c"]', 'A database tool');
    await page.click('input[value="A"]'); // Mark correct answer

    // Add second question
    await page.click('button:has-text("Add Question")');
    await page.fill('input[name="question-2"]', 'What is a neural network?');
    await page.fill('input[name="option-2-a"]', 'A type of fishing net');
    await page.fill('input[name="option-2-b"]', 'A model inspired by the brain');
    await page.fill('input[name="option-2-c"]', 'A social network');
    await page.click('input[value="B"]');

    // Submit quiz
    await page.click('button:has-text("Create Quiz")');

    // Step 4: Verify quiz created
    await expect(page.locator('text=Quiz Created Successfully')).toBeVisible({ timeout: 5000 });
    const quizId = await page.url();
    expect(quizId).toContain('/quiz/');

    // Step 5: Create assignment from quiz
    await page.click('button:has-text("Create Assignment")');

    // Select students/course
    await page.click('select[name="course"]');
    await page.click('text=Section A');

    // Set expiry date (7 days from now)
    await page.fill('input[name="expiresAt"]', '2026-08-19');

    // Set attempt limit
    await page.fill('input[name="maxAttempts"]', '3');

    // Submit assignment
    await page.click('button:has-text("Assign")');

    // Step 6: Verify assignment created
    await expect(page.locator('text=Assignment Created')).toBeVisible({ timeout: 5000 });
    const assignmentCode = await page.locator('text=/Code: [A-Z0-9]+/').textContent();
    expect(assignmentCode).toMatch(/Code: [A-Z0-9]+/);

    // Step 7: Copy assignment code (would be shared with students)
    const codeMatch = assignmentCode?.match(/([A-Z0-9]+)$/);
    const code = codeMatch?.[1];
    expect(code).toBeTruthy();

    // Step 8: View results (before students submit)
    await page.click('text=View Results');
    await expect(page.locator('text=0 responses')).toBeVisible();

    // Step 9: Verify export functionality
    await page.click('button:has-text("Export Results")');
    await expect(page.locator('text=CSV exported')).toBeVisible({ timeout: 5000 });
  });

  test('instructor can upload quizzes from CSV', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_INSTRUCTOR_EMAIL);
    await page.fill('input[name="password"]', TEST_INSTRUCTOR_PASSWORD);
    await page.click('button:has-text("Log In")');

    // Navigate to quiz creation
    await page.goto(`${BASE_URL}/instructor/dashboard`);
    await page.click('button:has-text("Create Quiz")');
    await page.click('text=Upload CSV');

    // Upload CSV file
    const csvContent = `question,option_a,option_b,option_c,correct_answer,points
"What is AI?","Computer","Intelligence","Artificial Intelligence","C",10
"What is ML?","Machine Learning","Mechanical Logic","Modern Language","A",10`;

    // Create and upload file
    const buffer = Buffer.from(csvContent);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'quiz.csv',
      mimeType: 'text/csv',
      buffer,
    });

    // Verify preview
    await expect(page.locator('text=2 questions found')).toBeVisible();

    // Submit
    await page.click('button:has-text("Import")');
    await expect(page.locator('text=Quiz imported')).toBeVisible({ timeout: 5000 });
  });

  test('instructor can generate quiz with AI', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_INSTRUCTOR_EMAIL);
    await page.fill('input[name="password"]', TEST_INSTRUCTOR_PASSWORD);
    await page.click('button:has-text("Log In")');

    // Navigate to quiz creation
    await page.goto(`${BASE_URL}/instructor/dashboard`);
    await page.click('button:has-text("Create Quiz")');
    await page.click('text=Generate with AI');

    // Fill topic
    await page.fill('input[name="topic"]', 'Quantum Computing');
    await page.fill('input[name="numQuestions"]', '5');
    await page.fill('textarea[name="instructions"]', 'Create a quiz for beginners');

    // Generate
    await page.click('button:has-text("Generate")');

    // Wait for generation (AI call)
    await expect(page.locator('text=Generating quiz...')).toBeVisible();
    await expect(
      page.locator(/text=Quiz Generated|Question 1/i)
    ).toBeVisible({ timeout: 15000 });

    // Verify questions are present
    await expect(page.locator('text=Question 1')).toBeVisible();

    // Save quiz
    await page.click('button:has-text("Save Quiz")');
    await expect(page.locator('text=Quiz saved')).toBeVisible({ timeout: 5000 });
  });

  test('instructor can manage extension requests', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_INSTRUCTOR_EMAIL);
    await page.fill('input[name="password"]', TEST_INSTRUCTOR_PASSWORD);
    await page.click('button:has-text("Log In")');

    // Go to requests
    await page.goto(`${BASE_URL}/instructor/dashboard`);
    await page.click('text=Extension Requests');

    // View pending request
    await expect(page.locator('text=Pending Requests')).toBeVisible();

    if (await page.locator('text=John Doe').isVisible()) {
      // Found a request
      await page.click('button:has-text("Review")');

      // View request details
      await expect(page.locator('text=John Doe')).toBeVisible();
      await expect(page.locator('text=Reason:')).toBeVisible();

      // Approve extension
      await page.click('button:has-text("Approve")');

      // Verify confirmation
      await expect(page.locator('text=Extension approved')).toBeVisible({ timeout: 5000 });

      // Verify request moved to approved
      await expect(page.locator('text=Approved Requests')).toBeVisible();
    }
  });

  test('instructor can view detailed quiz results', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_INSTRUCTOR_EMAIL);
    await page.fill('input[name="password"]', TEST_INSTRUCTOR_PASSWORD);
    await page.click('button:has-text("Log In")');

    // Go to quiz results
    await page.goto(`${BASE_URL}/instructor/dashboard`);
    await page.click('text=My Quizzes');
    await page.click('text=Quiz 1');
    await page.click('text=View Results');

    // Verify results display
    await expect(page.locator('text=Responses')).toBeVisible();
    await expect(page.locator('text=Average Score')).toBeVisible();
    await expect(page.locator('text=Pass Rate')).toBeVisible();

    // View individual student result
    await page.click('text=John Doe');

    // Verify detailed result
    await expect(page.locator('text=Student:')).toBeVisible();
    await expect(page.locator('text=Score:')).toBeVisible();
    await expect(page.locator('text=Submitted:')).toBeVisible();

    // View student's answers
    for (let i = 1; i <= 3; i++) {
      await expect(page.locator(`text=Question ${i}`)).toBeVisible();
      await expect(page.locator(`text=Student's Answer:`)).toBeVisible();
      await expect(page.locator(`text=Correct Answer:`)).toBeVisible();
    }
  });

  test('instructor can update quiz settings', async ({ page }) => {
    // Login and navigate to quiz
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_INSTRUCTOR_EMAIL);
    await page.fill('input[name="password"]', TEST_INSTRUCTOR_PASSWORD);
    await page.click('button:has-text("Log In")');

    await page.goto(`${BASE_URL}/instructor/dashboard`);
    await page.click('text=My Quizzes');
    await page.click('text=Quiz 1');
    await page.click('button:has-text("Edit")');

    // Update settings
    await page.fill('input[name="title"]', 'Updated Quiz Title');

    // Toggle options
    await page.click('input[name="showAnswers"]');
    await page.click('input[name="randomizeQuestions"]');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify update
    await expect(page.locator('text=Quiz updated')).toBeVisible({ timeout: 5000 });
  });

  test('instructor cannot see another instructor quiz', async ({ page }) => {
    // This test verifies authorization is working
    // If we try to access another instructor's quiz, should get 403

    await page.goto(`${BASE_URL}/instructor/quiz/some-other-instructors-quiz-id`);

    // Should not be able to access
    await expect(page.locator(/access denied|not found|unauthorized/i)).toBeVisible({ timeout: 5000 });
  });
});
