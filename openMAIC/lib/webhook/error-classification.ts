/**
 * Error Classification System for Webhook Processing
 *
 * Classifies errors into three categories to guide Stripe retry behavior:
 * - TRANSIENT: Temporary failures that may recover (return 500, let Stripe retry)
 * - PERMANENT: Permanent failures that won't self-fix (return 200 + log, no retry)
 * - IDEMPOTENT: Webhook already processed (return 200, no action)
 */

export enum ErrorClass {
  TRANSIENT = 'transient',  // Retry this
  PERMANENT = 'permanent',  // Don't retry
  IDEMPOTENT = 'idempotent', // Already processed
}

export interface ErrorContext {
  studentEmail?: string;
  courseId?: string;
  attemptNumber?: number;
  externalId?: string;
  errorType?: string;
}

export interface ClassificationResult {
  classification: ErrorClass;
  message: string;
  httpStatus: number;  // 500 for transient, 200 for permanent/idempotent
  shouldRetry: boolean;
  retryable: boolean;
  rootCause?: string;
}

/**
 * ErrorClassifier
 *
 * Single Responsibility: Classify errors without handling or retrying them.
 * Dependencies injected for testability.
 */
export class ErrorClassifier {
  private transientPatterns = {
    // Network/connection errors
    ECONNREFUSED: true,
    ECONNRESET: true,
    ETIMEDOUT: true,
    EHOSTDOWN: true,
    EHOSTUNREACH: true,

    // Database errors
    'connect ECONNREFUSED': true,
    'Connection timeout': true,
    'Pool error': true,
    'ENOTFOUND': true,
    'timeout expired': true,

    // Rate limits (temporary)
    'too many requests': true,
    'rate limit': true,
    '429': true,
    '503': true,
    '502': true,
    '504': true,
  };

  private permanentPatterns = {
    // Validation errors
    'Missing email': true,
    'Missing required metadata': true,
    'email_verified is missing': true,
    'courseId is missing': true,
    'Invalid courseId': true,
    'courseId not found': true,

    // Format/structure errors
    'Invalid metadata format': true,
    'JSON parse error': true,
    'Invalid request body': true,

    // Permission errors (won't change)
    'permission denied': true,
    'access denied': true,
    'not authorized': true,

    // Data integrity errors
    'Unique constraint violation': true,
    'Foreign key violation': true,
    'NOT NULL constraint violation': true,
  };

  /**
   * Classify an error based on type and context
   *
   * Time Complexity: O(1) pattern matching
   *
   * @param error - Exception raised during webhook processing
   * @param context - Webhook context (email, courseId, attempt #)
   * @returns Classification result with HTTP status and retry guidance
   *
   * @example
   * const error = new Error('Connection refused');
   * const result = classifier.classify(error, { attemptNumber: 1 });
   * // { classification: 'transient', httpStatus: 500, shouldRetry: true }
   *
   * @example
   * const error = new Error('Missing email');
   * const result = classifier.classify(error, { attemptNumber: 1 });
   * // { classification: 'permanent', httpStatus: 200, shouldRetry: false }
   */
  classify(error: Error | unknown, context?: ErrorContext): ClassificationResult {
    const errorMessage = this.extractErrorMessage(error);
    const errorType = this.extractErrorType(error);

    // Check for idempotent duplicate (special case)
    if (this.isIdempotentDuplicate(errorMessage)) {
      return {
        classification: ErrorClass.IDEMPOTENT,
        message: `Webhook already processed: ${errorMessage}`,
        httpStatus: 200,
        shouldRetry: false,
        retryable: false,
        rootCause: 'Duplicate webhook (already processed)',
      };
    }

    // Check permanent errors first (higher priority)
    if (this.isPermanentError(errorMessage)) {
      return {
        classification: ErrorClass.PERMANENT,
        message: `Permanent error, will not retry: ${errorMessage}`,
        httpStatus: 200,  // Return 200 to prevent Stripe retry
        shouldRetry: false,
        retryable: false,
        rootCause: this.findPermanentErrorPattern(errorMessage),
      };
    }

    // Check transient errors
    if (this.isTransientError(errorMessage)) {
      // Don't retry beyond max attempts
      if (context?.attemptNumber && context.attemptNumber >= 3) {
        return {
          classification: ErrorClass.PERMANENT,
          message: `Max retries exceeded: ${errorMessage}`,
          httpStatus: 200,
          shouldRetry: false,
          retryable: true,  // Was retryable, but hit limit
          rootCause: 'Max retry attempts exceeded',
        };
      }

      return {
        classification: ErrorClass.TRANSIENT,
        message: `Transient error, will retry: ${errorMessage}`,
        httpStatus: 500,  // Return 500 to trigger Stripe retry
        shouldRetry: true,
        retryable: true,
        rootCause: this.findTransientErrorPattern(errorMessage),
      };
    }

    // Unknown error - classify conservatively as TRANSIENT to avoid data loss
    // Better to retry and potentially duplicate than to drop valid webhooks
    if (context?.attemptNumber && context.attemptNumber >= 2) {
      return {
        classification: ErrorClass.PERMANENT,
        message: `Unknown error after retries: ${errorMessage}`,
        httpStatus: 200,
        shouldRetry: false,
        retryable: false,
        rootCause: 'Unknown error (conservative fallback after retries)',
      };
    }

    return {
      classification: ErrorClass.TRANSIENT,
      message: `Unknown error (conservative classification), will retry: ${errorMessage}`,
      httpStatus: 500,
      shouldRetry: true,
      retryable: true,
      rootCause: 'Unknown error (classified conservatively as transient)',
    };
  }

  /**
   * Extract error message from various error types
   * Handles Error, string, object, and unknown types
   */
  private extractErrorMessage(error: Error | unknown): string {
    if (error instanceof Error) {
      return error.message || String(error);
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      return err.message as string || err.error as string || JSON.stringify(error);
    }
    return String(error);
  }

  /**
   * Extract error type/code from error object
   */
  private extractErrorType(error: Error | unknown): string | undefined {
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      return (err.code as string) || (err.name as string);
    }
    return undefined;
  }

  /**
   * Check if error is a duplicate webhook (already processed)
   */
  private isIdempotentDuplicate(message: string): boolean {
    return message.includes('already processed') ||
           message.includes('Unique constraint violation') ||
           message.includes('duplicate key value');
  }

  /**
   * Check if error matches permanent error patterns
   */
  private isPermanentError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return Object.keys(this.permanentPatterns).some(pattern =>
      lowerMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error matches transient error patterns
   */
  private isTransientError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return Object.keys(this.transientPatterns).some(pattern =>
      lowerMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Find which permanent pattern matched
   */
  private findPermanentErrorPattern(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    for (const pattern of Object.keys(this.permanentPatterns)) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        return pattern;
      }
    }
    return undefined;
  }

  /**
   * Find which transient pattern matched
   */
  private findTransientErrorPattern(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    for (const pattern of Object.keys(this.transientPatterns)) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        return pattern;
      }
    }
    return undefined;
  }
}

// Singleton instance
export const globalErrorClassifier = new ErrorClassifier();
