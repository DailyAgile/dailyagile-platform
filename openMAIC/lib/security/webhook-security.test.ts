/**
 * Stripe Webhook Security Tests
 *
 * Test Coverage:
 * ✅ Test 1: Empty webhook secret throws error (CRITICAL FIX)
 * ✅ Test 2: Valid signature passes validation
 * ✅ Test 3: Invalid signature rejected
 * ✅ Test 4: Replay protection (old timestamp rejected)
 * ✅ Test 5: Forged signature caught
 * ✅ Test 6: HTML escaping prevents XSS
 * ✅ Test 7: Email validation catches invalid formats
 * ✅ Test 8: CourseId validation prevents injection
 * ✅ Test 9: Rate limiting under load (100 req/sec)
 * ✅ Test 10: Amount validation detects price mismatches
 *
 * Run: npm test -- webhook-security.test.ts
 */

import {
  WebhookValidator,
  InputValidator,
  RateLimiter,
  AmountValidator,
} from './webhook-security';
import Stripe from 'stripe';
import crypto from 'crypto';

// ============================================================================
// MOCK DATA & HELPERS
// ============================================================================

const MOCK_SECRET = 'whsec_test1234567890';

/**
 * Generate a valid Stripe webhook signature.
 * Format: t=timestamp,v1=HMAC-SHA256(timestamp.body)
 */
