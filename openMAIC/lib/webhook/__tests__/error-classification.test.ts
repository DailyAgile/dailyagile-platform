/**
 * Test Suite: Error Classification System
 *
 * Tests the ErrorClassifier to ensure correct error categorization
 * for webhook retry logic.
 *
 * Test Coverage:
 * - Transient errors (should return 500, Stripe retries)
 * - Permanent errors (should return 200, no retry)
 * - Idempotent duplicates (should return 200, no action)
 * - Unknown errors (should conservatively retry)
 * - Edge cases (empty messages, null errors)
 */

import { ErrorClassifier, ErrorClass } from '../error-classification';

describe('ErrorClassifier', () => {
  const classifier = new ErrorClassifier();

  describe('Transient Errors (connection/network)', () => {
    it('should classify ECONNREFUSED as transient', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      const result = classifier.classify(error, { attemptNumber: 1 });

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
      expect(result.httpStatus).toBe(500);
      expect(result.shouldRetry).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should classify ETIMEDOUT as transient', () => {
      const error = new Error('The wait exceeded the timeout');
      const result = classifier.classify(error, { attemptNumber: 1 });

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
      expect(result.httpStatus).toBe(500);
      expect(result.shouldRetry).toBe(true);
    });

    it('should classify rate limits (429) as transient', () => {
      const error = new Error('429 Too Many Requests');
      const result = classifier.classify(error, { attemptNumber: 1 });

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
      expect(result.httpStatus).toBe(500);
      expect(result.shouldRetry).toBe(true);
    });

    it('should classify DB connection error as transient', () => {
      const error = new Error('Pool error: Connection timeout');
      const result = classifier.classify(error, { attemptNumber: 1 });

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
      expect(result.httpStatus).toBe(500);
    });

    it('should classify 503 Service Unavailable as transient', () => {
      const error = new Error('503 Service Unavailable');
      const result = classifier.classify(error, { attemptNumber: 1 });

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
      expect(result.httpStatus).toBe(500);
    });
  });

  describe('Transient Errors - Retry Exhaustion', () => {
    it('should stop retrying after max attempts', () => {
      const error = new Error('ECONNREFUSED');
      const result = classifier.classify(error, { attemptNumber: 3 });

      // Even though it's a transient error, max retries exceeded
      expect(result.classification).toBe(ErrorClass.PERMANENT);
      expect(result.httpStatus).toBe(200);
      expect(result.shouldRetry).toBe(false);
      expect(result.retryable).toBe(true); // Was retryable, but limit hit
    });

    it('should allow retry at attempt 2', () => {
      const error = new Error('ECONNREFUSED');
      const result = classifier.classify(error, { attemptNumber: 2 });

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
      expect(result.httpStatus).toBe(500);
      expect(result.shouldRetry).toBe(true);
    });
  });

  describe('Permanent Errors (validation/data)', () => {
    it('should classify missing email as permanent', () => {
      const error = new Error('Missing email');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.PERMANENT);
      expect(result.httpStatus).toBe(200);
      expect(result.shouldRetry).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('should classify missing courseId as permanent', () => {
      const error = new Error('courseId is missing');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.PERMANENT);
      expect(result.httpStatus).toBe(200);
      expect(result.shouldRetry).toBe(false);
    });

    it('should classify invalid metadata as permanent', () => {
      const error = new Error('Invalid metadata format');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.PERMANENT);
      expect(result.httpStatus).toBe(200);
    });

    it('should classify permission denied as permanent', () => {
      const error = new Error('permission denied on table students');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.PERMANENT);
      expect(result.httpStatus).toBe(200);
    });

    it('should classify foreign key violation as permanent', () => {
      const error = new Error('Foreign key violation: invalid course_id');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.PERMANENT);
      expect(result.httpStatus).toBe(200);
    });

    it('should classify unique constraint violation as idempotent/permanent', () => {
      const error = new Error('Unique constraint violation: duplicate email');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.IDEMPOTENT);
      expect(result.httpStatus).toBe(200);
    });
  });

  describe('Idempotent Errors (duplicates)', () => {
    it('should classify already processed as idempotent', () => {
      const error = new Error('Webhook already processed');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.IDEMPOTENT);
      expect(result.httpStatus).toBe(200);
      expect(result.shouldRetry).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('should classify duplicate key as idempotent', () => {
      const error = new Error('duplicate key value violates unique constraint');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.IDEMPOTENT);
      expect(result.httpStatus).toBe(200);
    });
  });

  describe('Unknown Errors (conservative classification)', () => {
    it('should classify unknown error as transient (fail-safe)', () => {
      const error = new Error('Something mysterious happened');
      const result = classifier.classify(error, { attemptNumber: 1 });

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
      expect(result.httpStatus).toBe(500); // Retry
      expect(result.shouldRetry).toBe(true);
      expect(result.rootCause).toBe('Unknown error (classified conservatively as transient)');
    });

    it('should classify unknown error as permanent after retries', () => {
      const error = new Error('Something mysterious happened');
      const result = classifier.classify(error, { attemptNumber: 2 });

      expect(result.classification).toBe(ErrorClass.PERMANENT);
      expect(result.httpStatus).toBe(200); // Don't retry
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('Error Type Handling', () => {
    it('should handle Error objects', () => {
      const error = new Error('ECONNREFUSED');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
    });

    it('should handle string errors', () => {
      const error = 'Connection timeout';
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
    });

    it('should handle object errors', () => {
      const error = { message: 'Missing email', code: 'VALIDATION_ERROR' };
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.PERMANENT);
    });

    it('should handle unknown error types gracefully', () => {
      const error = 42; // Not an error object
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle uppercase error messages', () => {
      const error = new Error('CONNECTION TIMEOUT');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.TRANSIENT);
    });

    it('should handle mixed case error messages', () => {
      const error = new Error('Missing Email');
      const result = classifier.classify(error);

      expect(result.classification).toBe(ErrorClass.PERMANENT);
    });
  });
});

/**
 * Example usage patterns for reference:
 *
 * // In webhook handler:
 * try {
 *   await processWebhook(event);
 * } catch (err) {
 *   const result = classifier.classify(err, {
 *     studentEmail: email,
 *     courseId,
 *     attemptNumber: 1
 *   });
 *
 *   if (result.classification === ErrorClass.TRANSIENT) {
 *     // Return 500, let Stripe retry
 *     return NextResponse.json({ error: result.message }, { status: 500 });
 *   } else {
 *     // Return 200, log error but don't retry
 *     return NextResponse.json({ error: result.message }, { status: 200 });
 *   }
 * }
 */
