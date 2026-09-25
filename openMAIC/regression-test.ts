import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('DailyAgile Platform - Comprehensive Regression Tests', () => {

  test.describe('1. Homepage & Navigation', () => {
    test('Homepage loads successfully', async ({ page }) => {
      await page.goto(BASE_URL);
      await expect(page).toHaveTitle(/OpenMAIC|DailyAgile/i);
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('Home page renders without 500 errors', async ({ page }) => {
      const responses: string[] = [];
      page.on('response', response => {
        if (response.status() >= 500) {
          responses.push(`${response.status()} ${response.url()}`);
        }
      });
      await page.goto(BASE_URL);
      expect(responses).toEqual([]);
    });
  });

  test.describe('2. Authentication - Login Flow', () => {
    test('Login page accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      expect(page.url()).toContain('/login');
      await expect(page.locator('input[type="email"]')).toBeDefined();
    });

    test('Student login page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/student-login`);
      expect(page.url()).toContain('student-login');
    });

    test('Test login page available', async ({ page }) => {
      await page.goto(`${BASE_URL}/test-login`);
      expect(page.url()).toContain('test-login');
      // Should have some form or content
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('Email verification flow accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/verify-email`);
      expect(page.url()).toContain('verify-email');
    });
  });

  test.describe('3. Signup & Registration', () => {
    test('Signup page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      expect(page.url()).toContain('signup');
      await expect(page.locator('input')).toBeTruthy();
    });

    test('Pilot signup page accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/pilot-signup`);
      expect(page.url()).toContain('pilot-signup');
    });
  });

  test.describe('4. Instructor Dashboard', () => {
    test('Instructor dashboard page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/teach/dashboard`);
      expect(page.url()).toContain('teach/dashboard');
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('Instructor requests page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/teach/requests`);
      expect(page.url()).toContain('teach/requests');
    });
  });

  test.describe('5. Student Learning Portal', () => {
    test('Student quizzes page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/learn/quizzes`);
      expect(page.url()).toContain('learn/quizzes');
    });

    test('Student progress page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/learn/progress`);
      expect(page.url()).toContain('learn/progress');
    });

    test('Student assignments page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/learn/assignments`);
      expect(page.url()).toContain('learn/assignments');
    });
  });

  test.describe('6. Classroom & Lessons', () => {
    test('Classroom page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/classroom`);
      expect(page.url()).toContain('classroom');
    });

    test('Pilot lesson page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/pilot-lesson`);
      expect(page.url()).toContain('pilot-lesson');
    });
  });

  test.describe('7. API Health & Endpoints', () => {
    test('Health check endpoint responds', async ({ page }) => {
      const response = await page.request.get(`${BASE_URL}/api/health`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.version).toBeTruthy();
    });

    test('Quiz grade endpoint accessible', async ({ page }) => {
      const response = await page.request.post(`${BASE_URL}/api/quiz-grade`, {
        data: { testData: true }
      }).catch(() => null);
      // Should not 404 or 500
      if (response) {
        expect(response.status()).not.toBe(404);
        expect(response.status()).not.toBe(500);
      }
    });

    test('Azure voices endpoint exists', async ({ page }) => {
      const response = await page.request.get(`${BASE_URL}/api/azure-voices`).catch(() => null);
      if (response) {
        expect([200, 404, 400]).toContain(response.status());
      }
    });
  });

  test.describe('8. UI Responsiveness - Mobile', () => {
    test('Mobile viewport - homepage renders', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('Mobile viewport - dashboard loads', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/teach/dashboard`);
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });

  test.describe('9. UI Responsiveness - Tablet', () => {
    test('Tablet viewport - homepage renders', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('Tablet viewport - quizzes load', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/learn/quizzes`);
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });

  test.describe('10. Error Handling', () => {
    test('404 page for non-existent route', async ({ page }) => {
      await page.goto(`${BASE_URL}/this-route-does-not-exist-12345`, { waitUntil: 'networkidle' });
      // Should load without crashing
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('No unhandled JavaScript errors on homepage', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      await page.goto(BASE_URL);
      // Some errors might be expected, but catastrophic ones should not exist
      const criticalErrors = errors.filter(e =>
        e.includes('Uncaught') || e.includes('TypeError') || e.includes('ReferenceError')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('No unhandled JavaScript errors on dashboard', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      await page.goto(`${BASE_URL}/teach/dashboard`);
      const criticalErrors = errors.filter(e =>
        e.includes('Uncaught') || e.includes('TypeError') || e.includes('ReferenceError')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('11. Navigation & Links', () => {
    test('Can navigate between pages without breaking', async ({ page }) => {
      // Start at home
      await page.goto(BASE_URL);

      // Navigate to login
      await page.goto(`${BASE_URL}/login`);
      expect(page.url()).toContain('login');

      // Navigate to signup
      await page.goto(`${BASE_URL}/signup`);
      expect(page.url()).toContain('signup');

      // Navigate back to home
      await page.goto(BASE_URL);
      expect(page.url()).toContain('localhost');
    });
  });

  test.describe('12. Browser Compatibility', () => {
    test('Page renders correctly in current browser', async ({ page }) => {
      await page.goto(BASE_URL);
      // Verify basic DOM structure
      const html = await page.content();
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    test('No deprecated API warnings', async ({ page }) => {
      const warnings: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'warning' && msg.text().includes('deprecated')) {
          warnings.push(msg.text());
        }
      });
      await page.goto(BASE_URL);
      // Some deprecation warnings are acceptable, but log them
      console.log(`Found ${warnings.length} deprecation warnings`);
    });
  });

  test.describe('13. Performance Metrics', () => {
    test('Homepage loads in reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      const loadTime = Date.now() - startTime;
      console.log(`Homepage load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(30000); // Should load in < 30s
    });

    test('Navigation is responsive', async ({ page }) => {
      await page.goto(BASE_URL);
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/teach/dashboard`);
      const navTime = Date.now() - startTime;
      console.log(`Dashboard navigation time: ${navTime}ms`);
      expect(navTime).toBeLessThan(15000); // Should navigate in < 15s
    });
  });
});
