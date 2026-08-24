/**
 * Base Email Provider Interface
 * Defines the contract that all email providers must implement
 *
 * Supported providers:
 * - BrevoEmailProvider (default)
 * - SendGridEmailProvider
 * - SMTPEmailProvider (for self-hosted)
 */

export interface EmailProviderConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  // Custom headers like List-Unsubscribe for GDPR/CAN-SPAM
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: Error;
  retryable: boolean; // Should this error trigger a retry?
}

/**
 * Abstract base class for email providers
 * Time Complexity: send() is O(1) - external HTTP call
 *
 * Example:
 *   const provider = new BrevoEmailProvider({
 *     apiKey: process.env.BREVO_API_KEY!,
 *     senderEmail: 'noreply@dailyagile.com',
 *     senderName: 'DailyAgile',
 *   });
 *
 *   const result = await provider.send({
 *     to: 'student@example.com',
 *     subject: 'Welcome!',
 *     htmlContent: '<h1>Welcome</h1>',
 *     textContent: 'Welcome',
 *   });
 */
export abstract class EmailProvider {
  protected config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
  }

  /**
   * Send an email through this provider
   *
   * @param options Email sending options with recipient, subject, and content
   * @returns Result with messageId on success, error details on failure
   *
   * @throws Will not throw - always returns EmailSendResult
   * @throws Provider implementations should catch all errors and return result
   */
  abstract send(options: EmailSendOptions): Promise<EmailSendResult>;

  /**
   * Validate the provider configuration
   * Called at startup to fail fast on misconfiguration
   *
   * @throws Error if configuration is invalid
   */
  abstract validateConfig(): void;

  /**
   * Get provider name for logging and monitoring
   */
  abstract getName(): string;
}

/**
 * Custom error types for email sending failures
 */
export class EmailProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'EmailProviderError';
  }
}

export class RateLimitError extends EmailProviderError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, true, 429); // Retryable
  }
}

export class InvalidEmailError extends EmailProviderError {
  constructor(message: string = 'Invalid email address') {
    super(message, false, 400); // Not retryable
  }
}

export class ProviderUnavailableError extends EmailProviderError {
  constructor(message: string = 'Email provider temporarily unavailable') {
    super(message, true, 503); // Retryable
  }
}
