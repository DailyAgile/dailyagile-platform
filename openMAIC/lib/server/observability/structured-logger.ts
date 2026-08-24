/**
 * StructuredLogger - Production-grade structured logging with correlation IDs
 *
 * Features:
 * - Correlation IDs for tracing entire webhook flow
 * - PII redaction (emails, amounts, sensitive data)
 * - JSON output for machine parsing
 * - Async audit log persistence (non-blocking)
 * - Performance tracking (latency, durations)
 *
 * Security:
 * - Never logs full email addresses (uses hash instead)
 * - Never logs payment amounts (only in audit logs with redaction)
 * - All sensitive operations logged to immutable audit table
 *
 * Usage:
 * const logger = new StructuredLogger('webhook-handler');
 * logger.logWebhookReceived(webhookId, signatureValid, payloadSize);
 * logger.logOperation(webhookId, 'student_upsert', studentId, 'success', 123);
 * logger.logError(webhookId, 'database_error', 'Connection timeout', stackTrace);
 */

import { createHash } from 'crypto';

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  correlation_id: string;
  webhook_id?: string;
  event: string;
  message?: string;
  duration_ms?: number;
  status?: string;
  error_type?: string;
  stacktrace?: string;
  [key: string]: unknown;
}

interface AuditLogEntry {
  webhook_id: string;
  correlation_id: string;
  action: string;
  actor_type: 'system' | 'webhook' | 'automation';
  table_name: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export class StructuredLogger {
  private tag: string;
  private correlationId: string;
  private webhookId?: string;
  private isJsonFormat: boolean;
  private enableAuditLogs: boolean;
  private supabaseClient?: any;

  constructor(
    tag: string,
    options?: {
      correlationId?: string;
      webhookId?: string;
      jsonFormat?: boolean;
      enableAuditLogs?: boolean;
      supabaseClient?: any;
    }
  ) {
    this.tag = tag;
    this.correlationId = options?.correlationId || this.generateCorrelationId();
    this.webhookId = options?.webhookId;
    this.isJsonFormat = options?.jsonFormat ?? process.env.LOG_FORMAT === 'json';
    this.enableAuditLogs = options?.enableAuditLogs ?? true;
    this.supabaseClient = options?.supabaseClient;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private redactEmail(email: string): string {
    return `email_${createHash('sha256').update(email).digest('hex').substring(0, 8)}`;
  }

  private formatOutput(entry: LogEntry): string {
    if (this.isJsonFormat) {
      return JSON.stringify(entry);
    }

    const { timestamp, level, correlation_id, event, message, ...extras } = entry;
    const extraStr = Object.keys(extras).length > 0 ? ` | ${JSON.stringify(extras)}` : '';
    return `[${timestamp}] [${level}] [${this.tag}] [${correlation_id}] ${event}: ${message || ''}${extraStr}`;
  }

  private async persistAuditLog(entry: AuditLogEntry): Promise<void> {
    if (!this.enableAuditLogs || !this.supabaseClient) {
      return;
    }

    try {
      // Non-blocking async insert to audit_logs table
      this.supabaseClient
        .from('webhook_audit_logs')
        .insert({
          webhook_id: entry.webhook_id,
          correlation_id: entry.correlation_id,
          action: entry.action,
          actor_type: entry.actor_type,
          table_name: entry.table_name,
          record_id: entry.record_id,
          old_values: entry.old_values,
          new_values: entry.new_values,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          metadata: entry.metadata,
          created_at: entry.created_at,
        })
        .then(() => {
          // Silent success - audit log persisted
        })
        .catch((err: any) => {
          // Alert on audit log failure but don't block webhook
          console.error(`[AUDIT_LOG_FAILED] ${entry.webhook_id}`, err);
        });
    } catch (err) {
      // Fail silently - don't block webhook processing
    }
  }

  private log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', event: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlation_id: this.correlationId,
      event,
      ...(this.webhookId && { webhook_id: this.webhookId }),
      ...data,
    };

    const output = this.formatOutput(entry);
    const consoleFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    consoleFn(output);
  }

  public getCorrelationId(): string {
    return this.correlationId;
  }

  public setWebhookId(id: string): void {
    this.webhookId = id;
  }

  public getWebhookId(): string | undefined {
    return this.webhookId;
  }

  // Webhook lifecycle logging

  public logWebhookReceived(signatureValid: boolean, payloadSize: number): void {
    this.log('INFO', 'webhook_received', {
      signature_valid: signatureValid,
      payload_size: payloadSize,
    });
  }

  public logWebhookProcessing(eventType: string): void {
    this.log('INFO', 'webhook_processing_started', {
      event_type: eventType,
    });
  }

