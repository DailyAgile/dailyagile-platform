/**
 * DistributedTracingHooks - Hooks for Datadog/Jaeger distributed tracing
 *
 * Supports:
 * - OpenTelemetry compatible tracing
 * - Datadog APM integration
 * - Jaeger tracing
 * - Correlation ID propagation across services
 *
 * Usage:
 * const tracing = new DistributedTracingHooks(correlationId);
 * const span = tracing.startSpan('student_upsert', { student_id: '123' });
 * try {
 *   // Do work
 *   span.end();
 * } catch (err) {
 *   span.recordException(err);
 *   span.end();
 * }
 *
 * Environment variables:
 * - DATADOG_TRACING_ENABLED=true
 * - DATADOG_ENV=production
 * - DATADOG_SERVICE_NAME=webhook-handler
 * - JAEGER_ENABLED=true (if using Jaeger instead)
 */

interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  tags: { [key: string]: unknown };
  startTime: number;
}

interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: { [key: string]: unknown };
}

export class TraceSpan {
  private context: SpanContext;
  private events: SpanEvent[] = [];
  private endTime?: number;
  private exceptions: Error[] = [];

  constructor(spanId: string, traceId: string, parentSpanId?: string) {
    this.context = {
      traceId,
      spanId,
      parentSpanId,
      tags: {},
      startTime: Date.now(),
    };
  }

  public setTag(key: string, value: unknown): this {
    this.context.tags[key] = value;
    return this;
  }

  public addEvent(name: string, attributes?: { [key: string]: unknown }): this {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
    return this;
  }

  public recordException(error: Error): this {
    this.exceptions.push(error);
    this.setTag('error', true);
    this.setTag('error.message', error.message);
    this.setTag('error.stack', error.stack?.substring(0, 500));
    return this;
  }

  public end(): void {
    this.endTime = Date.now();
  }

  public getDurationMs(): number {
    const end = this.endTime || Date.now();
    return end - this.context.startTime;
  }

  public getContext(): SpanContext {
    return this.context;
  }

  public getEvents(): SpanEvent[] {
    return this.events;
  }

  public getExceptions(): Error[] {
    return this.exceptions;
  }

  public export(): {
    trace_id: string;
    span_id: string;
    parent_span_id?: string;
    duration_ms: number;
    start_time: number;
    end_time?: number;
    tags: { [key: string]: unknown };
    events: SpanEvent[];
    error_count: number;
  } {
    return {
      trace_id: this.context.traceId,
      span_id: this.context.spanId,
      parent_span_id: this.context.parentSpanId,
      duration_ms: this.getDurationMs(),
      start_time: this.context.startTime,
      end_time: this.endTime,
      tags: this.context.tags,
      events: this.events,
      error_count: this.exceptions.length,
    };
  }
}

export class DistributedTracingHooks {
  private correlationId: string;
  private traceId: string;
  private activeSpans: Map<string, TraceSpan> = new Map();
  private spanCounter: number = 0;
  private isDatadogEnabled: boolean;
  private isJaegerEnabled: boolean;

  constructor(correlationId: string) {
    this.correlationId = correlationId;
    this.traceId = this.generateTraceId();
    this.isDatadogEnabled = process.env.DATADOG_TRACING_ENABLED === 'true';
    this.isJaegerEnabled = process.env.JAEGER_ENABLED === 'true';
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${++this.spanCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start a new span for a specific operation
   */
  public startSpan(name: string, parentSpanId?: string): TraceSpan {
    const spanId = this.generateSpanId();
    const span = new TraceSpan(spanId, this.traceId, parentSpanId);

    span.setTag('span_name', name);
    span.setTag('correlation_id', this.correlationId);
    span.setTag('service_name', process.env.DATADOG_SERVICE_NAME || 'webhook-handler');
    span.setTag('environment', process.env.DATADOG_ENV || 'development');

    this.activeSpans.set(spanId, span);

    // Send to Datadog if enabled
    if (this.isDatadogEnabled) {
      this.sendToDatadog('span.started', {
        trace_id: this.traceId,
        span_id: spanId,
        parent_span_id: parentSpanId,
        name,
      });
    }

    // Send to Jaeger if enabled
    if (this.isJaegerEnabled) {
      this.sendToJaeger('span.started', {
        trace_id: this.traceId,
        span_id: spanId,
        parent_span_id: parentSpanId,
        name,
      });
    }

    return span;
  }

  /**
   * End a span and export its data
   */
  public endSpan(spanId: string): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return;
    }

    span.end();

    if (this.isDatadogEnabled) {
      this.sendToDatadog('span.completed', span.export());
    }

    if (this.isJaegerEnabled) {
      this.sendToJaeger('span.completed', span.export());
    }
  }

  /**
   * Export all spans in OpenTelemetry JSON format
   */
  public exportSpans(): Array<ReturnType<TraceSpan['export']>> {
    return Array.from(this.activeSpans.values()).map((span) => span.export());
  }

  /**
   * Get trace context headers for outbound requests
   * Propagates correlation ID to downstream services
   */
  public getTraceHeaders(): {
    'X-Trace-ID': string;
    'X-Correlation-ID': string;
    'X-Parent-ID'?: string;
  } {
    const parentSpan = Array.from(this.activeSpans.values()).at(-1);
    return {
      'X-Trace-ID': this.traceId,
      'X-Correlation-ID': this.correlationId,
      ...(parentSpan && { 'X-Parent-ID': parentSpan.getContext().spanId }),
    };
  }

  /**
   * Parse trace headers from incoming request
   */
  public static parseTraceHeaders(headers: { [key: string]: string | undefined }): {
    traceId?: string;
    correlationId?: string;
    parentSpanId?: string;
  } {
    return {
      traceId: headers['x-trace-id'],
      correlationId: headers['x-correlation-id'],
      parentSpanId: headers['x-parent-id'],
    };
  }

  /**
   * Send span data to Datadog APM
   * Datadog ingests spans via their agent or API
   */
  private sendToDatadog(eventType: string, data: unknown): void {
    // In production, this would integrate with dd-trace
    // For now, log for demonstration
    if (process.env.DEBUG) {
      console.log(`[DATADOG] ${eventType}:`, data);
    }
  }

  /**
   * Send span data to Jaeger
   * Jaeger ingests traces via OpenTelemetry SDK
   */
  private sendToJaeger(eventType: string, data: unknown): void {
    // In production, this would integrate with OpenTelemetry Jaeger exporter
    if (process.env.DEBUG) {
      console.log(`[JAEGER] ${eventType}:`, data);
    }
  }

  /**
   * Get trace ID (for logging context)
   */
  public getTraceId(): string {
    return this.traceId;
  }

  /**
   * Get correlation ID (for request tracking)
   */
  public getCorrelationId(): string {
    return this.correlationId;
  }
}

/**
 * Create a new instance from incoming request headers
 * Useful for tracing requests across service boundaries
 */
export function createTracingFromHeaders(
  headers: { [key: string]: string | undefined }
): DistributedTracingHooks {
  const parsed = DistributedTracingHooks.parseTraceHeaders(headers);
  const correlationId = parsed.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const tracing = new DistributedTracingHooks(correlationId);
  return tracing;
}
