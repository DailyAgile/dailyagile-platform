/**
 * Feature Flags Service
 * Backend service for checking and managing feature flags
 * Supports global flags and per-organization overrides
 */

import { getSupabaseClient } from './supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('FeatureFlags');

// Cache for feature flags to reduce DB queries
interface FlagCache {
  timestamp: number;
  flags: Map<string, boolean>;
}

interface OrgFlagCache {
  [orgId: string]: {
    timestamp: number;
    flags: Map<string, boolean>;
  };
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let globalFlagCache: FlagCache = { timestamp: 0, flags: new Map() };
let orgFlagCache: OrgFlagCache = {};

/**
 * Clear all feature flag caches
 * Call this after updating flags in admin panel
 */
export function clearFeatureFlagCache(): void {
  globalFlagCache = { timestamp: 0, flags: new Map() };
  orgFlagCache = {};
  log.info('Feature flag cache cleared');
}

/**
 * Check if cache is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Check if a feature is enabled globally
 * @param flagName - Name of the feature flag
 * @returns boolean - true if feature is enabled, false otherwise
 */
export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  try {
    // Check cache first
    if (isCacheValid(globalFlagCache.timestamp) && globalFlagCache.flags.has(flagName)) {
      return globalFlagCache.flags.get(flagName) || false;
    }

    const supabase = getSupabaseClient();

    // Fetch from database
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('flag_name', flagName)
      .single();

    if (error || !data) {
      log.warn(`Feature flag "${flagName}" not found`);
      // Default to false if flag doesn't exist
      globalFlagCache.flags.set(flagName, false);
      return false;
    }

    // Update cache
    globalFlagCache.flags.set(flagName, data.enabled);
    globalFlagCache.timestamp = Date.now();

    return data.enabled;
  } catch (error) {
    log.error(`Error checking feature flag "${flagName}":`, error);
    // Fail safe: return false on error
    return false;
  }
}

/**
 * Check if a feature is enabled for a specific organization
 * Considers organization-level overrides first, then falls back to global
 * @param flagName - Name of the feature flag
 * @param orgId - Organization ID
 * @returns boolean - true if feature is enabled for org, false otherwise
 */
export async function isFeatureEnabledForOrg(flagName: string, orgId: string): Promise<boolean> {
  try {
    // Check cache first
    if (!orgFlagCache[orgId]) {
      orgFlagCache[orgId] = { timestamp: 0, flags: new Map() };
    }

    const cache = orgFlagCache[orgId];
    if (isCacheValid(cache.timestamp) && cache.flags.has(flagName)) {
      return cache.flags.get(flagName) || false;
    }

    const supabase = getSupabaseClient();

    // Check for organization override first
    const { data: orgOverride, error: orgError } = await supabase
      .from('organization_features')
      .select('enabled')
      .eq('org_id', orgId)
      .eq('flag_name', flagName)
      .single();

    if (orgOverride && !orgError) {
      // Organization has explicit override
      cache.flags.set(flagName, orgOverride.enabled);
      cache.timestamp = Date.now();
      return orgOverride.enabled;
    }

    // Fall back to global flag
    const globalEnabled = await isFeatureEnabled(flagName);
    cache.flags.set(flagName, globalEnabled);
    cache.timestamp = Date.now();

    return globalEnabled;
  } catch (error) {
    log.error(`Error checking feature flag "${flagName}" for org "${orgId}":`, error);
    // Fail safe: return false on error
    return false;
  }
}

/**
 * Get all enabled features for an organization
 * @param orgId - Organization ID
 * @returns Promise<string[]> - Array of enabled feature flag names
 */
export async function getOrgFeatures(orgId: string): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();

    // Use the SQL function to get all enabled features
    const { data, error } = await supabase
      .rpc('get_org_features', { org_id: orgId });

    if (error) {
      log.warn(`Error fetching org features for ${orgId}:`, error);
      return [];
    }

    // Extract flag names from results
    return data?.map((row: any) => row.flag_name) || [];
  } catch (error) {
    log.error(`Error getting org features for "${orgId}":`, error);
    return [];
  }
}

/**
 * Get all features with their current status
 * @returns Promise with all features
 */
export async function getAllFeatures() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true })
      .order('flag_name', { ascending: true });

    if (error) {
      log.error('Error fetching all features:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error getting all features:', error);
    return [];
  }
}

/**
 * Get billing tier features
 * @param tier - Billing tier ('free', 'pro', 'enterprise')
 * @returns Promise<string[]> - Array of enabled feature flag names for tier
 */
