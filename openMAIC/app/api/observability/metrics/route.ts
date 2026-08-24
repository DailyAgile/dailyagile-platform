/**
 * Prometheus Metrics Endpoint (Time-Series Backend)
 *
 * Exposes webhook observability metrics in Prometheus text format (OpenMetrics 0.0.4).
 * Can be scraped by Prometheus, Datadog, Grafana, Thanos, and other monitoring systems.
 *
 * Endpoint: GET /api/observability/metrics
 *
 * Response format: text/plain with Prometheus OpenMetrics format
 * Content-Type: text/plain; version=0.0.4; charset=utf-8
 *
 * Authentication:
 * - Admin-only endpoint (verify via auth.uid() and instructors table role='admin')
 * - For external Prometheus scraping, use a secure token in Authorization header
 *   Authorization: Bearer METRICS_AUTH_TOKEN (set via environment variable)
 *
 * Metrics included:
 * - webhook_processing_latency_seconds: Histogram of webhook latency (in seconds)
 * - webhook_processing_errors_total: Counter for errors by error_type
 * - webhook_total: Counter for processed webhooks by status
 * - student_operations_total: Counter for student ops by operation + status
 * - billing_operations_total: Counter for billing ops by status
 * - webhook_rate_limit_hits_total: Counter for rate limit hits
 * - email_queued_total: Counter for emails queued by type and status
 * - email_queue_depth: Gauge for current email queue backlog
 * - student_enrollments_total: Gauge for total enrolled students
 * - webhook_processing_active: Gauge for active webhook processing
 * - idempotency_check_duration_ms: Histogram for webhook deduplication lookup time
 *
 * Backend: prom-client library (Node.js Prometheus client)
 * Retention: Managed by time-series database (Prometheus default 15 days, Datadog 15 days)
 * Scrape interval: Recommended 15-30 seconds
 *
 * Setup for Prometheus:
 * scrape_configs:
 *   - job_name: 'dailyagile-webhooks'
 *     scheme: https
 *     static_configs:
 *       - targets: ['dailyagile.com']
 *     metrics_path: '/api/observability/metrics'
 *     authorization:
 *       credentials: 'METRICS_AUTH_TOKEN_HERE'
 *     scrape_interval: 30s
 *     scrape_timeout: 10s
 *
 * Setup for Datadog Agent:
 * # /etc/datadog-agent/conf.d/prometheus.d/conf.yaml
 * init_config:
 * instances:
 *   - prometheus_url: https://dailyagile.com/api/observability/metrics
 *     bearer_token: 'METRICS_AUTH_TOKEN_HERE'
 *     metric_name_prefix: dailyagile_
 *     tags:
 *       - env:production
 *       - service:webhooks
 *
 * Grafana/Prometheus dashboard query examples:
 * - Webhook success rate: rate(webhook_total{status="success"}[5m])
 * - P95 latency: histogram_quantile(0.95, webhook_processing_latency_seconds_bucket)
 * - P99 latency: histogram_quantile(0.99, webhook_processing_latency_seconds_bucket)
 * - Error rate: rate(webhook_processing_errors_total[5m])
 * - Student enrollments per hour: rate(student_operations_total{operation="upsert",status="success"}[1h])
 * - Email queue depth: email_queue_depth
 * - Active webhooks: webhook_processing_active
 *
 * Alerting rules (Prometheus):
 * - Alert if webhook P95 > 500ms (latency SLA)
 * - Alert if error rate > 1% (error SLA)
 * - Alert if email_queue_depth > 1000 (backlog alert)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalMetricsCollector } from '@/lib/server/observability';
import { getSupabaseClient } from '@/lib/server/supabase-client';

/**
 * Verify admin authorization
 * Returns true if user is authenticated and has admin role
 */
async function verifyAdminAuth(req: NextRequest): Promise<boolean> {
  // Check for authorization header (for external Prometheus scraping)
  const authHeader = req.headers.get('authorization');
  if (authHeader && process.env.METRICS_AUTH_TOKEN) {
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.METRICS_AUTH_TOKEN;
  }

  // Check for authenticated admin user
  try {
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Verify admin role
    const { data: instructor } = await supabase
      .from('instructors')
      .select('role')
      .eq('id', user.id)
      .single();

    return instructor?.role === 'admin';
  } catch (err) {
    return false;
  }
}

export async function GET(req: NextRequest) {
  // ========== AUTHORIZATION ==========
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ========== EXPORT METRICS ==========
    const metrics = getGlobalMetricsCollector();
    const metricsText = await metrics.export();

    // Return as Prometheus text format (OpenMetrics 0.0.4)
    return new NextResponse(metricsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error exporting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to export metrics' },
      { status: 500 }
    );
  }
}