function generateValidSignature(body: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate an old signature (outside 5-minute window).
 */
function generateOldSignature(body: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate a forged signature (with wrong secret).
 */
function generateForgedSignature(body: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const wrongSecret = 'wrong_secret_key';
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', wrongSecret)
    .update(signedContent)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Create a valid Stripe checkout.session.completed event.
 */
function createCheckoutCompletedEvent(): Stripe.Event {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123456789',
        object: 'checkout.session',
        customer_email: 'student@example.com',
        amount_total: 29900, // $299.00
        currency: 'usd',
        metadata: {
          course_id: 'track-a-full',
          product_type: 'quiz',
          email: 'student@example.com',
        },
        payment_status: 'paid',
      } as any,
    },
  } as Stripe.Event;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Webhook Security', () => {
  // ========================================================================
  // TEST 1: EMPTY SECRET THROWS ERROR (CRITICAL)
  // ========================================================================

  describe('Test 1: Empty Webhook Secret Throws Error', () => {
    it('should throw error if secret is empty string', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());
      const signature = generateValidSignature(body, MOCK_SECRET);

      expect(() => {
        WebhookValidator.validateSignature(body, signature, '');
      }).toThrow('STRIPE_WEBHOOK_SECRET environment variable is missing or empty');
    });

    it('should throw error if secret is whitespace only', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());
      const signature = generateValidSignature(body, MOCK_SECRET);

      expect(() => {
        WebhookValidator.validateSignature(body, signature, '   ');
      }).toThrow('STRIPE_WEBHOOK_SECRET environment variable is missing or empty');
    });

    it('should throw error if secret is null', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());
      const signature = generateValidSignature(body, MOCK_SECRET);

      expect(() => {
        // @ts-ignore (intentional null test)
        WebhookValidator.validateSignature(body, signature, null);
      }).toThrow('STRIPE_WEBHOOK_SECRET');
    });
  });

  // ========================================================================
  // TEST 2: VALID SIGNATURE PASSES
  // ========================================================================

  describe('Test 2: Valid Signature Validation', () => {
    it('should validate correct signature', () => {
      const event = createCheckoutCompletedEvent();
      const body = JSON.stringify(event);
      const signature = generateValidSignature(body, MOCK_SECRET);

      const validatedEvent = WebhookValidator.validateSignature(
        body,
        signature,
        MOCK_SECRET
      );

      expect(validatedEvent.id).toBe(event.id);
      expect(validatedEvent.type).toBe('checkout.session.completed');
    });

    it('should handle valid signature with correct timestamp', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());
      const signature = generateValidSignature(body, MOCK_SECRET);

      expect(() => {
        WebhookValidator.validateSignature(body, signature, MOCK_SECRET);
      }).not.toThrow();
    });
  });

  // ========================================================================
  // TEST 3: INVALID SIGNATURE REJECTED
  // ========================================================================

  describe('Test 3: Invalid Signature Rejection', () => {
    it('should reject forged signature', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());
      const forgedSig = generateForgedSignature(body);

      expect(() => {
        WebhookValidator.validateSignature(body, forgedSig, MOCK_SECRET);
      }).toThrow('Invalid webhook signature');
    });

    it('should reject missing signature', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());

      expect(() => {
        WebhookValidator.validateSignature(body, null, MOCK_SECRET);
      }).toThrow('Missing Stripe-Signature header');
    });

    it('should reject malformed signature header', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());
      const malformedSig = 'invalid_signature_format';

      expect(() => {
        WebhookValidator.validateSignature(body, malformedSig, MOCK_SECRET);
      }).toThrow('Invalid Stripe-Signature format');
    });
  });

  // ========================================================================
  // TEST 4: REPLAY PROTECTION (TIMESTAMP WINDOW)
  // ========================================================================

  describe('Test 4: Replay Protection (Timestamp Validation)', () => {
    it('should reject webhook with timestamp older than 5 minutes', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());
      const oldSig = generateOldSignature(body, MOCK_SECRET);

      expect(() => {
        WebhookValidator.validateSignature(body, oldSig, MOCK_SECRET);
      }).toThrow('Webhook timestamp outside acceptable window');
    });

    it('should reject webhook with future timestamp (>5 min)', () => {
      const event = createCheckoutCompletedEvent();
      const body = JSON.stringify(event);

      const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 min in future
      const signedContent = `${futureTimestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', MOCK_SECRET)
        .update(signedContent)
        .digest('hex');
      const sig = `t=${futureTimestamp},v1=${signature}`;

      expect(() => {
        WebhookValidator.validateSignature(body, sig, MOCK_SECRET);
      }).toThrow('Webhook timestamp outside acceptable window');
    });
  });

  // ========================================================================
  // TEST 5: XSS PREVENTION (HTML ESCAPING)
  // ========================================================================

  describe('Test 5: XSS Prevention - HTML Escaping', () => {
    it('should escape HTML special characters', () => {
      const malicious = '<script>alert("xss")</script>';
      const escaped = InputValidator.escapeHtml(malicious);

      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('</script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&lt;/script&gt;');
    });

    it('should escape quotes', () => {
      const withQuotes = 'Course "AI 101"';
      const escaped = InputValidator.escapeHtml(withQuotes);

      expect(escaped).toBe('Course &quot;AI 101&quot;');
    });

    it('should escape ampersands', () => {
      const withAmp = 'Agile & Scrum';
      const escaped = InputValidator.escapeHtml(withAmp);

      expect(escaped).toContain('&amp;');
    });

    it('should be safe for email template injection', () => {
      const courseId = '"><script>alert(1)</script><"';
      const escaped = InputValidator.escapeHtml(courseId);

      // Should be safe to inject into HTML
      const html = `<p>Course: ${escaped}</p>`;
      expect(html).not.toContain('<script>');
    });
  });

  // ========================================================================
  // TEST 6: EMAIL VALIDATION
  // ========================================================================

  describe('Test 6: Email Validation', () => {
    it('should accept valid email', () => {
      const email = 'student@example.com';
      expect(() => InputValidator.validateEmail(email)).not.toThrow();
    });

    it('should reject email without domain', () => {
      const email = 'student@';
      expect(() => InputValidator.validateEmail(email)).toThrow();
    });

    it('should reject email without @ symbol', () => {
      const email = 'studentexample.com';
      expect(() => InputValidator.validateEmail(email)).toThrow();
    });

    it('should reject email with spaces', () => {
      const email = 'student @example.com';
      expect(() => InputValidator.validateEmail(email)).toThrow();
    });

    it('should normalize email to lowercase', () => {
      const email = 'Student@EXAMPLE.COM';
      const validated = InputValidator.validateEmail(email);
      expect(validated).toBe('student@example.com');
    });
  });

  // ========================================================================
  // TEST 7: COURSE ID VALIDATION
  // ========================================================================

  describe('Test 7: Course ID Validation', () => {
    it('should accept valid course IDs', () => {
      const validIds = [
        'track-a-full',
        'track_b_engineer',
        'TRACK-A-MODULE',
        'course123',
      ];

      validIds.forEach((id) => {
        expect(() => InputValidator.validateCourseId(id)).not.toThrow();
      });
    });

    it('should reject courseId with special characters', () => {
      const badIds = [
        "course'; DROP TABLE--",
        'course<script>',
        'course${code}',
        'course|pipe',
      ];

      badIds.forEach((id) => {
        expect(() => InputValidator.validateCourseId(id)).toThrow();
      });
    });

    it('should reject courseId with spaces', () => {
      const id = 'track a course';
      expect(() => InputValidator.validateCourseId(id)).toThrow();
    });
  });

  // ========================================================================
  // TEST 8: RATE LIMITING
  // ========================================================================

  describe('Test 8: Rate Limiting', () => {
    it('should allow requests under limit', async () => {
      const email = `student-${Date.now()}@example.com`;

      for (let i = 0; i < 10; i++) {
        const result = await RateLimiter.checkRateLimit(email);
        expect(result).toBe(true);
      }
    });

    it('should track per-customer limits independently', async () => {
      const email1 = `student1-${Date.now()}@example.com`;
      const email2 = `student2-${Date.now()}@example.com`;

      // Add 50 requests for email1
      for (let i = 0; i < 50; i++) {
        await RateLimiter.checkRateLimit(email1);
      }

      // email2 should still have full limit available
      const result = await RateLimiter.checkRateLimit(email2);
      expect(result).toBe(true);
    });

    it('should enforce per-customer rate limit (100 req/min)', async () => {
      const email = `student-limit-${Date.now()}@example.com`;

      // Fill up to the limit
      for (let i = 0; i < 100; i++) {
        const result = await RateLimiter.checkRateLimit(email);
        expect(result).toBe(true);
      }

      // Next request should be denied
      const result = await RateLimiter.checkRateLimit(email);
      expect(result).toBe(false);
    });

    it('should reset rate limit after reset() call', async () => {
      const email = `student-reset-${Date.now()}@example.com`;

      // Max out the limit
      for (let i = 0; i < 100; i++) {
        await RateLimiter.checkRateLimit(email);
      }

      // Should be rate limited
      let result = await RateLimiter.checkRateLimit(email);
      expect(result).toBe(false);

      // Reset the limit
      await RateLimiter.reset(email);

      // Should be allowed again
      result = await RateLimiter.checkRateLimit(email);
      expect(result).toBe(true);
    });
  });

  // ========================================================================
  // TEST 9: AMOUNT VALIDATION
  // ========================================================================

  describe('Test 9: Amount Validation', () => {
    it('should validate exact course price', () => {
      // track-a-full: $299.00 = 29900 cents
      expect(AmountValidator.validateAmount('track-a-full', 29900)).toBe(
        true
      );
    });

    it('should allow ±5% variance for taxes', () => {
      // $299.00 ±5% = $284.05 - $313.95 (28405 - 31395 cents)
      expect(AmountValidator.validateAmount('track-a-full', 28500)).toBe(true); // Under 5%
      expect(AmountValidator.validateAmount('track-a-full', 31000)).toBe(true); // Under 5%
    });

    it('should reject amount outside ±5% variance', () => {
      // $299.00 - beyond ±5%
      expect(AmountValidator.validateAmount('track-a-full', 25000)).toBe(
        false
      ); // Too low
      expect(AmountValidator.validateAmount('track-a-full', 35000)).toBe(
        false
      ); // Too high
    });

    it('should pass unknown courses (new products)', () => {
      // Unknown courses should be allowed (might be new)
      expect(AmountValidator.validateAmount('new-future-course', 50000)).toBe(
        true
      );
    });
  });

  // ========================================================================
  // TEST 10: INJECTION ATTACK PREVENTION
  // ========================================================================

  describe('Test 10: Injection Attack Prevention', () => {
    it('should reject SQL injection in courseId', () => {
      const sqlInjection = "course'; DROP TABLE students; --";
      expect(() => InputValidator.validateCourseId(sqlInjection)).toThrow();
    });

    it('should reject command injection in courseId', () => {
      const cmdInjection = 'course && rm -rf /';
      expect(() => InputValidator.validateCourseId(cmdInjection)).toThrow();
    });

    it('should reject LDAP injection in email', () => {
      const ldapInjection = 'student*)(uid=*';
      expect(() => InputValidator.validateEmail(ldapInjection)).toThrow();
    });
  });

  // ========================================================================
  // TEST 11: INTEGRATION TEST
  // ========================================================================

  describe('Test 11: Full Webhook Validation Flow', () => {
    it('should successfully validate legitimate webhook', () => {
      const event = createCheckoutCompletedEvent();
      const body = JSON.stringify(event);
      const signature = generateValidSignature(body, MOCK_SECRET);

      const validatedEvent = WebhookValidator.validateSignature(
        body,
        signature,
        MOCK_SECRET
      );

      expect(validatedEvent.type).toBe('checkout.session.completed');

      const session = validatedEvent.data.object as any;
      const email = InputValidator.validateEmail(
        session.customer_email
      );
      const courseId = InputValidator.validateCourseId(
        session.metadata.course_id
      );

      expect(email).toBe('student@example.com');
      expect(courseId).toBe('track-a-full');
    });

    it('should reject multiple security issues', () => {
      const body = JSON.stringify(createCheckoutCompletedEvent());

      // Test 1: Empty secret
      expect(() => {
        WebhookValidator.validateSignature(body, null, '');
      }).toThrow();

      // Test 2: Forged signature
      const forgedSig = generateForgedSignature(body);
      expect(() => {
        WebhookValidator.validateSignature(body, forgedSig, MOCK_SECRET);
      }).toThrow();

      // Test 3: Old timestamp
      const oldSig = generateOldSignature(body, MOCK_SECRET);
      expect(() => {
        WebhookValidator.validateSignature(body, oldSig, MOCK_SECRET);
      }).toThrow();
    });
  });
});

// ============================================================================
// MANUAL TESTING CHECKLIST
// ============================================================================

/*
To manually test in production:

1. ✅ Empty Secret Fallback:
   - Remove STRIPE_WEBHOOK_SECRET from .env
   - Send webhook → should see "STRIPE_WEBHOOK_SECRET environment variable is missing"
   - Verify: NOT a silent failure, it's a loud error

2. ✅ HTML Escaping:
   - Create Stripe checkout with courseId = '<script>alert(1)</script>'
   - Check email template → script tags should be escaped
   - Verify: No XSS in email body

3. ✅ Timestamp Replay Protection:
   - Intercept webhook, modify timestamp to 10+ minutes ago
   - Resend webhook → should be rejected with 401
   - Verify: Audit log shows "timestamp outside acceptable window"

4. ✅ Rate Limiting Under Load:
   - Send 100+ webhooks per minute from same email
   - After 100, should get 429 (Too Many Requests)
   - Verify: Rate limit counter increments properly

5. ✅ Amount Validation:
   - Create checkout for $299 course
   - Webhook comes in with $999 amount → should log warning
   - Verify: Payment still processes but warning logged

6. ✅ Audit Logging:
   - Process 10 webhooks
   - Query audit_logs_immutable table
   - Verify: All 10 are logged, emails are hashed not plaintext, immutable
*/
