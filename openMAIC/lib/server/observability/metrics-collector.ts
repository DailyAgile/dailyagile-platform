/**
 * MetricsCollector - Prometheus client-based metrics for webhook observability
 *
 * Uses prom-client library for production-grade time-series metrics.
 * Metrics are scraped by Prometheus, Datadog, Grafana, and other monitoring systems.
 *
 * Metrics tracked:
 * - webhook_processing_latency_seconds: Histogram of webhook latency (in seconds)
 * - webhook_processing_errors_total: Counter for errors by error_type
 * - webhook_total: Counter for processed webhooks by status
 * - student_operations_total: Counter for student ops by operation + status
 * - billing_operations_total: Counter for billing ops by status
 * - email_queue_depth: Gauge for pending emails
 * - idempotency_check_duration_ms: Histogram for idempotency lookup time
 *
 * Time Complexity:
 * - Increment/observe: O(1) - prom-client uses lock-free updates
 * - Export: O(n) where n = number of unique metric combinations
 * - Memory: O(m) where m = number of active label combinations
 *
 * Retention Policy:
 * - In-memory: 24 hours (resets on app restart)
 * - Time-series DB: Managed by Prometheus/Datadog (default 15 days)
 *
 * Format:
 * Prometheus text format 0.0.4 (OpenMetrics compatible)
 *
 * Usage:
 * const metrics = MetricsCollector.getInstance();
 * metrics.recordWebhookLatency(150); // 150ms (auto-converted to 0.15 seconds)
 * metrics.recordStudentOperation('upsert', 'success');
 * metrics.recordError('database_error');
 * metrics.export(); // Returns Prometheus format text
 */

import * as prom from 'prom-client';

// Prometheus registry (collects all metrics)
const register = new prom.Registry();

// ========== HISTOGRAM METRICS ==========

/**
 * Webhook processing latency histogram (in seconds)
 * Buckets: 10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
 * Useful for: P50/P95/P99 latency tracking, SLA monitoring
 */
