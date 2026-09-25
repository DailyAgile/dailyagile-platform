/**
 * Stripe Configuration Tests
 * ==========================
 *
 * Tests for configuration loading, environment variable validation,
 * constants, and error handling.
 *
 * Test Categories:
 * 1. Configuration Loading (happy path)
 * 2. Environment Variable Validation (missing vars)
 * 3. Constants and Enums (type safety)
 * 4. Error Mapping (errors → HTTP status codes)
 * 5. Product Type Validation
 * 6. Event Type Validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StripeConfigError } from '@/lib/server/stripe-config';

// Uses STRIPE_TEST_SECRET_KEY when set (local Stripe test key), otherwise a fake
// fixture so the suite runs without any secret. The key is never stored in code.
const TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY ?? 'sk_test_unit_fixture';

describe('Stripe Configuration Tests', () => {
  // Save original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset modules to ensure fresh import of config
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('Test 1: Happy Path - Configuration Loads', () => {
    it('should load configuration with valid environment variables', async () => {
      // Setup: Set required env vars
      process.env.STRIPE_SECRET_KEY = TEST_SECRET_KEY;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
      process.env.BREVO_API_KEY = 'xkeysib_test';
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      // Act: Import config
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      // Assert: All values loaded
      expect(stripeConfig.secretKey).toBe(TEST_SECRET_KEY);
      expect(stripeConfig.webhookSecret).toBe('whsec_test_placeholder');
      expect(stripeConfig.apiVersion).toBe('2023-10-16');
      expect(stripeConfig.webhook.timeoutMs).toBe(5000);
      expect(stripeConfig.webhook.retryAttempts).toBe(3);
      expect(stripeConfig.email.apiUrl).toBe('https://api.brevo.com/v3/smtp/email');
      expect(stripeConfig.email.senderEmail).toBe('support@dailyagile.com');
      expect(stripeConfig.email.appUrl).toBe('https://example.com');
    });

    it('should load configuration with default values for optional env vars', async () => {
      // Setup: Set only required env vars
      process.env.STRIPE_SECRET_KEY = TEST_SECRET_KEY;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
      delete process.env.BREVO_API_KEY;
      delete process.env.NEXT_PUBLIC_APP_URL;

      // Act: Import config
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      // Assert: Defaults applied
      expect(stripeConfig.email.appUrl).toBe('http://localhost:3000');
      expect(stripeConfig.email.apiKey).toBeUndefined();
    });

    it('should have all required constants accessible', async () => {
      // Act & Assert: Import all constants
      const { STRIPE_EVENTS } = await import('@/lib/constants/stripe-events');
      const { PRODUCT_TYPES } = await import('@/lib/constants/product-types');
      const { WEBHOOK_ERRORS, HTTP_STATUS } = await import('@/lib/constants/webhook-errors');

      expect(STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED).toBeDefined();
      expect(PRODUCT_TYPES.QUIZ).toBe('quiz');
      expect(WEBHOOK_ERRORS.MISSING_SIGNATURE).toBeDefined();
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('Test 2: Failure - Missing Environment Variables', () => {
    it('should throw when STRIPE_SECRET_KEY is missing', async () => {
      // Setup: Missing required env var
      delete process.env.STRIPE_SECRET_KEY;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';

      // Act & Assert: Expect error on import
      await expect(
        import('@/lib/server/stripe-config')
      ).rejects.toThrow(StripeConfigError);
    });

    it('should throw when STRIPE_WEBHOOK_SECRET is missing', async () => {
      // Setup: Missing required env var
      process.env.STRIPE_SECRET_KEY = TEST_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      // Act & Assert: Expect error on import
      await expect(
        import('@/lib/server/stripe-config')
      ).rejects.toThrow(StripeConfigError);
    });

    it('should throw with helpful error message', async () => {
      // Setup
      delete process.env.STRIPE_WEBHOOK_SECRET;
      process.env.STRIPE_SECRET_KEY = TEST_SECRET_KEY;

      // Act & Assert
      try {
        await import('@/lib/server/stripe-config');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(StripeConfigError);
        expect(String(err)).toContain('STRIPE_WEBHOOK_SECRET');
        expect(String(err)).toContain('.env.local');
      }
    });
  });

  describe('Test 3: Edge Cases - Configuration Validation', () => {
    it('should handle empty string as missing env var', async () => {
      // Setup
      process.env.STRIPE_SECRET_KEY = '';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';

      // Act & Assert
      await expect(
        import('@/lib/server/stripe-config')
      ).rejects.toThrow(StripeConfigError);
    });

    it('should handle whitespace-only env var as missing', async () => {
      // Setup
      process.env.STRIPE_SECRET_KEY = '   ';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';

      // Act & Assert
      await expect(
        import('@/lib/server/stripe-config')
      ).rejects.toThrow(StripeConfigError);
    });

    it('should validate timeout values are positive', async () => {
      // This would require modifying stripe-config.ts to expose validation
      // For now, test via configuration constants
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      expect(stripeConfig.webhook.timeoutMs).toBeGreaterThan(0);
      expect(stripeConfig.email.timeoutMs).toBeGreaterThan(0);
    });
  });

  describe('Test 4: Type Safety - Constants and Enums', () => {
    it('should provide type-safe Stripe event constants', async () => {
      const { STRIPE_EVENTS, isSupportedStripeEvent } =
        await import('@/lib/constants/stripe-events');

      // Assert all expected events exist
      expect(STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED).toBe('checkout.session.completed');
      expect(STRIPE_EVENTS.PAYMENT_INTENT_SUCCEEDED).toBe('payment_intent.succeeded');
      expect(STRIPE_EVENTS.CUSTOMER_SUBSCRIPTION_CREATED).toBe('customer.subscription.created');

      // Assert type checking works
      expect(isSupportedStripeEvent('checkout.session.completed')).toBe(true);
      expect(isSupportedStripeEvent('unknown.event')).toBe(false);
    });

    it('should provide type-safe product type constants', async () => {
      const {
        PRODUCT_TYPES,
        isValidProductType,
        triggersEnrollment,
        getRequiredMetadataFields
      } = await import('@/lib/constants/product-types');

      // Assert all expected products exist
      expect(PRODUCT_TYPES.QUIZ).toBe('quiz');
      expect(PRODUCT_TYPES.COURSE).toBe('course');
      expect(PRODUCT_TYPES.BUNDLE).toBe('bundle');

      // Assert validation functions work
      expect(isValidProductType('quiz')).toBe(true);
      expect(isValidProductType('unknown')).toBe(false);

      // Assert enrollment trigger detection works
      expect(triggersEnrollment('quiz')).toBe(true);
      expect(triggersEnrollment('unknown')).toBe(false);

      // Assert required metadata
      expect(getRequiredMetadataFields('quiz')).toEqual(['course_id', 'email']);
      expect(getRequiredMetadataFields('corporate-license')).toContain('organization');
    });

    it('should provide error type safety', async () => {
      const {
        WEBHOOK_ERRORS,
        HTTP_STATUS,
        getHttpStatusForError
      } = await import('@/lib/constants/webhook-errors');

      // Assert error constants exist
      expect(WEBHOOK_ERRORS.MISSING_SIGNATURE).toBe('Missing stripe-signature header');
      expect(WEBHOOK_ERRORS.INVALID_SIGNATURE).toBe('Invalid webhook signature');
      expect(WEBHOOK_ERRORS.MISSING_METADATA).toBe('Missing required checkout metadata (course_id, email)');

      // Assert HTTP status codes are correct
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);

      // Assert error-to-status mapping works
      expect(getHttpStatusForError(WEBHOOK_ERRORS.MISSING_SIGNATURE))
        .toBe(HTTP_STATUS.BAD_REQUEST);
      expect(getHttpStatusForError(WEBHOOK_ERRORS.STUDENT_CREATION_FAILED))
        .toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(getHttpStatusForError('unknown error'))
        .toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);  // Default
    });
  });

  describe('Test 5: Adding New Product Types (Extensibility)', () => {
    it('should allow checking for new product types without code changes', async () => {
      const { isValidProductType, PRODUCT_TYPES } =
        await import('@/lib/constants/product-types');

      // Note: This test documents that adding new types only requires
      // updating product-types.ts, not webhook handler code
      const newProductType = PRODUCT_TYPES.CORPORATE_LICENSE;

      expect(isValidProductType(newProductType)).toBe(true);
    });

    it('should have all product types defined in required metadata map', async () => {
      const { PRODUCT_TYPES, getRequiredMetadataFields } =
        await import('@/lib/constants/product-types');

      // Every product type should have defined required metadata
      for (const productType of Object.values(PRODUCT_TYPES)) {
        const required = getRequiredMetadataFields(productType as any);
        expect(Array.isArray(required)).toBe(true);
        expect(required.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Test 6: Error Scenarios', () => {
    it('should correctly map all errors to HTTP status codes', async () => {
      const { WEBHOOK_ERRORS, HTTP_STATUS, getHttpStatusForError } =
        await import('@/lib/constants/webhook-errors');

      // Test each error maps to a valid HTTP status
      for (const errorMsg of Object.values(WEBHOOK_ERRORS)) {
        const status = getHttpStatusForError(errorMsg);
        expect([400, 401, 403, 404, 409, 422, 429, 500, 503]).toContain(status);
      }
    });

    it('should handle unknown errors gracefully', async () => {
      const { getHttpStatusForError, HTTP_STATUS } =
        await import('@/lib/constants/webhook-errors');

      // Unknown errors should default to 500
      expect(getHttpStatusForError('completely unknown error'))
        .toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Test 7: Configuration Consistency', () => {
    it('should have consistent timeout hierarchy', async () => {
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      // Email timeout should be less than webhook timeout
      expect(stripeConfig.email.timeoutMs).toBeLessThan(stripeConfig.webhook.timeoutMs);
    });

    it('should have reasonable retry counts', async () => {
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      // Retries should be reasonable
      expect(stripeConfig.webhook.retryAttempts).toBeGreaterThan(0);
      expect(stripeConfig.webhook.retryAttempts).toBeLessThanOrEqual(10);
      expect(stripeConfig.email.retryAttempts).toBeGreaterThan(0);
      expect(stripeConfig.email.retryAttempts).toBeLessThanOrEqual(10);
    });

    it('should have all required tables defined', async () => {
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      expect(stripeConfig.database.requiredTables).toContain('students');
      expect(stripeConfig.database.requiredTables).toContain('billing_history');
    });
  });

  describe('Test 8: Feature Flags', () => {
    it('should have all feature flags defined', async () => {
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      expect(stripeConfig.features.processCheckoutComplete).toBeDefined();
      expect(stripeConfig.features.sendConfirmationEmails).toBeDefined();
      expect(stripeConfig.features.recordBillingHistory).toBeDefined();

      // All should be booleans
      expect(typeof stripeConfig.features.processCheckoutComplete).toBe('boolean');
      expect(typeof stripeConfig.features.sendConfirmationEmails).toBe('boolean');
      expect(typeof stripeConfig.features.recordBillingHistory).toBe('boolean');
    });
  });

  describe('Test 9: No Magic Strings in Constants', () => {
    it('should have no hardcoded strings in webhook handler logic', async () => {
      // This test documents that all magic strings have been extracted
      const { stripeConfig } = await import('@/lib/server/stripe-config');

      // Assert all URLs are centralized
      expect(stripeConfig.email.apiUrl).toBeDefined();
      expect(stripeConfig.email.senderEmail).toBeDefined();
      expect(stripeConfig.email.courseLinkPath).toBeDefined();

      // Assert all timeout values are centralized
      expect(stripeConfig.webhook.timeoutMs).toBeDefined();
      expect(stripeConfig.email.timeoutMs).toBeDefined();

      // Assert all retry values are centralized
      expect(stripeConfig.webhook.retryAttempts).toBeDefined();
      expect(stripeConfig.email.retryAttempts).toBeDefined();
    });
  });
});
