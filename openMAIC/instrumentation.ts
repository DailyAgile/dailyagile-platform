/**
 * Sentry Error Tracking Initialization
 *
 * This file is auto-loaded by Next.js at startup when using the `experimental.instrumentationHook`
 * feature in next.config.ts. It initializes Sentry for error tracking across all routes.
 *
 * Documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const sentry = await import('@sentry/nextjs');

    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';

    // Only initialize if DSN is configured (allows graceful degradation in dev)
    if (dsn) {
      sentry.init({
        dsn,
        environment,
        enabled: environment === 'production',

        // Performance monitoring — sample 10% of transactions in production
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // Ignore known client-side errors (third-party libs, bots)
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          'NetworkError',
          'AbortError',
        ],

        // Redact sensitive data
        allowUrls: [/.*/], // All URLs are allowed in this project
        beforeSend(event, hint) {
          // Remove potentially sensitive headers
          if (event.request) {
            delete event.request.headers?.cookie;
            delete event.request.headers?.authorization;
          }
          return event;
        },

        // Attach breadcrumbs for debugging
        attachStacktrace: true,
        maxBreadcrumbs: 50,

        // Release tracking (set via CI/CD or Vercel)
        release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      });

      console.log(`[Sentry] Initialized with environment="${environment}" and DSN endpoint="${dsn.split('@')[1]?.split('/')[0] || 'unknown'}"`);
    } else if (environment === 'production') {
      console.warn('[Sentry] SENTRY_DSN not configured in production - error tracking disabled');
    }
  }
}
