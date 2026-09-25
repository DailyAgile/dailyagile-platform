import { test, expect, Page } from '@playwright/test';

// Helper to login as instructor
async function loginAsInstructor(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'instructor@dailyagile.com');
  await page.fill('input[name="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/academy');
}

// Helper to login as student
async function loginAsStudent(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'student@dailyagile.com');
  await page.fill('input[name="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/academy');
}

test.describe('Academy Dashboard - Public Access', () => {
  test('Visitor can load /academy without authentication', async ({ page }) => {
    await page.goto('/academy');

    // Verify page loads
    expect(await page.locator('h1:has-text("DailyAgile Academy")').isVisible()).toBe(true);

    // Verify no authentication error
    expect(page.url()).toBe(`${page.context().baseURL}/academy`);
  });

  test('Visitor sees "Log In / Sign Up" button', async ({ page }) => {
    await page.goto('/academy');

    expect(await page.locator('text=Log In / Sign Up').isVisible()).toBe(true);
  });

  test('Visitor sees all 3 product cards', async ({ page }) => {
    await page.goto('/academy');

    expect(await page.locator('text=👥 ILT Cohorts').isVisible()).toBe(true);
    expect(await page.locator('text=📚 Self-Paced Courses').isVisible()).toBe(true);
    expect(await page.locator('text=🎯 Quiz Tool').isVisible()).toBe(true);
  });

  test('Product cards display correct descriptions', async ({ page }) => {
    await page.goto('/academy');

    expect(
      await page.locator('text=Instructor-led training with live instructors').isVisible(),
    ).toBe(true);
    expect(
      await page.locator('text=Learn at your own pace with our comprehensive course catalog').isVisible(),
    ).toBe(true);
  });
});

test.describe('ILT Courses - Public Browsing', () => {
  test('ILT card has "Public" badge', async ({ page }) => {
    await page.goto('/academy');

    expect(await page.locator('text=Public').isVisible()).toBe(true);
  });

  test('ILT link navigates to /academy/ilt', async ({ page }) => {
    await page.goto('/academy');

    await page.locator('text=ILT Cohorts').click();
    await page.waitForURL('**/academy/ilt');

    expect(page.url()).toContain('/academy/ilt');
  });

  test('ILT page displays courses without login', async ({ page }) => {
    await page.goto('/academy/ilt');

    // Verify courses are visible
    expect(await page.locator('text=Agile Fundamentals').isVisible()).toBe(true);
    expect(await page.locator('text=Scrum Master Essentials').isVisible()).toBe(true);
    expect(await page.locator('text=AI Strategy for Executives').isVisible()).toBe(true);
    expect(await page.locator('text=Advanced Machine Learning').isVisible()).toBe(true);
  });

  test('Each course card shows required information', async ({ page }) => {
    await page.goto('/academy/ilt');

    // Check first course (Agile Fundamentals)
    const firstCourseCard = page.locator('div:has-text("Agile Fundamentals")').first();

    expect(await firstCourseCard.locator('text=Sarah Chen').isVisible()).toBe(true);
    expect(await firstCourseCard.locator('text=£299').isVisible()).toBe(true);
    expect(await firstCourseCard.locator('text=4 weeks').isVisible()).toBe(true);
    expect(await firstCourseCard.locator('text=/Next Cohorts/').isVisible()).toBe(true);
  });

  test('Each course displays next cohorts with dates', async ({ page }) => {
    await page.goto('/academy/ilt');

    // Verify cohort dates are displayed
    expect(await page.locator('text=/Sep \d+, \d+/').isVisible()).toBe(true);
    expect(await page.locator('text=/seats available/').isVisible()).toBe(true);
  });

  test('"Enroll Now" buttons are visible on all courses', async ({ page }) => {
    await page.goto('/academy/ilt');

    const enrollButtons = await page.locator('button:has-text("Enroll Now")');
    expect(await enrollButtons.count()).toBeGreaterThanOrEqual(4);
  });

  test('Back to Academy link works', async ({ page }) => {
    await page.goto('/academy/ilt');

    await page.locator('text=Back to Academy').click();
    await page.waitForURL('**/academy');

    expect(page.url()).toContain('/academy');
  });

  test('Contact Sales button is visible', async ({ page }) => {
    await page.goto('/academy/ilt');

    expect(await page.locator('text=Contact Sales').isVisible()).toBe(true);
  });
});

