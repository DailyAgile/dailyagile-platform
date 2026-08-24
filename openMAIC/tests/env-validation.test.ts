/**
 * Environment Validation Tests
 * ============================
 *
 * Comprehensive tests for environment variable validation logic.
 * Tests cover: required vars, optional vars, format validation, error messages
 *
 * Run with: npm test lib/env/validation.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EnvironmentValidationError,
  validateEnvironment,
  getEnvironmentSummary,
  isEnvironmentVariableSet,
} from '@/lib/env/validation';

describe('Environment Validation', () => {
  // Store original env vars to restore after each test
  const originalEnv = process.env;

  beforeEach(() => {
    // Save original env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('validateEnvironment()', () => {
    it('should pass when all critical variables are set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_test123abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

      // Should not throw
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw if STRIPE_SECRET_KEY is missing', () => {
      delete process.env.STRIPE_SECRET_KEY;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should throw if STRIPE_WEBHOOK_SECRET is missing', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      delete process.env.STRIPE_WEBHOOK_SECRET;
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should throw if SUPABASE_URL is missing', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      delete process.env.SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should throw if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should throw error with clear message about missing variables', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.SUPABASE_URL;
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      try {
        validateEnvironment();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EnvironmentValidationError);
        const message = (err as Error).message;
        expect(message).toContain('CRITICAL ENVIRONMENT VARIABLES MISSING');
        expect(message).toContain('STRIPE_WEBHOOK_SECRET');
        expect(message).toContain('SUPABASE_URL');
        expect(message).not.toContain('STRIPE_SECRET_KEY'); // This one is set
      }
    });

    it('should reject STRIPE_SECRET_KEY with wrong prefix', () => {
      process.env.STRIPE_SECRET_KEY = 'invalid_key_format';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should accept test and live Stripe keys', () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      // Test key should work
      process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
      expect(() => validateEnvironment()).not.toThrow();

      // Live key should work
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc123';
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should reject STRIPE_WEBHOOK_SECRET with wrong prefix', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'invalid_webhook_secret';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should reject SUPABASE_URL with invalid format', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'not_a_valid_url';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_abc';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should accept Supabase service key with sb_ prefix', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_1234567890abcdefghijklmnop';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should accept Supabase service key with JWT format', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should reject empty string values', () => {
      process.env.STRIPE_SECRET_KEY = '';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });

    it('should reject whitespace-only values', () => {
      process.env.STRIPE_SECRET_KEY = '   ';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
    });
  });

  describe('getEnvironmentSummary()', () => {
    it('should return true for set variables', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      const summary = getEnvironmentSummary();

      expect(summary.STRIPE_SECRET_KEY).toBe(true);
      expect(summary.STRIPE_WEBHOOK_SECRET).toBe(true);
      expect(summary.SUPABASE_URL).toBe(true);
      expect(summary.SUPABASE_SERVICE_ROLE_KEY).toBe(true);
    });

    it('should return false for missing variables', () => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      const summary = getEnvironmentSummary();

      expect(summary.STRIPE_SECRET_KEY).toBe(false);
      expect(summary.STRIPE_WEBHOOK_SECRET).toBe(false);
      expect(summary.SUPABASE_URL).toBe(true);
      expect(summary.SUPABASE_SERVICE_ROLE_KEY).toBe(true);
    });

    it('should return false for empty string values', () => {
      process.env.STRIPE_SECRET_KEY = '';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_abc';
      process.env.SUPABASE_URL = 'https://abc123.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ...';

      const summary = getEnvironmentSummary();

      expect(summary.STRIPE_SECRET_KEY).toBe(false);
    });
  });

  describe('isEnvironmentVariableSet()', () => {
    it('should return true for set variables', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc';

      expect(isEnvironmentVariableSet('STRIPE_SECRET_KEY')).toBe(true);
    });

    it('should return false for missing variables', () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(isEnvironmentVariableSet('STRIPE_SECRET_KEY')).toBe(false);
    });

    it('should return false for empty string values', () => {
      process.env.STRIPE_SECRET_KEY = '';

      expect(isEnvironmentVariableSet('STRIPE_SECRET_KEY')).toBe(false);
    });

    it('should return false for whitespace-only values', () => {
      process.env.STRIPE_SECRET_KEY = '   ';

      expect(isEnvironmentVariableSet('STRIPE_SECRET_KEY')).toBe(false);
    });
  });

  describe('EnvironmentValidationError', () => {
    it('should be an Error instance', () => {
      const error = new EnvironmentValidationError('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new EnvironmentValidationError('test message');
      expect(error.name).toBe('EnvironmentValidationError');
    });

    it('should preserve error message', () => {
      const message = 'This is a test error';
      const error = new EnvironmentValidationError(message);
      expect(error.message).toBe(message);
    });
  });
});