  public logWebhookCompleted(statusCode: number, durationMs: number): void {
    this.log('INFO', 'webhook_completed', {
      status_code: statusCode,
      duration_ms: durationMs,
    });
  }

  // Operation logging (student, billing, email, etc.)

  public async logStudentOperation(
    operationType: 'upsert' | 'create' | 'update',
    studentEmail: string,
    studentId: string,
    status: 'success' | 'failed',
    durationMs: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    this.log('INFO', 'student_operation', {
      operation: operationType,
      student: this.redactEmail(studentEmail),
      student_id: studentId,
      status,
      duration_ms: durationMs,
      ...metadata,
    });

    // Persist to audit log (no PII in the log)
    await this.persistAuditLog({
      webhook_id: this.webhookId || 'unknown',
      correlation_id: this.correlationId,
      action: `STUDENT_${operationType.toUpperCase()}`,
      actor_type: 'webhook',
      table_name: 'students',
      record_id: studentId,
      metadata: {
        operation: operationType,
        status,
        duration_ms: durationMs,
        ...metadata,
      },
      created_at: new Date().toISOString(),
    });
  }

  public async logBillingOperation(
    courseId: string,
    studentId: string,
    amountCents: number,
    currency: string,
    status: 'success' | 'failed',
    durationMs: number,
    externalInvoiceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Never log actual amounts in console logs - only in audit logs
    this.log('INFO', 'billing_operation', {
      course_id: courseId,
      student_id: studentId,
      currency,
      status,
      duration_ms: durationMs,
      invoice_id_hash: externalInvoiceId ? createHash('sha256').update(externalInvoiceId).digest('hex').substring(0, 8) : undefined,
      ...metadata,
    });

    // Persist to audit log with full amount for compliance
    await this.persistAuditLog({
      webhook_id: this.webhookId || 'unknown',
      correlation_id: this.correlationId,
      action: 'BILLING_INSERT',
      actor_type: 'webhook',
      table_name: 'quiz_purchases',
      record_id: studentId,
      new_values: {
        course_id: courseId,
        student_id: studentId,
        amount_cents: amountCents,
        currency,
        payment_method: 'stripe',
        status: 'completed',
      },
      metadata: {
        status,
        duration_ms: durationMs,
        external_invoice_id: externalInvoiceId,
        ...metadata,
      },
      created_at: new Date().toISOString(),
    });
  }

  public async logEmailOperation(
    studentEmail: string,
    emailType: string,
    status: 'queued' | 'failed',
    durationMs: number,
    errorMessage?: string
  ): Promise<void> {
    this.log('INFO', 'email_operation', {
      email: this.redactEmail(studentEmail),
      email_type: emailType,
      status,
      duration_ms: durationMs,
      ...(errorMessage && { error: errorMessage }),
    });

    await this.persistAuditLog({
      webhook_id: this.webhookId || 'unknown',
      correlation_id: this.correlationId,
      action: 'EMAIL_QUEUED',
      actor_type: 'webhook',
      table_name: 'email_queue',
      metadata: {
        email_type: emailType,
        status,
        duration_ms: durationMs,
        error_message: errorMessage,
      },
      created_at: new Date().toISOString(),
    });
  }

  // Error logging

  public async logError(
    errorType: string,
    errorMessage: string,
    stacktrace?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    this.log('ERROR', 'operation_failed', {
      error_type: errorType,
      message: errorMessage,
      ...(stacktrace && { stacktrace: stacktrace.substring(0, 500) }),
      ...metadata,
    });

    await this.persistAuditLog({
      webhook_id: this.webhookId || 'unknown',
      correlation_id: this.correlationId,
      action: 'ERROR_LOGGED',
      actor_type: 'system',
      table_name: 'errors',
      metadata: {
        error_type: errorType,
        message: errorMessage,
        stacktrace: stacktrace?.substring(0, 500),
        ...metadata,
      },
      created_at: new Date().toISOString(),
    });
  }

  public logWarning(event: string, message: string, metadata?: Record<string, unknown>): void {
    this.log('WARN', event, {
      message,
      ...metadata,
    });
  }

  public logDebug(event: string, metadata?: Record<string, unknown>): void {
    if (process.env.DEBUG) {
      this.log('DEBUG', event, metadata);
    }
  }

  // Validation logging

  public logValidation(fieldName: string, isValid: boolean, errorMessage?: string): void {
    if (!isValid) {
      this.log('WARN', 'validation_failed', {
        field: fieldName,
        error: errorMessage,
      });
    }
  }

  // Signature verification logging

  public logSignatureVerification(isValid: boolean, errorMessage?: string): void {
    this.log(isValid ? 'INFO' : 'ERROR', 'signature_verification', {
      valid: isValid,
      ...(errorMessage && { error: errorMessage }),
    });
  }
}