test.describe('Auth-Gated Products', () => {
  test('Self-Paced card shows "Login Required" badge', async ({ page }) => {
    await page.goto('/academy');

    const loginRequiredBadges = await page.locator('text=Login Required');
    expect(await loginRequiredBadges.count()).toBeGreaterThanOrEqual(1);
  });

  test('Self-Paced link redirects to login', async ({ page }) => {
    await page.goto('/academy');

    await page.locator('text=Self-Paced Courses').click();
    await page.waitForURL('**/auth/login**');

    expect(page.url()).toContain('/auth/login');
    expect(page.url()).toContain('redirect=/academy/self-paced');
  });

  test('Quiz card shows "Login Required" badge', async ({ page }) => {
    await page.goto('/academy');

    const loginRequiredBadges = await page.locator('text=Login Required');
    expect(await loginRequiredBadges.count()).toBeGreaterThanOrEqual(1);
  });

  test('Quiz link redirects to login', async ({ page }) => {
    await page.goto('/academy');

    await page.locator('text=🎯 Quiz Tool').click();
    await page.waitForURL('**/auth/login**');

    expect(page.url()).toContain('/auth/login');
    expect(page.url()).toContain('redirect=/academy/quiz');
  });
});

test.describe('Authenticated User Experience - Instructor', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set instructor token in storage
    await context.addInitScript(() => {
      localStorage.setItem('instructorToken', 'fake-token-for-testing');
      localStorage.setItem('instructorEmail', 'instructor@dailyagile.com');
    });
  });

  test('Instructor sees personalized welcome message', async ({ page }) => {
    await page.goto('/academy');

    expect(await page.locator('text=/Welcome back/').isVisible()).toBe(true);
  });

  test('Header shows username instead of login button', async ({ page }) => {
    await page.goto('/academy');

    expect(await page.locator('text=instructor').isVisible()).toBe(true);
    expect(await page.locator('text=Log In / Sign Up').isVisible()).toBe(false);
  });

  test('Header subtitle shows "Instructor Dashboard"', async ({ page }) => {
    await page.goto('/academy');

    expect(await page.locator('text=Instructor Dashboard').isVisible()).toBe(true);
  });
});

test.describe('Responsive Design', () => {
  test('Dashboard renders on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/academy');

    // Verify key elements are visible
    expect(await page.locator('h1:has-text("DailyAgile Academy")').isVisible()).toBe(true);
    expect(await page.locator('text=👥 ILT Cohorts').isVisible()).toBe(true);
  });

  test('ILT courses page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/academy/ilt');

    // Verify courses still display
    expect(await page.locator('text=Agile Fundamentals').isVisible()).toBe(true);
  });

  test('Dashboard renders on tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/academy');

    expect(await page.locator('h1:has-text("DailyAgile Academy")').isVisible()).toBe(true);
  });

  test('Dashboard renders on desktop (1200px)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/academy');

    expect(await page.locator('h1:has-text("DailyAgile Academy")').isVisible()).toBe(true);
  });
});

test.describe('Performance & Loading', () => {
  test('Academy page loads in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/academy');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('ILT page loads in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/academy/ilt');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('No console errors on academy page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/academy');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('No console errors on ILT page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/academy/ilt');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});

test.describe('Accessibility', () => {
  test('All links are keyboard accessible', async ({ page }) => {
    await page.goto('/academy');

    // Tab through page
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    expect(['A', 'BUTTON']).toContain(focusedElement);
  });

  test('Product cards have proper semantic structure', async ({ page }) => {
    await page.goto('/academy');

    // Check for heading hierarchy
    expect(await page.locator('h1').isVisible()).toBe(true);
    expect(await page.locator('h2').isVisible()).toBe(true);
  });
});
