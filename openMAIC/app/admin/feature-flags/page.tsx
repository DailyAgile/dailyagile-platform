/**
 * Admin Feature Flags Management Dashboard
 * Path: /admin/feature-flags
 *
 * Features:
 * - List all feature flags with current status
 * - Toggle flags on/off globally
 * - Toggle flags per organization
 * - View audit log of changes
 * - Search and filter flags
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createLogger } from '@/lib/logger';
import styles from './feature-flags.module.css';

const log = createLogger('FeatureFlagsAdmin');

interface FeatureFlag {
  id: string;
  flag_name: string;
  enabled: boolean;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  flag_name: string;
  org_id?: string;
  changed_from?: boolean;
  changed_to?: boolean;
  reason?: string;
  created_at: string;
}

export default function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [togglingFlagName, setTogglingFlagName] = useState<string | null>(null);

  // Fetch all feature flags
  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/feature-flags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Token should be in Authorization header from auth system
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setFlags(data.features || []);
      log.info(`Loaded ${data.total} feature flags`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load flags';
      setError(message);
      log.error('Error loading flags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch audit log for a specific flag
  const fetchAuditLog = async (flagName: string) => {
    try {
      const response = await fetch(
        `/api/admin/feature-flags/${flagName}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load audit log');
      }

      const data = await response.json();
      setAuditLog(data.auditLog || []);
      setSelectedFlag(flagName);
      setShowAuditLog(true);
    } catch (err) {
      log.error('Error loading audit log:', err);
      setError('Failed to load audit log');
    }
  };

  // Toggle a feature flag
  const handleToggleFlag = async (flagName: string, currentState: boolean) => {
    try {
      setTogglingFlagName(flagName);

      const response = await fetch(
        `/api/admin/feature-flags/${flagName}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: !currentState,
            reason: 'Toggled via admin dashboard',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle flag');
      }

      // Update local state
      setFlags(
        flags.map((flag) =>
          flag.flag_name === flagName
            ? { ...flag, enabled: !currentState }
            : flag
        )
      );

      log.info(`✅ Toggled flag "${flagName}" to ${!currentState}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle flag';
      setError(message);
      log.error('Error toggling flag:', err);
    } finally {
      setTogglingFlagName(null);
    }
  };

  // Load flags on mount
  useEffect(() => {
    fetchFlags();
  }, []);

  // Filter flags based on search and category
  const filteredFlags = flags.filter((flag) => {
    const matchesSearch =
      flag.flag_name.includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === '' || flag.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(flags.map((f) => f.category))).sort();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading feature flags...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Feature Flags Management</h1>
        <p>Control feature visibility and rollout across the platform</p>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filters}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button onClick={fetchFlags} className={styles.refreshBtn}>
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.flagsGrid}>
        <div className={styles.gridHeader}>
          <div className={styles.colName}>Flag Name</div>
          <div className={styles.colDesc}>Description</div>
          <div className={styles.colCategory}>Category</div>
          <div className={styles.colStatus}>Status</div>
          <div className={styles.colActions}>Actions</div>
        </div>

        {filteredFlags.length === 0 ? (
          <div className={styles.emptyState}>
            {flags.length === 0
              ? 'No feature flags found'
              : 'No flags match your filters'}
          </div>
        ) : (
          filteredFlags.map((flag) => (
            <div key={flag.id} className={styles.flagRow}>
              <div className={styles.colName}>
                <code className={styles.flagName}>{flag.flag_name}</code>
              </div>
              <div className={styles.colDesc}>{flag.description}</div>
              <div className={styles.colCategory}>
                <span className={styles.badge}>{flag.category}</span>
              </div>
              <div className={styles.colStatus}>
                <span
                  className={`${styles.statusBadge} ${
                    flag.enabled ? styles.enabled : styles.disabled
                  }`}
                >
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className={styles.colActions}>
                <button
                  onClick={() => handleToggleFlag(flag.flag_name, flag.enabled)}
                  disabled={togglingFlagName === flag.flag_name}
                  className={`${styles.toggleBtn} ${
                    flag.enabled ? styles.toggleOff : styles.toggleOn
                  }`}
                >
                  {togglingFlagName === flag.flag_name
                    ? 'Toggling...'
                    : flag.enabled
                      ? 'Disable'
                      : 'Enable'}
                </button>

                <button
                  onClick={() => fetchAuditLog(flag.flag_name)}
                  className={styles.auditBtn}
                >
                  History
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Audit Log Modal */}
      {showAuditLog && selectedFlag && (
        <div className={styles.auditModal}>
          <div className={styles.auditContent}>
            <div className={styles.auditHeader}>
              <h2>Audit Log: {selectedFlag}</h2>
              <button
                onClick={() => setShowAuditLog(false)}
                className={styles.closeBtn}
              >
                ×
              </button>
            </div>

            {auditLog.length === 0 ? (
              <div className={styles.emptyAudit}>No audit history</div>
            ) : (
              <div className={styles.auditList}>
                {auditLog.map((entry) => (
                  <div key={entry.id} className={styles.auditEntry}>
                    <div className={styles.auditAction}>{entry.action}</div>
                    <div className={styles.auditDetails}>
                      <div>
                        {entry.changed_from !== undefined &&
                          entry.changed_to !== undefined && (
                            <>
                              {entry.changed_from.toString()} →{' '}
                              {entry.changed_to.toString()}
                            </>
                          )}
                      </div>
                      {entry.reason && (
                        <div className={styles.auditReason}>{entry.reason}</div>
                      )}
                    </div>
                    <div className={styles.auditDate}>
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.info}>
        <h3>Feature Flags Summary</h3>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{flags.length}</div>
            <div className={styles.statLabel}>Total Flags</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>
              {flags.filter((f) => f.enabled).length}
            </div>
            <div className={styles.statLabel}>Enabled</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>
              {flags.filter((f) => !f.enabled).length}
            </div>
            <div className={styles.statLabel}>Disabled</div>
          </div>
        </div>
      </div>
    </div>
  );
}
