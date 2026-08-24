/**
 * Runtime Environment Initialization
 * ==================================
 *
 * This module should be imported early in the app lifecycle (e.g., in the root layout)
 * to ensure environment validation happens at server startup.
 *
 * This complements the build-time validation in next.config.ts by providing
 * runtime validation of critical environment variables.
 *
 * Usage:
 *   // In app/layout.tsx (server component):
 *   import '@/lib/env/init';
 *
 * This import should be one of the first imports to catch configuration errors
 * as early as possible in the app startup sequence.
 */

import { validateEnvironment, getEnvironmentSummary } from './validation';

/**
 * Initialize environment at server startup
 * This runs once when the server starts up
 */
try {
  // Re-validate environment at runtime
  // (Note: This may fail if env vars changed since build time)
  validateEnvironment();

  // Log environment summary (without sensitive values)
  const summary = getEnvironmentSummary();
  const missingVars = Object.entries(summary)
    .filter(([, isSet]) => !isSet)
    .map(([varName]) => varName);

  if (missingVars.length === 0) {
    console.log('[Init] ✅ All critical environment variables validated at startup');
  } else {
    // This shouldn't happen if build validation passed, but log it just in case
    console.warn(
      `[Init] ⚠️  Runtime validation detected missing variables: ${missingVars.join(', ')}`,
    );
  }
} catch (err) {
  // Log initialization error
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Init] ❌ Environment initialization failed:', message);

  // Re-throw to halt application startup
  throw err;
}
