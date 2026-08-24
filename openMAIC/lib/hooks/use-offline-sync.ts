/**
 * React Hook: Offline Sync Status
 * Provides reactive sync status and control to components
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getSyncManager,
  SyncStatus,
  subscribeSyncStatus,
  syncNow,
  isOffline,
} from '@/lib/client/offline-sync';
import { initializeQuizDB } from '@/lib/client/quiz-indexeddb';
import { createLogger } from '@/lib/logger';

const log = createLogger('useOfflineSync');

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    (async () => {
      try {
        // Initialize IndexedDB
        await initializeQuizDB();

        // Initialize sync manager
        getSyncManager();

        setIsInitialized(true);
        log.info('Offline sync initialized');
      } catch (err) {
        log.error('Failed to initialize offline sync:', err);
      }
    })();
  }, []);

  // Subscribe to status updates
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, [isInitialized]);

  const sync = useCallback(async () => {
    try {
      await syncNow();
    } catch (err) {
      log.error('Sync failed:', err);
    }
  }, []);

  const offline = useCallback(() => isOffline(), []);

  return {
    syncStatus,
    isInitialized,
    sync,
    isOffline: offline,
  };
}

/**
 * Hook for monitoring sync progress
 */
export function useSyncProgress() {
  const { syncStatus } = useOfflineSync();

  return {
    isOnline: syncStatus?.state !== 'offline',
    isSyncing: syncStatus?.state === 'syncing',
    hasPending: (syncStatus?.pendingCount ?? 0) > 0,
    pendingCount: syncStatus?.pendingCount ?? 0,
    lastError: syncStatus?.lastError,
    lastSyncTime: syncStatus?.lastSyncTime,
  };
}
