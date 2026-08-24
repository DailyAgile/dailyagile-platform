/**
 * Monitoring Configuration - Prometheus & Datadog Integration
 *
 * This module configures time-series metrics collection for:
 * 1. Prometheus - Open-source time-series database (self-hosted or managed)
 * 2. Datadog - Commercial APM/Monitoring platform
 *
 * Decision: Prometheus (Recommended for cost-conscious startups)
 * - Cost: Free (self-hosted) or ~$0.10/million metrics/month (Managed Prometheus)
 * - Setup: 5-10 minutes (add scrape config)
 * - Dashboards: Grafana (free) + built-in Prometheus UI
 * - Alerting: AlertManager (free)
 * - Best for: High-volume metrics, full control, no vendor lock-in
 *
 * Alternative: Datadog (Enterprise grade)
 * - Cost: ~$15-50/host/month
 * - Setup: API key + environment variable
 * - Dashboards: Built-in Datadog dashboards
 * - Alerting: Datadog Alert Manager
 * - Best for: Existing Datadog customers, full APM stack
 *
 * Architecture:
 * App → Prometheus Registry → /api/observability/metrics endpoint
 *                           → Prometheus Scraper (pulls every 30s)
 *                           → Time-Series DB (Prometheus/Datadog)
 *                           → Grafana/Datadog Dashboards
 *                           → Alerting (AlertManager/Datadog)
 *
 * Environment Variables:
 * - PROMETHEUS_ENABLED: Enable/disable Prometheus metrics collection (default: true)
 * - METRICS_AUTH_TOKEN: Secret token for Prometheus scraper authentication
 * - DATADOG_ENABLED: Enable/disable Datadog exports (default: false)
 * - DATADOG_API_KEY: Datadog API key (optional, if using Datadog)
 * - DATADOG_SITE: Datadog site (datadoghq.com or datadoghq.eu, default: datadoghq.com)
 *
 * Usage:
 * 1. Initialize monitoring: initializeMonitoring()
 * 2. Record metrics: MetricsCollector.getInstance().recordWebhookLatency(150)
 * 3. Export metrics: GET /api/observability/metrics
 * 4. Configure Prometheus scraper to pull from /api/observability/metrics
 * 5. Set up Grafana dashboards
 * 6. Configure alerts in AlertManager
 *
 * Deployment Checklist:
 * [ ] Set PROMETHEUS_ENABLED=true in .env.production
 * [ ] Generate random METRICS_AUTH_TOKEN (32+ characters)
 * [ ] Add Prometheus scrape config pointing to /api/observability/metrics
 * [ ] Set up Grafana data source (http://prometheus:9090)
 * [ ] Create dashboard from ./grafana/dashboards/webhooks.json
 * [ ] Configure AlertManager rules in ./prometheus/rules/webhooks.rules.yml
 * [ ] Test /api/observability/metrics endpoint (curl -H "Authorization: Bearer TOKEN")
 * [ ] Verify metrics appear in Grafana within 1-2 minutes
 *
 * Monitoring Best Practices:
 * - Record metrics at the point of action (not aggregated later)
 * - Use consistent label names across all metrics
 * - Define SLOs before defining alerts
 * - Keep cardinality low (avoid unbounded label values)
 * - Test alerting rules before deploying to production
 * - Set up on-call rotations for critical alerts
 */

import { getGlobalMetricsCollector } from './observability/metrics-collector';

/**
 * Monitor configuration
 */
export interface MonitoringConfig {
  // Prometheus configuration
  prometheus: {
    enabled: boolean;
    scrapeInterval: number; // in seconds
    scrapeTimeout: number; // in seconds
  };

  // Datadog configuration
  datadog: {
    enabled: boolean;
    apiKey?: string;
    site: 'datadoghq.com' | 'datadoghq.eu';
  };

  // Authentication
  auth: {
    metricsAuthToken: string;
  };

