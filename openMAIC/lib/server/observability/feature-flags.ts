/**
 * FeatureFlagManager - Feature flags for gradual rollout and A/B testing
 *
 * Flags:
 * - WEBHOOK_PROCESSING_ENABLED: Kill switch for webhook processing
 * - WEBHOOK_AUDIT_LOGGING_ENABLED: Toggle audit log persistence
 * - EMAIL_NOTIFICATIONS_ENABLED: Toggle email notifications
 * - METRICS_COLLECTION_ENABLED: Toggle metrics collection
 * - STRUCTURED_LOGGING_ENABLED: Toggle structured logging (vs console.log)
 * - DISTRIBUTED_TRACING_ENABLED: Toggle Datadog/Jaeger tracing
 * - STUDENT_ENROLLMENT_ENABLED: Toggle student enrollment feature
 * - BILLING_PROCESSING_ENABLED: Toggle billing record insertion
 *
 * Sources (in order of precedence):
 * 1. Environment variables (FEATURE_FLAG_*)
 * 2. Supabase feature_flags table (dynamic, no restart needed)
 * 3. Default values (hardcoded)
 *
 * Usage:
 * const flags = new FeatureFlagManager(supabaseClient);
 * if (await flags.isEnabled('WEBHOOK_PROCESSING_ENABLED')) {
 *   // Process webhook
 * }
 *
 * Time Complexity:
 * - First call: O(n) where n = number of flags (reads from Supabase)
 * - Cached: O(1)
 * - Cache TTL: 5 minutes (configurable)
 */

interface FeatureFlagConfig {
  name: string;
  enabled: boolean;
  description: string;
  rollout_percentage?: number; // 0-100, for gradual rollout
  owner?: string;
  created_at?: string;
  updated_at?: string;
}

export class FeatureFlagManager {
  private flags: Map<string, FeatureFlagConfig> = new Map();
  private cacheTime: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes
  private supabaseClient?: any;

  private defaults: { [key: string]: FeatureFlagConfig } = {
    WEBHOOK_PROCESSING_ENABLED: {
      name: 'WEBHOOK_PROCESSING_ENABLED',
      enabled: true,
      description: 'Master kill switch for webhook processing',
      rollout_percentage: 100,
    },
    WEBHOOK_AUDIT_LOGGING_ENABLED: {
      name: 'WEBHOOK_AUDIT_LOGGING_ENABLED',
      enabled: true,
      description: 'Enable/disable audit log persistence for compliance',
      rollout_percentage: 100,
    },
    EMAIL_NOTIFICATIONS_ENABLED: {
      name: 'EMAIL_NOTIFICATIONS_ENABLED',
      enabled: true,
      description: 'Send confirmation emails to students',
      rollout_percentage: 100,
    },
    METRICS_COLLECTION_ENABLED: {
      name: 'METRICS_COLLECTION_ENABLED',
      enabled: true,
      description: 'Collect Prometheus metrics',
      rollout_percentage: 100,
    },
    STRUCTURED_LOGGING_ENABLED: {
      name: 'STRUCTURED_LOGGING_ENABLED',
      enabled: true,
      description: 'Use structured JSON logging (vs console.log)',
      rollout_percentage: 100,
    },
    DISTRIBUTED_TRACING_ENABLED: {
      name: 'DISTRIBUTED_TRACING_ENABLED',
      enabled: false,
      description: 'Enable Datadog/Jaeger distributed tracing',
      rollout_percentage: 0,
    },
    STUDENT_ENROLLMENT_ENABLED: {
      name: 'STUDENT_ENROLLMENT_ENABLED',
      enabled: true,
      description: 'Process student enrollment from webhooks',
      rollout_percentage: 100,
    },
    BILLING_PROCESSING_ENABLED: {
      name: 'BILLING_PROCESSING_ENABLED',
      enabled: true,
      description: 'Record billing transactions',
      rollout_percentage: 100,
    },
  };

  constructor(supabaseClient?: any, cacheTTL?: number) {
    this.supabaseClient = supabaseClient;
    if (cacheTTL) {
      this.cacheTTL = cacheTTL;
    }
    this.loadFromEnvironment();
  }

  /**
   * Load flags from environment variables (FEATURE_FLAG_* format)
   * Example: FEATURE_FLAG_WEBHOOK_PROCESSING_ENABLED=false
   */
  private loadFromEnvironment(): void {
    for (const [envKey, envValue] of Object.entries(process.env)) {
      if (envKey.startsWith('FEATURE_FLAG_')) {
        const flagName = envKey.replace('FEATURE_FLAG_', '');
        const isEnabled = envValue === 'true' || envValue === '1';

        if (this.flags.has(flagName)) {
          const flag = this.flags.get(flagName)!;
          flag.enabled = isEnabled;
        } else {
          this.flags.set(flagName, {
            name: flagName,
            enabled: isEnabled,
            description: 'Loaded from environment variable',
          });
        }
      }
    }
  }

