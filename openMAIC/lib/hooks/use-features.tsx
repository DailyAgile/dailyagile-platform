/**
 * Feature Flags React Hooks
 * Client-side hooks for checking feature availability in UI components
 *
 * Usage:
 *   const isAnalyticsEnabled = useFeature('analytics_dashboard');
 *   if (isAnalyticsEnabled) {
 *     return <AnalyticsDashboard />;
 *   }
 *
 *   const orgFeatures = useOrgFeatures(orgId);
 *   {orgFeatures.includes('team_collaboration') && <TeamNav />}
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('UseFeatures');

// Cache for feature checks (client-side)
interface FeatureCache {
  timestamp: number;
  features: Map<string, boolean>;
}

interface OrgFeatureCache {
  [orgId: string]: {
    timestamp: number;
    features: string[];
  };
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let clientCache: FeatureCache = { timestamp: 0, features: new Map() };
let orgClientCache: OrgFeatureCache = {};

/**
 * Hook to check if a single feature is enabled
 * @param flagName - Name of the feature flag to check
 * @returns boolean - true if feature is enabled, false otherwise
 */
export function useFeature(flagName: string): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkFeature = async () => {
      try {
        // Check client cache first
        const now = Date.now();
        if (
          now - clientCache.timestamp < CACHE_TTL &&
          clientCache.features.has(flagName)
        ) {
          if (isMounted) {
            setIsEnabled(clientCache.features.get(flagName) || false);
            setIsLoading(false);
          }
          return;
        }

        // Fetch from API
        const response = await fetch(`/api/features/${flagName}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          log.warn(`Failed to fetch feature flag "${flagName}":`, response.statusText);
          return;
        }

        const { enabled } = await response.json();

        // Update cache
        clientCache.features.set(flagName, enabled);
        clientCache.timestamp = Date.now();

        if (isMounted) {
          setIsEnabled(enabled);
          setIsLoading(false);
        }
      } catch (error) {
        log.error(`Error checking feature "${flagName}":`, error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkFeature();

    return () => {
      isMounted = false;
    };
  }, [flagName]);

  return isEnabled && !isLoading;
}

/**
 * Hook to get multiple features at once
 * More efficient than calling useFeature multiple times
 * @param flagNames - Array of feature flag names to check
 * @returns Object mapping flag names to enabled status
 */
export function useFeatures(flagNames: string[]) {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkFeatures = async () => {
      try {
        // Try to get from cache first
        const now = Date.now();
        const cacheValid = now - clientCache.timestamp < CACHE_TTL;

        if (cacheValid) {
          const cached = flagNames.reduce((acc, flag) => {
            acc[flag] = clientCache.features.get(flag) || false;
            return acc;
          }, {} as Record<string, boolean>);
          if (Object.keys(cached).length === flagNames.length) {
            if (isMounted) {
              setFeatures(cached);
              setIsLoading(false);
            }
            return;
          }
        }

        // Fetch from API
        const response = await fetch('/api/features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flags: flagNames }),
        });

        if (!response.ok) {
          log.warn('Failed to fetch feature flags:', response.statusText);
          return;
        }

        const { features: fetchedFeatures } = await response.json();

        // Update cache
        Object.entries(fetchedFeatures).forEach(([flag, enabled]) => {
          clientCache.features.set(flag, enabled as boolean);
        });
        clientCache.timestamp = Date.now();

        if (isMounted) {
          setFeatures(fetchedFeatures);
          setIsLoading(false);
        }
      } catch (error) {
        log.error('Error fetching features:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkFeatures();

    return () => {
      isMounted = false;
    };
  }, [flagNames.join(',')]); // Re-run if flag list changes

  return { features, isLoading };
}

/**
 * Hook to get all enabled features for an organization
 * @param orgId - Organization ID
 * @returns Array of enabled feature flag names
 */
export function useOrgFeatures(orgId: string): string[] {
  const [features, setFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkOrgFeatures = async () => {
      try {
        // Check org cache first
        const now = Date.now();
        if (
          orgClientCache[orgId] &&
          now - orgClientCache[orgId].timestamp < CACHE_TTL
        ) {
          if (isMounted) {
            setFeatures(orgClientCache[orgId].features);
            setIsLoading(false);
          }
          return;
        }

        // Fetch from API
        const response = await fetch(`/api/features/orgs/${orgId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          log.warn(
            `Failed to fetch org features for "${orgId}":`,
            response.statusText
          );
          return;
        }

        const { features: fetchedFeatures } = await response.json();

        // Update cache
        if (!orgClientCache[orgId]) {
          orgClientCache[orgId] = { timestamp: 0, features: [] };
        }
        orgClientCache[orgId].features = fetchedFeatures;
        orgClientCache[orgId].timestamp = Date.now();

        if (isMounted) {
          setFeatures(fetchedFeatures);
          setIsLoading(false);
        }
      } catch (error) {
        log.error(`Error fetching org features for "${orgId}":`, error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkOrgFeatures();

    return () => {
      isMounted = false;
    };
  }, [orgId]);

  return features;
}

/**
 * Hook to conditionally render components based on feature flags
 * @param flagName - Name of the feature flag
 * @param children - Content to render if feature is enabled
 * @param fallback - Content to render if feature is disabled
 * @returns JSX element
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  const isEnabled = useFeature(flag);

  if (isEnabled) {
    return children;
  }

  return fallback;
}

/**
 * Hook to check feature and organize multiple features
 * Useful for showing/hiding entire sections based on features
 * @param requiredFlags - Array of flags that must be enabled
 * @returns boolean - true if all required flags are enabled
 */
export function useRequireFeatures(requiredFlags: string[]): boolean {
  const { features, isLoading } = useFeatures(requiredFlags);

  if (isLoading) return false;

  return requiredFlags.every((flag) => features[flag] === true);
}

/**
 * Hook to check if user has ANY of the specified features
 * Useful for showing/hiding features when user has at least one
 * @param anyOfFlags - Array of flags where at least one must be enabled
 * @returns boolean - true if at least one flag is enabled
 */
export function useAnyFeatures(anyOfFlags: string[]): boolean {
  const { features, isLoading } = useFeatures(anyOfFlags);

  if (isLoading) return false;

  return anyOfFlags.some((flag) => features[flag] === true);
}

/**
 * Clear client-side cache (useful after admin changes flags)
 * Call this from an admin panel after toggling flags
 */
export function clearFeatureCache(): void {
  clientCache = { timestamp: 0, features: new Map() };
  orgClientCache = {};
  log.info('Client feature cache cleared');
}