  // Alert thresholds
  alerts: {
    webhookP95ThresholdMs: number; // Alert if P95 latency exceeds this (default: 500ms)
    webhookErrorRateThreshold: number; // Alert if error rate exceeds this (default: 0.01 = 1%)
    emailQueueDepthThreshold: number; // Alert if email queue depth exceeds this (default: 1000)
  };
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED !== 'false', // enabled by default
    scrapeInterval: 30, // 30 seconds
    scrapeTimeout: 10, // 10 seconds
  },
  datadog: {
    enabled: process.env.DATADOG_ENABLED === 'true',
    apiKey: process.env.DATADOG_API_KEY,
    site: (process.env.DATADOG_SITE as 'datadoghq.com' | 'datadoghq.eu') || 'datadoghq.com',
  },
  auth: {
    metricsAuthToken: process.env.METRICS_AUTH_TOKEN || 'METRICS_AUTH_TOKEN_NOT_SET',
  },
  alerts: {
    webhookP95ThresholdMs: parseInt(process.env.WEBHOOK_P95_THRESHOLD_MS || '500', 10),
    webhookErrorRateThreshold: parseFloat(process.env.WEBHOOK_ERROR_RATE_THRESHOLD || '0.01'),
    emailQueueDepthThreshold: parseInt(process.env.EMAIL_QUEUE_DEPTH_THRESHOLD || '1000', 10),
  },
};

/**
 * Initialize monitoring system
 * Called once at app startup
 */
export function initializeMonitoring(config: MonitoringConfig = DEFAULT_MONITORING_CONFIG): void {
  const logger = console; // Use your structured logger here

  logger.info('[Monitoring] Initializing monitoring system', {
    prometheus_enabled: config.prometheus.enabled,
    datadog_enabled: config.datadog.enabled,
    prometheus_scrape_interval: `${config.prometheus.scrapeInterval}s`,
  });

  // ========== PROMETHEUS SETUP ==========
  if (config.prometheus.enabled) {
    logger.info('[Prometheus] Metrics collection enabled', {
      scrape_interval: `${config.prometheus.scrapeInterval}s`,
      scrape_timeout: `${config.prometheus.scrapeTimeout}s`,
      metrics_endpoint: '/api/observability/metrics',
    });

    // Validate auth token
    if (!config.auth.metricsAuthToken || config.auth.metricsAuthToken === 'METRICS_AUTH_TOKEN_NOT_SET') {
      logger.warn('[Prometheus] METRICS_AUTH_TOKEN not set - metrics endpoint will require admin auth');
    }

    // Start periodic gauge updates (email queue depth, enrollment count)
    // This would typically be done by a background job, but we can set up a reminder here
    logger.info('[Prometheus] Note: Set up background jobs to update gauges periodically');
    logger.info('  - email_queue_depth: Update every 1-5 minutes');
    logger.info('  - student_enrollments_total: Update every 1 hour');
  }

  // ========== DATADOG SETUP ==========
  if (config.datadog.enabled) {
    if (!config.datadog.apiKey) {
      logger.error('[Datadog] Datadog enabled but DATADOG_API_KEY not set');
      return;
    }

    logger.info('[Datadog] APM/Monitoring integration enabled', {
      site: config.datadog.site,
      api_key_present: !!config.datadog.apiKey,
    });

    // TODO: Initialize Datadog SDK if needed
    // For now, Datadog can scrape from the Prometheus endpoint
  }

  // ========== ALERT THRESHOLDS ==========
  logger.info('[Monitoring] Alert thresholds configured', {
    webhook_p95_threshold_ms: config.alerts.webhookP95ThresholdMs,
    webhook_error_rate_threshold: `${(config.alerts.webhookErrorRateThreshold * 100).toFixed(2)}%`,
    email_queue_depth_threshold: config.alerts.emailQueueDepthThreshold,
  });
}

/**
 * Health check for monitoring system
 * Returns current metrics status
 */