export async function getTierFeatures(tier: string): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('billing_tier_features')
      .select('flag_name')
      .eq('tier', tier)
      .eq('included', true);

    if (error) {
      log.warn(`Error fetching features for tier "${tier}":`, error);
      return [];
    }

    return data?.map((row: any) => row.flag_name) || [];
  } catch (error) {
    log.error(`Error getting tier features for "${tier}":`, error);
    return [];
  }
}

/**
 * Toggle a global feature flag (admin only - caller must verify)
 * @param flagName - Name of the feature flag
 * @param enabled - New enabled state
 * @param adminId - ID of admin making the change
 * @param reason - Reason for the change
 */
export async function toggleFeatureFlag(
  flagName: string,
  enabled: boolean,
  adminId: string,
  reason?: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    // Get current state before update
    const { data: current } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('flag_name', flagName)
      .single();

    // Update flag
    const { error: updateError } = await supabase
      .from('feature_flags')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('flag_name', flagName);

    if (updateError) {
      log.error(`Error updating feature flag "${flagName}":`, updateError);
      return false;
    }

    // Log the change
    await supabase.from('feature_flag_audit_log').insert({
      admin_id: adminId,
      action: 'toggle_global',
      flag_name: flagName,
      changed_from: current?.enabled,
      changed_to: enabled,
      reason: reason || null,
    });

    // Clear cache so next check gets fresh data
    clearFeatureFlagCache();

    log.info(`✅ Feature flag "${flagName}" toggled to ${enabled} by admin ${adminId}`);
    return true;
  } catch (error) {
    log.error(`Error toggling feature flag "${flagName}":`, error);
    return false;
  }
}

/**
 * Toggle a feature flag for a specific organization (admin only)
 * @param flagName - Name of the feature flag
 * @param orgId - Organization ID
 * @param enabled - New enabled state
 * @param adminId - ID of admin making the change
 * @param reason - Reason for the override
 */
export async function toggleOrgFeatureFlag(
  flagName: string,
  orgId: string,
  enabled: boolean,
  adminId: string,
  reason?: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    // Get current state before update
    const { data: current } = await supabase
      .from('organization_features')
      .select('enabled')
      .eq('org_id', orgId)
      .eq('flag_name', flagName)
      .single();

    // Upsert organization feature override
    const { error: upsertError } = await supabase
      .from('organization_features')
      .upsert({
        org_id: orgId,
        flag_name: flagName,
        enabled,
        reason: reason || null,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      log.error(
        `Error setting org feature flag "${flagName}" for org "${orgId}":`,
        upsertError
      );
      return false;
    }

    // Log the change
    await supabase.from('feature_flag_audit_log').insert({
      admin_id: adminId,
      action: 'toggle_org',
      flag_name: flagName,
      org_id: orgId,
      changed_from: current?.enabled,
      changed_to: enabled,
      reason: reason || null,
    });

    // Clear org cache
    if (orgFlagCache[orgId]) {
      delete orgFlagCache[orgId];
    }

    log.info(
      `✅ Feature flag "${flagName}" for org "${orgId}" toggled to ${enabled} by admin ${adminId}`
    );
    return true;
  } catch (error) {
    log.error(
      `Error toggling org feature flag "${flagName}" for org "${orgId}":`,
      error
    );
    return false;
  }
}

/**
 * Create a new feature flag (admin only)
 * @param flagName - Name of the feature flag
 * @param description - Description of what the flag does
 * @param category - Category for grouping (analytics, collaboration, etc.)
 * @param adminId - ID of admin creating the flag
 */
export async function createFeatureFlag(
  flagName: string,
  description: string,
  category: string,
  adminId: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('feature_flags').insert({
      flag_name: flagName,
      description,
      category,
      enabled: false, // New flags default to disabled
    });

    if (error) {
      log.error(`Error creating feature flag "${flagName}":`, error);
      return false;
    }

    // Log creation
    await supabase.from('feature_flag_audit_log').insert({
      admin_id: adminId,
      action: 'create_flag',
      flag_name: flagName,
      reason: `Created: ${description}`,
    });

    clearFeatureFlagCache();

    log.info(`✅ Feature flag "${flagName}" created by admin ${adminId}`);
    return true;
  } catch (error) {
    log.error(`Error creating feature flag "${flagName}":`, error);
    return false;
  }
}

/**
 * Get audit log for feature flags
 * @param limit - Number of recent changes to return (default 50)
 * @param flagName - Optional: filter by flag name
 */
export async function getFeatureFlagAuditLog(limit: number = 50, flagName?: string) {
  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('feature_flag_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (flagName) {
      query = query.eq('flag_name', flagName);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching audit log:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error getting audit log:', error);
    return [];
  }
}