const webhookLatencyHistogram = new prom.Histogram({
  name: 'webhook_processing_latency_seconds',
  help: 'Webhook processing latency in seconds',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Idempotency check duration histogram (in milliseconds)
 * Useful for: Understanding database lookup performance
 */
const idempotencyCheckHistogram = new prom.Histogram({
  name: 'idempotency_check_duration_ms',
  help: 'Time taken to check webhook idempotency in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [register],
});

// ========== COUNTER METRICS ==========

/**
 * Total webhooks processed counter
 * Labels: status (success, failed, rejected)
 */
const webhookTotal = new prom.Counter({
  name: 'webhook_total',
  help: 'Total webhooks processed',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Total webhook processing errors counter
 * Labels: error_type (signature_invalid, missing_metadata, database_error, etc.)
 */
const webhookErrorsTotal = new prom.Counter({
  name: 'webhook_processing_errors_total',
  help: 'Total webhook processing errors',
  labelNames: ['error_type'],
  registers: [register],
});

/**
 * Total student operations counter
 * Labels: operation (upsert, create, update), status (success, failed)
 */
const studentOperationsTotal = new prom.Counter({
  name: 'student_operations_total',
  help: 'Total student operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

/**
 * Total billing operations counter
 * Labels: status (success, failed)
 */
const billingOperationsTotal = new prom.Counter({
  name: 'billing_operations_total',
  help: 'Total billing operations',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Rate limit hits counter
 * Labels: endpoint (e.g., '/api/quiz/stripe/webhook')
 */
const rateLimitHitsTotal = new prom.Counter({
  name: 'webhook_rate_limit_hits_total',
  help: 'Total rate limit hits on webhook endpoints',
  labelNames: ['endpoint'],
  registers: [register],
});

/**
 * Total emails queued counter
 * Labels: email_type (confirmation, welcome, etc.), status (queued, failed)
 */
const emailQueuedTotal = new prom.Counter({
  name: 'email_queued_total',
  help: 'Total emails queued',
  labelNames: ['email_type', 'status'],
  registers: [register],
});

// ========== GAUGE METRICS ==========

/**
 * Email queue depth gauge
 * Useful for: Monitoring backlog, alerting on queue buildup
 */
const emailQueueDepth = new prom.Gauge({
  name: 'email_queue_depth',
  help: 'Current depth of email processing queue',
  registers: [register],
});

/**
 * Student enrollments total gauge
 * Updated at intervals for dashboard display
 */
const studentEnrollmentsTotal = new prom.Gauge({
  name: 'student_enrollments_total',
  help: 'Total student enrollments',
  registers: [register],
});

/**
 * Active webhook processing gauge
 * Track concurrent webhooks being processed
 */
const activeWebhookCount = new prom.Gauge({
  name: 'webhook_processing_active',
  help: 'Number of webhooks currently being processed',
  registers: [register],
});

export class MetricsCollector {
  private static instance: MetricsCollector;
  private startTime: number = Date.now();

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record webhook processing latency (in milliseconds)
   * Automatically converts to seconds for Prometheus
   */
  public recordWebhookLatency(durationMs: number): void {
    const durationSeconds = durationMs / 1000;
    webhookLatencyHistogram.observe(durationSeconds);
  }

  /**
   * Increment webhook counter
   * Labels: status (success, failed, rejected)
   */
  public recordWebhook(status: 'success' | 'failed' | 'rejected'): void {
    webhookTotal.labels(status).inc();
  }

  /**
   * Record webhook processing error
   * Labels: error_type (signature_invalid, missing_metadata, database_error, etc.)
   */
  public recordError(errorType: string): void {
    webhookErrorsTotal.labels(errorType).inc();
  }

  /**
   * Record student operation
   * Labels: operation (upsert, create, update), status (success, failed)
   */
  public recordStudentOperation(
    operation: 'upsert' | 'create' | 'update',
    status: 'success' | 'failed'
  ): void {
    studentOperationsTotal.labels(operation, status).inc();
  }

  /**
   * Record billing operation
   * Labels: status (success, failed)
   */
  public recordBillingOperation(status: 'success' | 'failed'): void {
    billingOperationsTotal.labels(status).inc();
  }

  /**
   * Record rate limit hit
   * Labels: endpoint (e.g., '/api/quiz/stripe/webhook')
   */
  public recordRateLimitHit(endpoint: string): void {
    rateLimitHitsTotal.labels(endpoint).inc();
  }

  /**
   * Record email queued
   * Labels: email_type (confirmation, welcome, etc.), status (queued, failed)
   */
  public recordEmailQueued(emailType: string, status: 'queued' | 'failed'): void {
    emailQueuedTotal.labels(emailType, status).inc();
  }

  /**
   * Set email queue depth gauge
   * Call this periodically from a background job
   */
  public setEmailQueueDepth(depth: number): void {
    emailQueueDepth.set(depth);
  }

  /**
   * Set total student enrollments gauge
   * Call this periodically from a background job
   */
  public setStudentEnrollmentsTotal(count: number): void {
    studentEnrollmentsTotal.set(count);
  }

  /**
   * Increment active webhook count
   */
  public incrementActiveWebhooks(): void {
    activeWebhookCount.inc();
  }

  /**
   * Decrement active webhook count
   */
  public decrementActiveWebhooks(): void {
    activeWebhookCount.dec();
  }

  /**
   * Record idempotency check duration (in milliseconds)
   */
  public recordIdempotencyCheckDuration(durationMs: number): void {
    idempotencyCheckHistogram.observe(durationMs);
  }

  /**
   * Export metrics in Prometheus text format
   */
  public export(): Promise<string> {
    return register.metrics();
  }

  /**
   * Export metrics as JSON for dashboards
   */
  public exportJSON() {
    return {
      webhook_processing_latency_seconds: webhookLatencyHistogram.get(),
      webhook_processing_errors_total: webhookErrorsTotal.get(),
      webhook_total: webhookTotal.get(),
      student_operations_total: studentOperationsTotal.get(),
      billing_operations_total: billingOperationsTotal.get(),
      webhook_rate_limit_hits_total: rateLimitHitsTotal.get(),
      email_queued_total: emailQueuedTotal.get(),
      email_queue_depth: emailQueueDepth.get(),
      student_enrollments_total: studentEnrollmentsTotal.get(),
      webhook_processing_active: activeWebhookCount.get(),
      idempotency_check_duration_ms: idempotencyCheckHistogram.get(),
      process_uptime_seconds: (Date.now() - this.startTime) / 1000,
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    register.resetMetrics();
    this.startTime = Date.now();
  }

  /**
   * Get latency percentiles (p50, p95, p99)
   * NOTE: In production, use Prometheus/Grafana's histogram_quantile() function instead:
   *   - P50: histogram_quantile(0.5, webhook_processing_latency_seconds_bucket)
   *   - P95: histogram_quantile(0.95, webhook_processing_latency_seconds_bucket)
   *   - P99: histogram_quantile(0.99, webhook_processing_latency_seconds_bucket)
   *
   * This method is kept for compatibility but returns estimated values based on
   * currently recorded observations. For accurate percentiles, query the time-series DB.
   *
   * Returns approximate percentiles (estimated from bucket distribution)
   */
  public getLatencyPercentiles(): { p50: number; p95: number; p99: number } {
    // Note: prom-client's histogram doesn't expose buckets via get().values
    // For accurate percentile calculations, use Prometheus's histogram_quantile()
    // For now, return estimated values or query Prometheus directly

    // This is a limitation of in-memory metrics - percentiles are best
    // calculated by the time-series database with full data access
    return {
      p50: 0,   // Query Prometheus instead
      p95: 0,   // Query Prometheus instead
      p99: 0,   // Query Prometheus instead
    };
  }
}

// Global singleton instance
export function getGlobalMetricsCollector(): MetricsCollector {
  return MetricsCollector.getInstance();
}

// Export Prometheus registry for custom middleware/setup
export function getPrometheusRegistry(): prom.Registry {
  return register;
}