export async function getMonitoringHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  prometheus: {
    enabled: boolean;
    endpoint_available: boolean;
  };
  datadog: {
    enabled: boolean;
    api_key_present: boolean;
  };
  metrics_collected: number;
}> {
  const metrics = getGlobalMetricsCollector();
  const metricsJSON = metrics.exportJSON();

  return {
    status: 'healthy',
    prometheus: {
      enabled: DEFAULT_MONITORING_CONFIG.prometheus.enabled,
      endpoint_available: DEFAULT_MONITORING_CONFIG.prometheus.enabled,
    },
    datadog: {
      enabled: DEFAULT_MONITORING_CONFIG.datadog.enabled,
      api_key_present: !!DEFAULT_MONITORING_CONFIG.datadog.apiKey,
    },
    metrics_collected: Object.keys(metricsJSON).length,
  };
}

/**
 * Prometheus scrape config generator
 * Use this to generate the Prometheus config snippet
 */
export function generatePrometheusConfig(options: {
  target: string; // e.g., 'dailyagile.com'
  metricsPath?: string; // default: '/api/observability/metrics'
  metricsToken?: string;
  scrapeInterval?: string; // default: '30s'
  scrapeTimeout?: string; // default: '10s'
}): string {
  return `
# Prometheus scrape config for DailyAgile Webhooks
scrape_configs:
  - job_name: 'dailyagile-webhooks'
    scheme: https
    static_configs:
      - targets: ['${options.target}']
        labels:
          env: production
          service: webhooks
    metrics_path: '${options.metricsPath || '/api/observability/metrics'}'
    params:
      token: ['your-metrics-token']
    scrape_interval: ${options.scrapeInterval || '30s'}
    scrape_timeout: ${options.scrapeTimeout || '10s'}
    ${options.metricsToken ? `authorization:
      credentials: '${options.metricsToken}'` : '# No auth configured - using admin auth'}
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
`;
}

/**
 * Grafana dashboard generator
 * Returns JSON for a pre-built dashboard
 */
export function generateGrafanaDashboardJSON(): Record<string, unknown> {
  return {
    dashboard: {
      title: 'DailyAgile Webhooks',
      panels: [
        {
          title: 'Webhook Latency (P95)',
          targets: [
            {
              expr: 'histogram_quantile(0.95, webhook_processing_latency_seconds_bucket)',
            },
          ],
        },
        {
          title: 'Error Rate',
          targets: [
            {
              expr: 'rate(webhook_processing_errors_total[5m])',
            },
          ],
        },
        {
          title: 'Email Queue Depth',
          targets: [
            {
              expr: 'email_queue_depth',
            },
          ],
        },
        {
          title: 'Student Enrollments (1h)',
          targets: [
            {
              expr: 'rate(student_operations_total{operation="upsert",status="success"}[1h])',
            },
          ],
        },
      ],
    },
  };
}

/**
 * AlertManager rules generator
 * Returns YAML for alert rules
 */
export function generateAlertManagerRulesYAML(): string {
  return `
# AlertManager rules for DailyAgile Webhooks
groups:
  - name: dailyagile_webhooks
    interval: 30s
    rules:
      # High latency alert
      - alert: WebhookHighLatency
        expr: histogram_quantile(0.95, webhook_processing_latency_seconds_bucket) > 0.5
        for: 5m
        annotations:
          summary: "Webhook P95 latency is {{ $value }}s"

      # High error rate alert
      - alert: WebhookHighErrorRate
        expr: rate(webhook_processing_errors_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "Webhook error rate is {{ $value }}"

      # Email queue buildup alert
      - alert: EmailQueueBacklog
        expr: email_queue_depth > 1000
        for: 10m
        annotations:
          summary: "Email queue depth is {{ $value }} (threshold: 1000)"

      # No webhooks for extended period
      - alert: NoWebhookActivity
        expr: rate(webhook_total[15m]) == 0
        for: 30m
        annotations:
          summary: "No webhook activity in the last 15 minutes"
`;
}
