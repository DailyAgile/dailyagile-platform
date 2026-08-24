/**
 * Idempotency Manager for Webhook Processing
 *
 * Ensures each webhook is processed exactly once, preventing duplicate billing records
 * and duplicate student enrollments.
 *
 * Single Responsibility: Check and mark webhooks as processed
 * Depends on: Database (Supabase)
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface IdempotencyCheckResult {
  isIdempotent: boolean;
  processingId?: string;
  status?: string;
  attemptCount?: number;
  isAlreadySucceeded?: boolean;
  lastError?: string;
}

export interface WebhookProcessingRecord {
  id: string;
  external_id: string;
  status: string;
  attempt_number: number;
  error_classification?: string;
  last_error?: string;
}

/**
 * IdempotencyManager
 *
 * Responsibilities:
 * - Check if webhook already processed (using unique external_id)
 * - Mark webhook as processing (atomic, handles race conditions via UPSERT)
 * - Mark webhook as succeeded/failed with error classification
 * - Support distributed systems with database-level locking
 */
export class IdempotencyManager {
  constructor(
    private supabase: SupabaseClient,
    private logger?: { error: (msg: string, context?: Record<string, unknown>) => void }
  ) {}

  /**
   * Check if webhook already processed and get its status
   *
   * Time Complexity: O(1) - single indexed SELECT
   * Database Lock: None (read-only)
   *
   * @param externalId - Stripe event ID (must be globally unique)
   * @param source - Webhook source (stripe, email_service, etc.)
   * @returns Idempotency check result
   *
   * @example
   * const result = await manager.checkIdempotency('evt_1234567');
   * if (result.isIdempotent && result.status === 'succeeded') {
   *   return NextResponse.json({ success: true }); // Already processed successfully
   * }
   */
  async checkIdempotency(
    externalId: string,
    source: string = 'stripe'
  ): Promise<IdempotencyCheckResult> {
    try {
      // Use raw query with check_webhook_idempotency function for atomicity
      const { data, error } = await this.supabase
        .rpc('check_webhook_idempotency', {
          p_external_id: externalId,
          p_source: source,
        });

      if (error) {
        this.logger?.error('Idempotency check failed', {
          externalId,
          source,
          error: error.message,
        });
        // On error, assume not idempotent (fail-safe to process)
        return { isIdempotent: false };
      }

      if (!data || data.length === 0) {
        return { isIdempotent: false };
      }

      const record = data[0];
      const isSucceeded = record.status === 'succeeded';

      return {
        isIdempotent: true,
        processingId: record.processing_id,
        status: record.status,
        attemptCount: record.attempt_count,
        isAlreadySucceeded: isSucceeded,
      };
    } catch (err) {
      this.logger?.error('Idempotency check exception', {
        externalId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Fail-safe: assume not idempotent on database errors
      return { isIdempotent: false };
    }
  }

  /**
   * Atomically mark webhook as processing (handles duplicates via UPSERT)
   *
   * Uses ON CONFLICT clause to handle race conditions in distributed systems.
   * If two processes try to process same webhook simultaneously:
   * - First one locks the row
   * - Second one waits, then increments attempt_number
   * - Both continue processing (deduped later via status)
   *
   * Time Complexity: O(1) - single indexed INSERT ... ON CONFLICT
   * Database Lock: Row-level lock on webhook_processing record
   *
   * @param externalId - Stripe event ID
   * @param source - Webhook source
   * @param eventType - Event type (e.g., checkout.session.completed)
   * @param resourceId - Associated resource ID
   * @param resourceType - Type of resource
   * @param payload - Full webhook payload
   * @param metadata - Optional metadata (email, courseId, etc.)
   * @returns Processing ID (unique within webhook processing record)
   *
   * @throws Error if database insert fails
   *
   * @example
   * const processingId = await manager.markAsProcessing(
   *   'evt_1234567',
   *   'stripe',
   *   'checkout.session.completed',
   *   'cus_abc123',
   *   'checkout_session',
   *   { ... full payload ... },
   *   { studentEmail: 'user@example.com', courseId: 'course_123' }
   * );
   */
  async markAsProcessing(
    externalId: string,
    source: string,
    eventType: string,
    resourceId: string | undefined,
    resourceType: string | undefined,
    payload: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    try {
      // Use stored procedure for atomic UPSERT with increment
      const { data, error } = await this.supabase
        .rpc('mark_webhook_processing', {
          p_external_id: externalId,
          p_source: source,
          p_event_type: eventType,
          p_resource_id: resourceId,
          p_resource_type: resourceType,
          p_payload: payload,
          p_metadata: metadata || {},
        });

      if (error) {
        this.logger?.error('Failed to mark webhook as processing', {
          externalId,
          error: error.message,
        });
        throw new Error(`Failed to mark webhook as processing: ${error.message}`);
      }

      if (!data) {
        throw new Error('No processing ID returned from mark_webhook_processing');
      }

      return data as string;
    } catch (err) {
      this.logger?.error('Exception marking webhook as processing', {
        externalId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Mark webhook as successfully processed
   *
   * @param processingId - Processing record ID returned from markAsProcessing
   *
   * @example
   * await manager.markAsSucceeded(processingId);
   */
  async markAsSucceeded(processingId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('mark_webhook_succeeded', {
          p_processing_id: processingId,
        });

      if (error) {
        this.logger?.error('Failed to mark webhook as succeeded', {
          processingId,
          error: error.message,
        });
        throw new Error(`Failed to mark webhook as succeeded: ${error.message}`);
      }
    } catch (err) {
      this.logger?.error('Exception marking webhook as succeeded', {
        processingId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Mark webhook as failed with error classification
   *
   * Sets error_classification to guide retry behavior:
   * - TRANSIENT: Will retry up to max_retries times
   * - PERMANENT: Will not retry, but logs error
   * - IDEMPOTENT: Duplicate, no action needed
   *
   * Automatically moves to deadletter if max retries exceeded for transient errors.
   *
   * @param processingId - Processing record ID
   * @param errorMessage - Human-readable error message
   * @param errorClassification - TRANSIENT, PERMANENT, or IDEMPOTENT
   * @param errorDetails - Optional structured error details
   *
   * @example
   * await manager.markAsFailed(
   *   processingId,
   *   'Connection refused: ECONNREFUSED',
   *   'transient',
   *   { code: 'ECONNREFUSED', type: 'network_error' }
   * );
   */
  async markAsFailed(
    processingId: string,
    errorMessage: string,
    errorClassification: string,
    errorDetails?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('mark_webhook_failed', {
          p_processing_id: processingId,
          p_error_message: errorMessage,
          p_error_classification: errorClassification,
          p_error_details: errorDetails || null,
        });

      if (error) {
        this.logger?.error('Failed to mark webhook as failed', {
          processingId,
          errorClassification,
          error: error.message,
        });
        throw new Error(`Failed to mark webhook as failed: ${error.message}`);
      }
    } catch (err) {
      this.logger?.error('Exception marking webhook as failed', {
        processingId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Mark webhook as idempotent (duplicate)
   *
   * Called when a webhook is received again after already being processed successfully.
   * Returns 200 OK without doing any work.
   *
   * @param processingId - Processing record ID
   *
   * @example
   * await manager.markAsIdempotent(processingId);
   */
  async markAsIdempotent(processingId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('mark_webhook_idempotent', {
          p_processing_id: processingId,
        });

      if (error) {
        this.logger?.error('Failed to mark webhook as idempotent', {
          processingId,
          error: error.message,
        });
        throw new Error(`Failed to mark webhook as idempotent: ${error.message}`);
      }
    } catch (err) {
      this.logger?.error('Exception marking webhook as idempotent', {
        processingId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Get webhook processing record for debugging
   *
   * @param externalId - Stripe event ID
   */
  async getProcessingRecord(externalId: string): Promise<WebhookProcessingRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('webhook_processing')
        .select('*')
        .eq('external_id', externalId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data;
    } catch (err) {
      this.logger?.error('Failed to get webhook processing record', {
        externalId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
