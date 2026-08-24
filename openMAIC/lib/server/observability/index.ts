/**
 * Observability Module - Production-grade observability for DailyAgile Platform
 *
 * Exports:
 * - StructuredLogger: Structured logging with correlation IDs and PII redaction
 * - MetricsCollector: Prometheus-compatible metrics
 * - FeatureFlagManager: Feature flags for gradual rollout and A/B testing
 * - DistributedTracingHooks: Datadog/Jaeger tracing integration
 *
 * Usage in webhook handler:
 * import { StructuredLogger, MetricsCollector, FeatureFlagManager } from '@/lib/server/observability';
 *
 * const logger = new StructuredLogger('webhook-handler', {
 *   correlationId: req.headers.get('x-correlation-id'),
 *   webhookId: event.id,
 *   supabaseClient: supabase,
 * });
 *
 * const metrics = getGlobalMetricsCollector();
 * const flags = getGlobalFeatureFlagManager(supabase);
 *
 * if (await flags.isEnabled('WEBHOOK_PROCESSING_ENABLED')) {
 *   const start = Date.now();
 *   try {
 *     // Process webhook...
 *     metrics.recordWebhook('success');
 *   } catch (err) {
 *     metrics.recordError('database_error');
 *     await logger.logError('database_error', err.message, err.stack);
 *   } finally {
 *     metrics.recordWebhookLatency(Date.now() - start);
 *   }
 * }
 */

export { StructuredLogger } from './structured-logger';
export {
  MetricsCollector,
  getGlobalMetricsCollector,
  getPrometheusRegistry,
} from './metrics-collector';
export { FeatureFlagManager, getGlobalFeatureFlagManager } from './feature-flags';
export { TraceSpan, DistributedTracingHooks, createTracingFromHeaders } from './distributed-tracing';
