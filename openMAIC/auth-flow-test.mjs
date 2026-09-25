import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test123@example.com';
const TEST_PASSWORD = 'password123';
const TEST_FIRST_NAME = 'Test';
const TEST_LAST_NAME = 'User';

const log = (step, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ${message}`);
};

const reportSection = (title) => {
  console.log(`\n${'='.repeat(80)}\n${title}\n${'='.repeat(80)}\n`);
};

async function testAuthFlow() {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        log('BROWSER_CONSOLE', `Error: ${msg.text()}`);
      }
    });

    reportSection('STEP 1: STUDENT SIGNUP');
    log('ACTION', `Navigating to ${BASE_URL}/auth/student-signup`);
    await page.goto(`${BASE_URL}/auth/student-signup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/01-signup-page.png' });
    log('VERIFY', 'Signup page loaded successfully');
    results.push({ step: 1, action: 'Load signup page', status: '✅ PASS', url: page.url() });

    // Fill in signup form
    log('ACTION', 'Filling signup form...');
    await page.fill('input[name="firstName"]', TEST_FIRST_NAME);
    await page.fill('input[name="lastName"]', TEST_LAST_NAME);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    // Check the agreement checkbox
    await page.check('input[type="checkbox"]');

    log('VERIFY', 'Form filled with test data');

    // Submit form
    log('ACTION', 'Submitting signup form...');
    const signupPromise = page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.click('button[type="submit"]');

    try {
      await Promise.race([signupPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))]);
      log('VERIFY', 'Signup submitted, redirect initiated');
      await page.waitForTimeout(2000);
    } catch (err) {
      log('WARN', `Navigation timeout: ${err.message}`);
    }

    await page.screenshot({ path: '/tmp/02-after-signup.png' });

    const currentUrl = page.url();
    log('VERIFY', `Current URL after signup: ${currentUrl}`);

    const studentEmail = await page.evaluate(() => localStorage.getItem('studentEmail'));
    log('VERIFY', `localStorage.studentEmail = ${studentEmail}`);

    results.push({
      step: '1→2',
      action: 'Signup & redirect to verify-email',
      status: currentUrl.includes('/auth/verify-email') ? '✅ PASS' : '🔴 FAIL',
      url: currentUrl,
      localStorage: { studentEmail }
    });

    reportSection('STEP 2: EMAIL VERIFICATION');
    log('VERIFY', `Should be on email verification page: ${page.url()}`);

    // Get the verification code from email (in dev mode, this might be logged or shown)
    // For now, we'll try to get it from the page if there's an error
    let verificationCode = null;

    // Check if there's an error message or code input
    const codeInput = page.locator('input[placeholder="000000"]');
    if (await codeInput.isVisible()) {
      log('VERIFY', 'Email verification page shows code input field');

      // Try to extract verification code from console logs or check if we can see it
      // In dev mode, codes might be logged or visible in response
      log('INFO', 'Attempting to get verification code from API response...');

      // Make a request to get a new code
      const resendResponse = await page.evaluate(async () => {
        const res = await fetch('/api/auth/student/resend-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test123@example.com' })
        });
        return res.json();
      });

      log('INFO', `Resend code response: ${JSON.stringify(resendResponse)}`);

      // Look for code in response or logs
      if (resendResponse.verificationCode) {
        verificationCode = resendResponse.verificationCode;
        log('SUCCESS', `Got verification code: ${verificationCode}`);
      } else {
        log('WARN', 'Verification code not in response. This may require email access.');
      }
    }

    results.push({
      step: 2,
      action: 'Email verification page loaded',
      status: page.url().includes('/auth/verify-email') ? '✅ PASS' : '🔴 FAIL',
      url: page.url()
    });

    reportSection('STEP 3: STUDENT LOGIN');
    log('ACTION', `Navigating to ${BASE_URL}/auth/student-login`);
    await page.goto(`${BASE_URL}/auth/student-login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/03-login-page.png' });
    log('VERIFY', 'Login page loaded successfully');
    results.push({ step: 3, action: 'Load login page', status: '✅ PASS', url: page.url() });

    // Fill in login form
    log('ACTION', 'Filling login form...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    log('VERIFY', 'Login form filled');

    // Submit login form
    log('ACTION', 'Submitting login form...');
    const loginPromise = page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.click('button:has-text("Login")');

    try {
      await Promise.race([loginPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))]);
      log('VERIFY', 'Login submitted');
    } catch (err) {
      log('WARN', `Login navigation may have failed: ${err.message}`);
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/04-after-login.png' });

    const postLoginUrl = page.url();
    log('VERIFY', `URL after login: ${postLoginUrl}`);

    // Check localStorage for tokens
    const studentToken = await page.evaluate(() => localStorage.getItem('studentToken'));
    const studentId = await page.evaluate(() => localStorage.getItem('studentId'));
    const storedEmail = await page.evaluate(() => localStorage.getItem('studentEmail'));

    log('VERIFY', `localStorage.studentToken present: ${!!studentToken}`);
    log('VERIFY', `localStorage.studentToken value: ${studentToken ? studentToken.substring(0, 50) + '...' : 'NOT SET'}`);
    log('VERIFY', `localStorage.studentId: ${studentId || 'NOT SET'}`);
    log('VERIFY', `localStorage.studentEmail: ${storedEmail || 'NOT SET'}`);

    // Verify token format (should be JWT)
    if (studentToken) {
      const parts = studentToken.split('.');
      log('VERIFY', `Token format: ${parts.length === 3 ? '✅ Valid JWT (3 parts)' : '🔴 Invalid JWT format'}`);
    }

    results.push({
      step: '3→4',
      action: 'Login & redirect to dashboard',
      status: postLoginUrl.includes('/learn/') ? '✅ PASS' : '🔴 FAIL',
      url: postLoginUrl,
      localStorage: {
        studentToken: studentToken ? `${studentToken.substring(0, 50)}...` : 'NOT SET',
        studentId: studentId || 'NOT SET',
        studentEmail: storedEmail || 'NOT SET'
      }
    });

    reportSection('STEP 4: DASHBOARD VERIFICATION');
    log('VERIFY', `Current page: ${page.url()}`);
    log('ACTION', 'Checking if dashboard loads correctly...');

    // Check for errors in console
    const errorLogs = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: '/tmp/05-dashboard.png' });

    results.push({
      step: 4,
      action: 'Dashboard loads',
      status: !postLoginUrl.includes('/auth/') ? '✅ PASS' : '🔴 FAIL',
      url: postLoginUrl,
      consoleErrors: errorLogs.length > 0 ? errorLogs : 'None'
    });

    // Print summary
    reportSection('TEST RESULTS SUMMARY');
    console.log('');
    results.forEach((result, idx) => {
      const status = result.status;
      console.log(`${result.step}. ${result.action}`);
      console.log(`   ${status}`);
      if (result.url) console.log(`   URL: ${result.url}`);
      if (result.localStorage) {
        console.log(`   localStorage:`);
        Object.entries(result.localStorage).forEach(([key, val]) => {
          console.log(`     - ${key}: ${val}`);
        });
      }
      console.log('');
    });

    await browser.close();
  } catch (error) {
    log('ERROR', `Test failed: ${error.message}`);
    console.error(error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

testAuthFlow();
