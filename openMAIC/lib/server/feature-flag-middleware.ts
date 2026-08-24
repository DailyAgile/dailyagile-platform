/**
 * Feature Flag Middleware Utilities
 * Provides helper functions to check feature flags at the API endpoint level
 * Logs feature flag decisions for audit and debugging
 */

import { isFeatureEnabled, isFeatureEnabledForOrg } from './feature-flags';
import { createLogger } from '@/lib/logger';

const log = createLogger('FeatureFlagMiddleware');

export type FeatureFlagCheckMode = 'strict' | 'fallback';

interface FeatureFlagCheckResult {
  enabled: boolean;
  flagName: string;
  reason: string;
}

/**
 * Check if a feature flag is enabled globally
 * Logs the decision for audit purposes
 * @param flagName - Name of the feature flag
 * @param context - Additional context for logging (e.g., userId, action)
 * @returns FeatureFlagCheckResult with enabled status and reason
 */
export async function checkFeatureFlagGlobal(
  flagName: string,
  context?: Record<string, any>
): Promise<FeatureFlagCheckResult> {
  try {
    const enabled = await isFeatureEnabled(flagName);

    log.debug(`Feature flag check: ${flagName}=${enabled}`, {
      context,
      timestamp: new Date().toISOString(),
    });

    return {
      enabled,
      flagName,
      reason: enabled ? 'Feature enabled' : 'Feature disabled',
    };
  } catch (error) {
    log.error(`Error checking feature flag "${flagName}":`, error);
    // Fail safe: assume feature is disabled on error
    return {
      enabled: false,
      flagName,
      reason: 'Error checking flag (defaulting to disabled)',
    };
  }
}

/**
 * Check if a feature flag is enabled for a specific organization
 * Considers org-level overrides, then falls back to global setting
 * Logs the decision for audit purposes
 * @param flagName - Name of the feature flag
 * @param orgId - Organization ID
 * @param context - Additional context for logging
 * @returns FeatureFlagCheckResult with enabled status and reason
 */
export async function checkFeatureFlagForOrg(
  flagName: string,
  orgId: string,
  context?: Record<string, any>
): Promise<FeatureFlagCheckResult> {
  try {
    const enabled = await isFeatureEnabledForOrg(flagName, orgId);

    log.debug(`Feature flag check for org: ${flagName}=${enabled} (org=${orgId})`, {
      context,
      timestamp: new Date().toISOString(),
    });

    return {
      enabled,
      flagName,
      reason: enabled
        ? `Feature enabled for org ${orgId}`
        : `Feature disabled for org ${orgId}`,
    };
  } catch (error) {
    log.error(`Error checking feature flag "${flagName}" for org "${orgId}":`, error);
    // Fail safe: assume feature is disabled on error
    return {
      enabled: false,
      flagName,
      reason: 'Error checking org flag (defaulting to disabled)',
    };
  }
}

/**
 * Enforce a feature flag check - throws error if feature is disabled
 * Used when a feature is critical and should be blocked if disabled
 * @param flagName - Name of the feature flag
 * @param context - Additional context for logging
 * @throws Error if feature is disabled
 */
export async function enforceFeatureFlag(
  flagName: string,
  context?: Record<string, any>
): Promise<void> {
  const result = await checkFeatureFlagGlobal(flagName, context);

  if (!result.enabled) {
    const error = new Error(`Feature "${flagName}" is not available`);
    (error as any).code = 'FEATURE_DISABLED';
    (error as any).flagName = flagName;
    log.warn(`Feature flag enforcement failed: ${flagName}`, {
      context,
      reason: result.reason,
    });
    throw error;
  }

  log.info(`Feature flag enforcement passed: ${flagName}`, { context });
}

/**
 * Enforce a feature flag check for a specific organization
 * @param flagName - Name of the feature flag
 * @param orgId - Organization ID
 * @param context - Additional context for logging
 * @throws Error if feature is disabled for the org
 */
export async function enforceFeatureFlagForOrg(
  flagName: string,
  orgId: string,
  context?: Record<string, any>
): Promise<void> {
  const result = await checkFeatureFlagForOrg(flagName, orgId, context);

  if (!result.enabled) {
    const error = new Error(`Feature "${flagName}" is not available for organization ${orgId}`);
    (error as any).code = 'FEATURE_DISABLED_FOR_ORG';
    (error as any).flagName = flagName;
    (error as any).orgId = orgId;
    log.warn(`Feature flag enforcement failed for org: ${flagName} (org=${orgId})`, {
      context,
      reason: result.reason,
    });
    throw error;
  }

  log.info(`Feature flag enforcement passed for org: ${flagName} (org=${orgId})`, { context });
}

/**
 * Get feature flag status and decide on fallback behavior
 * Useful for graceful degradation when a feature is disabled
 * @param flagName - Name of the feature flag
 * @param fallbackValue - Value to return if feature is disabled
 * @param context - Additional context for logging
 * @returns The feature flag status or fallback value
 */
export async function getFeatureFlagWithFallback<T>(
  flagName: string,
  fallbackValue: T,
  context?: Record<string, any>
): Promise<{ enabled: boolean; value: T | null }> {
  const result = await checkFeatureFlagGlobal(flagName, context);

  if (!result.enabled) {
    log.debug(`Using fallback for feature flag: ${flagName}`, { context });
    return {
      enabled: false,
      value: fallbackValue,
    };
  }

  return {
    enabled: true,
    value: null,
  };
}

/**
 * Create a consistent error response for disabled features
 * Used to return a standardized API error when a feature is disabled
 * @param flagName - Name of the feature flag
 * @returns Object with error code and message
 */
export function getFeatureDisabledError(flagName: string) {
  return {
    code: 'FEATURE_DISABLED',
    status: 403,
    message: `Feature "${flagName}" is not available in your plan. Please upgrade to access this feature.`,
  };
}

/**
 * Batch check multiple feature flags
 * Useful for checking several related features in one operation
 * @param flagNames - Array of feature flag names to check
 * @param context - Additional context for logging
 * @returns Map of flag names to their enabled status
 */
export async function checkMultipleFlags(
  flagNames: string[],
  context?: Record<string, any>
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  await Promise.all(
    flagNames.map(async (flagName) => {
      const result = await checkFeatureFlagGlobal(flagName, context);
      results.set(flagName, result.enabled);
    })
  );

  log.debug(`Batch feature flag check: ${flagNames.length} flags checked`, {
    context,
    flags: Array.from(results.entries()),
  });

  return results;
}
