/**
 * Environment Variables Validation & Startup Checks
 * ==================================================
 *
 * Comprehensive validation of all critical environment variables required
 * for application startup. This module is imported by next.config.js to ensure
 * validation runs at both build time and startup.
 *
 * Validated Variables:
 * - STRIPE_SECRET_KEY: Stripe API secret for payment processing
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret for payment webhooks
 * - SUPABASE_URL: Database connection URL
 * - SUPABASE_SERVICE_ROLE_KEY: Database service role key (for server-side ops)
 *
 * Behavior:
 * - Throws immediately if critical variables are missing (fail fast)
 * - Provides detailed error messages indicating which variables are missing
 * - Runs automatically when this module is imported
 * - Called at build time (via next.config.js) and runtime
 *
 * Time Complexity: O(1) - simple environment variable checks
 * Side Effects: May throw error and halt application startup if validation fails
 *
 * Usage:
 *   // Automatic validation on import:
 *   import '@/lib/env/validation';  // Throws if any critical var missing
 *
 *   // Manual validation:
 *   import { validateEnvironment } from '@/lib/env/validation';
 *   validateEnvironment();  // Re-validate on demand
 *
 * Error Format:
 *   ❌ CRITICAL ENVIRONMENT VARIABLES MISSING
 *   The following required variables are not set:
 *   - STRIPE_WEBHOOK_SECRET: Required for Stripe webhook processing
 *   - SUPABASE_URL: Required for database operations
 *
 *   Action: Set these variables in .env.local or deployment environment
 *   Deployment will fail without these critical variables.
 */

/**
 * Custom error type for environment validation failures
 */
export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentValidationError';
    Object.setPrototypeOf(this, EnvironmentValidationError.prototype);
  }
}

/**
 * Definition of critical environment variables
 * Each entry specifies the variable name and what it's needed for
 */
const CRITICAL_ENV_VARS = {
  STRIPE_SECRET_KEY: {
    description: 'Stripe API secret key for payment processing',
    pattern: /^sk_(test_|live_)/,
    example: 'sk_live_...',
  },
  STRIPE_WEBHOOK_SECRET: {
    description: 'Stripe webhook signing secret for payment webhooks',
    pattern: /^whsec_/,
    example: 'whsec_...',
  },
  SUPABASE_URL: {
    description: 'Supabase database connection URL',
    pattern: /^https:\/\/.*\.supabase\.co$/,
    example: 'https://abc123.supabase.co',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase service role key for server-side database operations',
    pattern: /^(sb_|eyJ)/,  // Supabase service key (sb_) or JWT token (eyJ)
    example: 'sb_secret_... or eyJ...',
  },
} as const;

/**
 * Optional environment variables (warnings if missing, but don't block startup)
 */
const OPTIONAL_ENV_VARS = {
  NEXT_PUBLIC_APP_URL: 'Application URL for email links and redirects',
  BREVO_API_KEY: 'Email service API key (optional if not sending emails)',
  LOG_LEVEL: 'Logging level (default: info)',
} as const;

/**
 * Validate a single environment variable
 * @param varName - Name of the environment variable
 * @param value - Current value (if any)
 * @param config - Configuration for this variable (pattern, description)
 * @returns Error message if invalid, null if valid
 */
function validateSingleVar(
  varName: string,
  value: string | undefined,
  config: (typeof CRITICAL_ENV_VARS)[keyof typeof CRITICAL_ENV_VARS],
): string | null {
  if (!value || value.trim() === '') {
    return `Missing: ${config.description}`;
  }

  // Validate format if pattern is defined
  if (config.pattern && !config.pattern.test(value)) {
    return `Invalid format for ${varName}. Expected pattern: ${config.pattern.source}`;
  }

  return null;
}

/**
 * Validate all critical environment variables
 * @throws EnvironmentValidationError if any critical variable is missing or invalid
 * @returns void (throws on error)
 */
export function validateEnvironment(): void {
  const errors: string[] = [];

  // Check all critical variables
  for (const [varName, config] of Object.entries(CRITICAL_ENV_VARS)) {
    const value = process.env[varName as keyof typeof process.env];
    const error = validateSingleVar(varName, value as string | undefined, config);

    if (error) {
      errors.push(`  - ${varName}: ${error}`);
    }
  }

  // If there are critical errors, throw immediately
  if (errors.length > 0) {
    const errorMessage = [
      '',
      '❌ CRITICAL ENVIRONMENT VARIABLES MISSING',
      'The following required variables are not set:',
      ...errors,
      '',
      'Action: Set these variables in .env.local or deployment environment',
      'Deployment will fail without these critical variables.',
      '',
      'Reference: See CLAUDE.md for complete .env.local template',
      '',
    ].join('\n');

    throw new EnvironmentValidationError(errorMessage);
  }

  // Warn about optional variables
  const optionalWarnings: string[] = [];
  for (const [varName, description] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[varName as keyof typeof process.env];
    if (!value || value.trim() === '') {
      optionalWarnings.push(`  ⚠️  ${varName}: ${description}`);
    }
  }

  if (optionalWarnings.length > 0) {
    console.warn(
      [
        '',
        '⚠️  OPTIONAL ENVIRONMENT VARIABLES NOT SET',
        'These are recommended but not required:',
        ...optionalWarnings,
        '',
        'Note: Application will start without these, but some features may be limited',
        '',
      ].join('\n'),
    );
  }

  // Log successful validation
  console.log('✅ Environment validation passed - all critical variables set');
}

/**
 * Get a summary of current environment configuration (without sensitive values)
 * Useful for debugging and status pages
 */
export function getEnvironmentSummary(): Record<string, boolean> {
  const summary: Record<string, boolean> = {};

  for (const varName of Object.keys(CRITICAL_ENV_VARS)) {
    const value = process.env[varName as keyof typeof process.env];
    summary[varName] = !!(value && value.trim() !== '');
  }

  return summary;
}

/**
 * Check if a specific environment variable is set
 * @param varName - Name of the variable to check
 * @returns true if variable is set and non-empty, false otherwise
 */
export function isEnvironmentVariableSet(varName: keyof typeof CRITICAL_ENV_VARS): boolean {
  const value = process.env[varName];
  return !!(value && value.trim() !== '');
}

/**
 * Validate environment on module import
 * This happens automatically when the module is loaded by next.config.js
 * and also at runtime startup
 */
try {
  validateEnvironment();
} catch (err) {
  // Re-throw immediately to halt application startup
  if (err instanceof EnvironmentValidationError) {
    throw err;
  }
  throw new EnvironmentValidationError(`Failed to validate environment: ${String(err)}`);
}
