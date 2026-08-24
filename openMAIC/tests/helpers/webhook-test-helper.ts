/**
 * Webhook Testing Utilities
 *
 * Helpers for generating valid Stripe webhooks, mocking responses, and validating results.
 */

import Stripe from 'stripe';
import * as crypto from 'crypto';

/**
 * Generate a valid Stripe webhook signature.
 * Format: t=timestamp,v1=HMAC-SHA256(timestamp.body)
 */
export function generateValidSignature(body: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate an old signature (outside 5-minute window) to test replay protection.
 */
export function generateOldSignature(body: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate a forged signature (with wrong secret) to test signature validation.
 */
export function generateForgedSignature(body: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const wrongSecret = 'wrong_secret_key_12345';
  const signedContent = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', wrongSecret)
    .update(signedContent)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate a malformed signature (missing v1) to test error handling.
 */
export function generateMalformedSignature(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `t=${timestamp}`; // Missing v1 part
}

/**
 * Create a Stripe webhook request with all necessary headers.
 */
export function createWebhookRequest(
  body: string,
  signature: string
): {
  headers: Record<string, string>;
  body: string;
} {
  return {
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json',
    },
    body,
  };
}

/**
 * Serialize a Stripe event to JSON string for webhook processing.
 */
export function serializeEvent(event: Stripe.Event): string {
  return JSON.stringify(event);
}

/**
 * Parse webhook response and extract key fields.
 */
export function parseWebhookResponse(response: any): {
  success: boolean;
  httpStatus: number;
  message: string;
  error?: string;
} {
  return {
    success: response.success,
    httpStatus: response.httpStatus,
    message: response.message,
    error: response.error,
  };
}

/**
 * Mock Supabase client for testing.
 * Allows overriding specific methods to control behavior.
 */
export class MockSupabaseClient {
  private responses: Map<string, any> = new Map();
  private errors: Map<string, Error> = new Map();
  private insertCalls: any[] = [];
  private selectCalls: any[] = [];
  private upsertCalls: any[] = [];

  mockResponse(table: string, method: string, response: any): void {
    this.responses.set(`${table}:${method}`, response);
  }

  mockError(table: string, method: string, error: Error): void {
    this.errors.set(`${table}:${method}`, error);
  }

  getInsertCalls(): any[] {
    return this.insertCalls;
  }

  getSelectCalls(): any[] {
    return this.selectCalls;
  }

  getUpsertCalls(): any[] {
    return this.upsertCalls;
  }

  from(table: string) {
    const self = this;
    return {
      insert: (data: any) => {
        self.insertCalls.push({ table, data });
        return {
          select: () => ({ single: async () => self.handleQuery(`${table}:insert`) }),
        };
      },
      upsert: (data: any, options?: any) => {
        self.upsertCalls.push({ table, data, options });
        return {
          select: () => ({
            single: async () => {
              const error = self.errors.get(`${table}:upsert`);
              if (error) throw error;
              const response = self.responses.get(`${table}:upsert`);
              return response || { data: { id: 'mock-student-id' }, error: null };
            },
          }),
        };
      },
      select: () => {
        return {
          eq: () => ({
            limit: () => ({
              data: self.responses.get(`${table}:select`) || [],
              error: null,
            }),
          }),
        };
      },
    };
  }

  private async handleQuery(key: string) {
    const error = this.errors.get(key);
    if (error) throw error;
    return { data: this.responses.get(key), error: null };
  }
}

/**
 * Mock Stripe API responses.
 */
export class MockStripeResponse {
  static successResponse(data: any) {
    return { ok: true, status: 200, json: async () => data };
  }

  static errorResponse(status: number, message: string) {
    return {
      ok: false,
      status,
      statusText: message,
      json: async () => ({ error: message }),
    };
  }
}

/**
 * Simulate rate limiting by tracking requests.
 */
export class RateLimitSimulator {
  private requests: Map<string, number[]> = new Map();
  private globalRequests: number[] = [];

  recordRequest(email: string): boolean {
    const now = Date.now();
    const cutoff = now - 60000; // Last minute

    if (!this.requests.has(email)) {
      this.requests.set(email, []);
    }

    const emailRequests = this.requests.get(email)!.filter(t => t > cutoff);
    this.globalRequests = this.globalRequests.filter(t => t > cutoff);

    const customerLimitExceeded = emailRequests.length >= 100;
    const globalLimitExceeded = this.globalRequests.length >= 1000;

    if (!customerLimitExceeded && !globalLimitExceeded) {
      emailRequests.push(now);
      this.globalRequests.push(now);
      this.requests.set(email, emailRequests);
      return true;
    }

    return false;
  }

  reset(): void {
    this.requests.clear();
    this.globalRequests = [];
  }

  getCustomerRequestCount(email: string): number {
    const now = Date.now();
    const cutoff = now - 60000;
    return (this.requests.get(email) || []).filter(t => t > cutoff).length;
  }

  getGlobalRequestCount(): number {
    const now = Date.now();
    const cutoff = now - 60000;
    return this.globalRequests.filter(t => t > cutoff).length;
  }
}

/**
 * Track audit log entries for assertions.
 */
export class AuditLogTracker {
  private logs: any[] = [];

  recordLog(entry: any): void {
    this.logs.push(entry);
  }

  getLogs(): any[] {
    return this.logs;
  }

  getWebhookLogs(): any[] {
    return this.logs.filter(l => l.resource_type === 'webhook');
  }

  findLog(predicate: (log: any) => boolean): any | undefined {
    return this.logs.find(predicate);
  }

  reset(): void {
    this.logs = [];
  }
}

/**
 * Helper to create realistic Stripe event with proper structure.
 */
export function createStripeEvent(overrides: Partial<any> = {}): any {
  const baseEvent: any = {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    livemode: false,
    pending_webhooks: 1,
    request: null,
    data: {
      object: {
        id: `cs_test_${Math.random().toString(36).substr(2, 9)}`,
        object: 'checkout.session',
        customer_email: 'test@example.com',
        amount_total: 29900,
        currency: 'usd',
        metadata: {
          course_id: 'track-a-full',
          product_type: 'quiz',
          email: 'test@example.com',
        },
        payment_status: 'paid',
      },
    },
  };

  return { ...baseEvent, ...overrides };
}

/**
 * Test data constants for reuse across tests.
 */
export const TEST_CONSTANTS = {
  WEBHOOK_SECRET: 'whsec_test_abc123',
  VALID_EMAIL: 'student@example.com',
  INVALID_EMAIL: 'not-an-email',
  VALID_COURSE_ID: 'track-a-full',
  INVALID_COURSE_ID: 'course@with<bad>chars',
  VALID_AMOUNT_CENTS: 29900,
  LOW_AMOUNT_CENTS: 10000,
  HIGH_AMOUNT_CENTS: 90000,
  WITHIN_TOLERANCE_AMOUNT: 30939, // 29900 * 1.035 (3.5% increase)
};
