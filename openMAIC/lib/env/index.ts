/**
 * Environment Module Exports
 * ==========================
 *
 * Central export point for all environment-related utilities.
 *
 * Usage:
 *   // Import specific utilities
 *   import { validateEnvironment, getEnvironmentSummary } from '@/lib/env';
 *
 *   // Or import for side effects (runs validation on import)
 *   import '@/lib/env';  // Runs full validation immediately
 */

export {
  EnvironmentValidationError,
  validateEnvironment,
  getEnvironmentSummary,
  isEnvironmentVariableSet,
} from './validation';

export { default as initializeEnvironment } from './init';
