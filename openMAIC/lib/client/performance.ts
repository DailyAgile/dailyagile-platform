/**
 * Performance Monitoring
 * Tracks Core Web Vitals and performance metrics
 * Integrates with Vercel Web Analytics
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('Performance');

/**
 * Core Web Vitals Types
 */
export interface WebVitals {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  FCP?: number; // First Contentful Paint
}

export interface PerformanceMetrics extends WebVitals {
  navigation: {
    domInteractive: number;
    domComplete: number;
    loadEventStart: number;
    loadEventEnd: number;
  };
  resources: {
    scriptCount: number;
    styleCount: number;
    imageCount: number;
    fontCount: number;
    totalSize: number;
  };
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Monitor Core Web Vitals
  monitorCoreWebVitals();

  // Monitor long tasks
  monitorLongTasks();

  // Monitor memory usage
  monitorMemoryUsage();

  // Track page visibility
  trackPageVisibility();

  log.info('Performance monitoring initialized');
}

/**
 * Monitor Core Web Vitals
 */
export function monitorCoreWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        const lcp = lastEntry.renderTime || lastEntry.loadTime;

        if (lcp > 2500) {
          log.warn(`LCP is high: ${lcp}ms (target: <2500ms)`);
        }

        // Send to analytics
        sendMetric('LCP', lcp);
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (err) {
      log.debug('LCP observer not supported:', err);
    }

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingDuration;
          if (fid > 100) {
            log.warn(`FID is high: ${fid}ms (target: <100ms)`);
          }
          sendMetric('FID', fid);
        }
      });

      fidObserver.observe({ entryTypes: ['first-input', 'largest-contentful-paint'] });
    } catch (err) {
      log.debug('FID observer not supported:', err);
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            if (clsValue > 0.1) {
              log.warn(`CLS is high: ${clsValue} (target: <0.1)`);
            }
          }
        }
        sendMetric('CLS', clsValue);
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (err) {
      log.debug('CLS observer not supported:', err);
    }

    // Time to First Byte (TTFB)
    try {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        const ttfb = perfData.responseStart - perfData.requestStart;
        if (ttfb > 600) {
          log.warn(`TTFB is high: ${ttfb}ms (target: <600ms)`);
        }
        sendMetric('TTFB', ttfb);
      }
    } catch (err) {
      log.debug('TTFB calculation failed:', err);
    }

    // First Contentful Paint (FCP)
    try {
      const fcpEntries = performance.getEntriesByName('first-contentful-paint');
      if (fcpEntries.length > 0) {
        const fcp = fcpEntries[0].startTime;
        if (fcp > 1800) {
          log.warn(`FCP is high: ${fcp}ms (target: <1800ms)`);
        }
        sendMetric('FCP', fcp);
      }
    } catch (err) {
      log.debug('FCP calculation failed:', err);
    }
  }
}

/**
 * Monitor long tasks (>50ms)
 */
export function monitorLongTasks(): void {
  if (typeof window === 'undefined') return;

  if ('PerformanceObserver' in window) {
    try {
      const taskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = (entry as any).duration;
          if (duration > 50) {
            log.debug(`Long task detected: ${duration}ms`);
            sendMetric('LongTask', duration);
          }
        }
      });

      taskObserver.observe({ entryTypes: ['longtask'] });
    } catch (err) {
      log.debug('Long task observer not supported:', err);
    }
  }
}

/**
 * Monitor memory usage
 */
export function monitorMemoryUsage(): void {
  if (typeof window === 'undefined') return;

  if ((performance as any).memory) {
    const checkInterval = 30000; // Check every 30 seconds

    setInterval(() => {
      const memory = (performance as any).memory;
      const heapUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      if (heapUsagePercent > 90) {
        log.warn(`High memory usage: ${heapUsagePercent.toFixed(1)}% of heap`);
        sendMetric('MemoryUsage', heapUsagePercent);
      }
    }, checkInterval);
  }
}

/**
 * Track page visibility changes
 */
export function trackPageVisibility(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    const metric = document.hidden ? 'PageHidden' : 'PageVisible';
    sendMetric(metric, Date.now());
  });
}

