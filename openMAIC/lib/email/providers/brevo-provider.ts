/**
 * Brevo Email Provider
 * Implementation for Brevo/Sendinblue email service
 *
 * API: https://api.brevo.com/v3/smtp/email
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */

import { createLogger } from '@/lib/logger';
import {
  EmailProvider,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
  ProviderUnavailableError,
  InvalidEmailError,
  RateLimitError,
} from './base-provider';

const log = createLogger('BrevoEmailProvider');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface BrevoEmailRequest {
  sender: {
    email: string;
    name: string;
  };
  to: Array<{ email: string }>;
  cc?: Array<{ email: string }>;
  bcc?: Array<{ email: string }>;
  replyTo?: { email: string };
  subject: string;
  htmlContent: string;
  textContent: string;
  headers?: Record<string, string>;
}

export class BrevoEmailProvider extends EmailProvider {
  validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('BREVO_API_KEY is required');
    }
    if (!this.config.senderEmail) {
      throw new Error('Brevo senderEmail is required');
    }
  }

  getName(): string {
    return 'brevo';
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      // Validate email format
      if (!this.isValidEmail(options.to)) {
        log.warn(`Invalid email format: ${options.to}`);
        return {
          success: false,
          error: new InvalidEmailError(`Invalid email: ${options.to}`),
          retryable: false,
        };
      }

      const payload: BrevoEmailRequest = {
        sender: {
          email: this.config.senderEmail,
          name: this.config.senderName,
        },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
      };

      if (options.cc) {
        payload.cc = options.cc.map((email) => ({ email }));
      }

      if (options.bcc) {
        payload.bcc = options.bcc.map((email) => ({ email }));
      }

      if (options.replyTo) {
        payload.replyTo = { email: options.replyTo };
      }

      if (options.headers) {
        payload.headers = options.headers;
      }

      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return this.handleErrorResponse(response, options.to);
      }

      const data = (await response.json()) as any;

      if (!data.messageId) {
        log.error('Brevo did not return messageId', data);
        return {
          success: false,
          error: new ProviderUnavailableError('No messageId returned from Brevo'),
          retryable: true,
        };
      }

      log.info(`✅ Email sent via Brevo to ${options.to} (messageId: ${data.messageId})`);

      return {
        success: true,
        messageId: data.messageId,
        retryable: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Brevo send failed: ${message}`, error);

      return {
        success: false,
        error: new ProviderUnavailableError(`Brevo error: ${message}`),
        retryable: true,
      };
    }
  }

  private async handleErrorResponse(response: Response, email: string): Promise<EmailSendResult> {
    const statusCode = response.status;

    try {
      const errorData = (await response.json()) as any;
      const errorMessage = errorData.message || errorData.error || `HTTP ${statusCode}`;

      if (statusCode === 429) {
        log.warn(`Rate limited by Brevo for ${email}`);
        return {
          success: false,
          error: new RateLimitError(`Brevo rate limit: ${errorMessage}`),
          retryable: true,
        };
      }

      if (statusCode >= 500) {
        log.error(`Brevo server error ${statusCode}: ${errorMessage}`);
        return {
          success: false,
          error: new ProviderUnavailableError(`Brevo server error: ${errorMessage}`),
          retryable: true,
        };
      }

      if (statusCode === 400 || statusCode === 403) {
        log.error(`Brevo client error ${statusCode}: ${errorMessage}`);
        return {
          success: false,
          error: new InvalidEmailError(`Brevo validation error: ${errorMessage}`),
          retryable: false,
        };
      }

      return {
        success: false,
        error: new ProviderUnavailableError(`Brevo error ${statusCode}: ${errorMessage}`),
        retryable: true,
      };
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Unknown error';
      return {
        success: false,
        error: new ProviderUnavailableError(`Failed to parse Brevo response: ${message}`),
        retryable: true,
      };
    }
  }

  private isValidEmail(email: string): boolean {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