  /**
   * Refresh flags from Supabase (dynamic feature flags)
   * Cache for 5 minutes to avoid excessive queries
   */
  private async refreshFromSupabase(): Promise<void> {
    if (!this.supabaseClient) {
      return;
    }

    const now = Date.now();
    if (now - this.cacheTime < this.cacheTTL) {
      return; // Cache still fresh
    }

    try {
      const { data, error } = await this.supabaseClient.from('feature_flags').select('*');

      if (error) {
        console.error('Failed to fetch feature flags from Supabase:', error);
        return;
      }

      // Merge Supabase flags with defaults and env vars
      for (const flag of data || []) {
        this.flags.set(flag.name, {
          name: flag.name,
          enabled: flag.enabled,
          description: flag.description,
          rollout_percentage: flag.rollout_percentage,
          updated_at: flag.updated_at,
        });
      }

      this.cacheTime = now;
    } catch (err) {
      console.error('Exception while refreshing feature flags:', err);
    }
  }

  /**
   * Check if a feature is enabled
   * Supports gradual rollout via rollout_percentage
   *
   * Rollout logic:
   * - 0-50: 50% of users
   * - 51-100: Increasing percentage
   * - 100: All users
   */
  public async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    // Load defaults if not already loaded
    if (this.flags.size === 0) {
      for (const [key, config] of Object.entries(this.defaults)) {
        this.flags.set(key, config);
      }
    }

    // Try to refresh from Supabase (respects cache TTL)
    await this.refreshFromSupabase();

    const flag = this.flags.get(flagName) || this.defaults[flagName];
    if (!flag) {
      return false; // Unknown flag defaults to false (fail-safe)
    }

    if (!flag.enabled) {
      return false;
    }

    // If no rollout percentage specified, it's enabled for everyone
    if (flag.rollout_percentage === undefined || flag.rollout_percentage === 100) {
      return true;
    }

    // Gradual rollout: use userId to create consistent hash
    if (userId && flag.rollout_percentage < 100) {
      const hash = this.hashUserId(userId);
      return hash % 100 < flag.rollout_percentage;
    }

    return flag.rollout_percentage === 100;
  }

  /**
   * Hash userId for consistent rollout across requests
   * Ensures same user always gets same flag value
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all flags (for admin dashboard)
   */
  public async getAll(): Promise<{ [key: string]: FeatureFlagConfig }> {
    await this.refreshFromSupabase();

    const result: { [key: string]: FeatureFlagConfig } = {};
    for (const [key, config] of this.flags.entries()) {
      result[key] = config;
    }

    // Add defaults for flags not yet fetched
    for (const [key, config] of Object.entries(this.defaults)) {
      if (!result[key]) {
        result[key] = config;
      }
    }

    return result;
  }

  /**
   * Enable a feature (updates both in-memory and Supabase)
   */
  public async enable(flagName: string): Promise<void> {
    await this.updateFlag(flagName, true, 100);
  }

  /**
   * Disable a feature
   */
  public async disable(flagName: string): Promise<void> {
    await this.updateFlag(flagName, false, 0);
  }

  /**
   * Set rollout percentage for gradual rollout
   */
  public async setRolloutPercentage(flagName: string, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    await this.updateFlag(flagName, percentage > 0, percentage);
  }

  /**
   * Update flag in Supabase and local cache
   */
  private async updateFlag(flagName: string, enabled: boolean, rolloutPercentage: number): Promise<void> {
    // Update local cache
    const flag = this.flags.get(flagName) || { ...this.defaults[flagName] };
    if (!flag) {
      throw new Error(`Unknown feature flag: ${flagName}`);
    }

    flag.enabled = enabled;
    flag.rollout_percentage = rolloutPercentage;
    flag.updated_at = new Date().toISOString();

    this.flags.set(flagName, flag);

    // Update in Supabase
    if (this.supabaseClient) {
      const { error } = await this.supabaseClient.from('feature_flags').upsert({
        name: flagName,
        enabled,
        rollout_percentage: rolloutPercentage,
        description: flag.description,
        updated_at: flag.updated_at,
      });

      if (error) {
        console.error(`Failed to update feature flag ${flagName}:`, error);
        throw error;
      }
    }

    // Reset cache to force refresh on next read
    this.cacheTime = 0;
  }

  /**
   * Reset all flags to defaults
   */
  public async resetToDefaults(): Promise<void> {
    this.flags.clear();
    for (const [key, config] of Object.entries(this.defaults)) {
      this.flags.set(key, { ...config });
    }
    this.cacheTime = 0;
  }

  /**
   * Clear cache to force refresh from Supabase
   */
  public clearCache(): void {
    this.cacheTime = 0;
  }
}

// Global singleton instance
let globalFlagsInstance: FeatureFlagManager | null = null;

export function getGlobalFeatureFlagManager(supabaseClient?: any): FeatureFlagManager {
  if (!globalFlagsInstance) {
    globalFlagsInstance = new FeatureFlagManager(supabaseClient);
  }
  return globalFlagsInstance;
}