/**
 * Get all performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paintEntries = performance.getEntriesByType('paint');
  const resourceEntries = performance.getEntriesByType('resource');

  // Count resources by type
  const resourceCounts = {
    scriptCount: 0,
    styleCount: 0,
    imageCount: 0,
    fontCount: 0,
    totalSize: 0,
  };

  for (const resource of resourceEntries) {
    const url = resource.name.toLowerCase();
    if (url.includes('.js')) resourceCounts.scriptCount++;
    if (url.includes('.css')) resourceCounts.styleCount++;
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) resourceCounts.imageCount++;
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) resourceCounts.fontCount++;

    const perfRes = resource as PerformanceResourceTiming;
    resourceCounts.totalSize += perfRes.transferSize || 0;
  }

  const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint');
  const fcp = fcpEntry ? fcpEntry.startTime : undefined;

  return {
    LCP: undefined, // Measured by observer
    FID: undefined, // Measured by observer
    CLS: undefined, // Measured by observer
    TTFB: navigation.responseStart - navigation.requestStart,
    FCP: fcp,
    navigation: {
      domInteractive: navigation.domInteractive,
      domComplete: navigation.domComplete,
      loadEventStart: navigation.loadEventStart,
      loadEventEnd: navigation.loadEventEnd,
    },
    resources: resourceCounts,
  };
}

/**
 * Send metric to analytics (Vercel Web Analytics or custom endpoint)
 */
export function sendMetric(name: string, value: number): void {
  try {
    // If using Vercel Web Analytics, it's auto-collected
    // For custom analytics, send here
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          value,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : '',
        }),
        keepalive: true,
      }).catch(() => {
        // Fail silently - analytics shouldn't break the app
      });
    }
  } catch (err) {
    log.debug('Failed to send metric:', err);
  }
}

/**
 * Measure component render time
 */
export function measureComponentRender(
  componentName: string,
  callback: () => void
): number {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (duration > 50) {
    log.debug(`Slow component render: ${componentName} (${duration}ms)`);
  }

  sendMetric(`ComponentRender_${componentName}`, duration);
  return duration;
}

/**
 * Create performance mark for profiling
 */
export function markPerformance(name: string): () => number {
  const markName = `${name}-start`;
  performance.mark(markName);

  return () => {
    const endMarkName = `${name}-end`;
    performance.mark(endMarkName);

    try {
      performance.measure(name, markName, endMarkName);
      const measures = performance.getEntriesByName(name, 'measure');
      if (measures.length > 0) {
        const duration = measures[0].duration;
        sendMetric(`Measure_${name}`, duration);
        return duration;
      }
    } catch (err) {
      log.debug(`Failed to measure ${name}:`, err);
    }

    return 0;
  };
}

/**
 * Performance budget checker
 */
export const PERFORMANCE_BUDGETS = {
  LCP: 2500, // ms - Largest Contentful Paint
  FID: 100, // ms - First Input Delay
  CLS: 0.1, // score - Cumulative Layout Shift
  TTFB: 600, // ms - Time to First Byte
  FCP: 1800, // ms - First Contentful Paint
  mainChunkSize: 150 * 1024, // bytes - Main JS bundle
  quizChunkSize: 50 * 1024, // bytes - Quiz player chunk
};

export function checkPerformanceBudgets(
  metrics: Partial<WebVitals>
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metrics.LCP && metrics.LCP > PERFORMANCE_BUDGETS.LCP) {
    violations.push(`LCP ${metrics.LCP}ms exceeds budget ${PERFORMANCE_BUDGETS.LCP}ms`);
  }

  if (metrics.FID && metrics.FID > PERFORMANCE_BUDGETS.FID) {
    violations.push(`FID ${metrics.FID}ms exceeds budget ${PERFORMANCE_BUDGETS.FID}ms`);
  }

  if (metrics.CLS && metrics.CLS > PERFORMANCE_BUDGETS.CLS) {
    violations.push(`CLS ${metrics.CLS} exceeds budget ${PERFORMANCE_BUDGETS.CLS}`);
  }

  if (metrics.TTFB && metrics.TTFB > PERFORMANCE_BUDGETS.TTFB) {
    violations.push(`TTFB ${metrics.TTFB}ms exceeds budget ${PERFORMANCE_BUDGETS.TTFB}ms`);
  }

  if (metrics.FCP && metrics.FCP > PERFORMANCE_BUDGETS.FCP) {
    violations.push(`FCP ${metrics.FCP}ms exceeds budget ${PERFORMANCE_BUDGETS.FCP}ms`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
