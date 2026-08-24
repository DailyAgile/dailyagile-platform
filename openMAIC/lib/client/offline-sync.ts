/**
 * Offline Sync Manager
 * Handles queueing, retrying, and syncing quiz submissions when offline
 * Provides real-time status updates to React components
 */

import { createLogger } from '@/lib/logger';
import {
  getPendingSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  SubmissionQueue,
} from '@/lib/client/quiz-indexeddb';

const log = createLogger('OfflineSync');

/**
 * Sync Status Types
 */
export type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  totalSynced: number;
  lastError?: string;
  lastSyncTime?: string;
}

/**
 * Sync Manager State
 */
class SyncManager {
  private syncState: SyncState = 'idle';
  private pendingCount = 0;
  private totalSynced = 0;
  private lastError?: string;
  private lastSyncTime?: string;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private retryIntervals = [1000, 5000, 30000, 2 * 60000, 5 * 60000]; // Exponential backoff
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress = false;

  constructor() {
    this.initializeNetworkListeners();
  }

  /**
   * Initialize online/offline event listeners
   */
  private initializeNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      log.info('Network restored');
      this.isOnline = true;
      this.broadcastStatus();
      // Trigger sync when coming back online
      this.syncWhenReady();
    });

    window.addEventListener('offline', () => {
      log.info('Network lost');
      this.isOnline = false;
      this.syncState = 'offline';
      this.broadcastStatus();
    });
  }

  /**
   * Get current sync status
   */
  public getStatus(): SyncStatus {
    return {
      state: this.syncState,
      pendingCount: this.pendingCount,
      totalSynced: this.totalSynced,
      lastError: this.lastError,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Subscribe to status changes
   */
  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener(this.getStatus());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Broadcast status to all listeners
   */
  private broadcastStatus(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        log.error('Error in sync status listener:', err);
      }
    });
  }

  /**
   * Update pending count
   */
  private async updatePendingCount(): Promise<void> {
    try {
      const submissions = await getPendingSubmissions();
      this.pendingCount = submissions.length;
      this.broadcastStatus();
    } catch (err) {
      log.error('Failed to update pending count:', err);
    }
  }

  /**
   * Sync when ready (debounced)
   */
  private syncWhenReady(): void {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    // Debounce: wait 1 second after coming online
    setTimeout(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.sync().catch((err) => {
          log.error('Auto-sync failed:', err);
        });
      }
    }, 1000);
  }

  /**
   * Perform sync
   */
  public async sync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      log.debug('Sync skipped: offline or already syncing');
      return;
    }

    this.syncInProgress = true;
    this.syncState = 'syncing';
    this.broadcastStatus();

    try {
      await this.updatePendingCount();

      if (this.pendingCount === 0) {
        log.info('No pending submissions to sync');
        this.syncState = 'idle';
        this.broadcastStatus();
        return;
      }

      log.info(`Syncing ${this.pendingCount} submissions...`);

      const submissions = await getPendingSubmissions();
      let successCount = 0;
      let failureCount = 0;

      for (const submission of submissions) {
        try {
          await this.syncSubmission(submission);
          successCount++;
        } catch (err) {
          failureCount++;
          log.warn(`Failed to sync submission ${submission.id}:`, err);
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this.totalSynced += successCount;

      if (failureCount === 0) {
        this.syncState = 'success';
        this.lastError = undefined;
        log.info(`Sync completed: ${successCount} synced`);
      } else {
        this.syncState = 'error';
        this.lastError = `${failureCount} submission(s) failed to sync`;
        log.warn(`Sync completed with errors: ${successCount} synced, ${failureCount} failed`);
      }
    } catch (err) {
      this.syncState = 'error';
      this.lastError = err instanceof Error ? err.message : 'Unknown error';
      log.error('Sync failed:', err);
    } finally {
      this.syncInProgress = false;
      await this.updatePendingCount();
      this.broadcastStatus();
    }
  }

  /**
   * Sync a single submission
   */
  private async syncSubmission(submission: SubmissionQueue): Promise<void> {
    const maxAttempts = this.retryIntervals.length;

    if (submission.attempts >= maxAttempts) {
      log.warn(`Max sync attempts reached for submission ${submission.id}`);
      throw new Error('Max retry attempts exceeded');
    }

    try {
      const response = await fetch('/api/quiz-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneId: submission.sceneId,
          questions: submission.questions,
          answers: submission.answers,
          studentId: submission.studentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${error.message || 'Unknown error'}`);
      }

      const result = await response.json();

      // Mark as synced
      await updateSubmissionStatus(submission.id, true);
      log.info(`Synced submission ${submission.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      // Update with error
      await updateSubmissionStatus(submission.id, false, errorMsg);

      // Determine if we should retry
      if (submission.attempts < maxAttempts) {
        const delay = this.retryIntervals[submission.attempts];
        log.info(
          `Will retry submission ${submission.id} in ${delay}ms (attempt ${submission.attempts + 1}/${maxAttempts})`
        );

        // Schedule retry
        setTimeout(() => {
          if (this.isOnline) {
            this.syncSubmission(submission).catch((retryErr) => {
              log.error('Retry failed:', retryErr);
            });
          }
        }, delay);
      } else {
        log.error(`Giving up on submission ${submission.id} after ${maxAttempts} attempts`);
        throw err;
      }
    }
  }

  /**
   * Clear a specific submission
   */
  public async clearSubmission(submissionId: string): Promise<void> {
    await deleteSubmission(submissionId);
    await this.updatePendingCount();
    this.broadcastStatus();
  }

  /**
   * Retry all failed submissions
   */
  public async retryAllFailed(): Promise<void> {
    log.info('Retrying all failed submissions...');
    await this.sync();
  }

  /**
   * Get online status
   */
  public isOffline(): boolean {
    return !this.isOnline;
  }

  /**
   * Get sync history (for debugging)
   */
  public getSyncHistory(): {
    totalSynced: number;
    lastSyncTime?: string;
    lastError?: string;
  } {
    return {
      totalSynced: this.totalSynced,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }
}

/**
 * Singleton instance
 */
let syncManager: SyncManager | null = null;

/**
 * Get sync manager instance
 */
export function getSyncManager(): SyncManager {
  if (!syncManager) {
    syncManager = new SyncManager();
  }
  return syncManager;
}

/**
 * Initialize sync manager
 */
export function initializeSyncManager(): SyncManager {
  return getSyncManager();
}

/**
 * Export functions for convenience
 */

export async function syncNow(): Promise<void> {
  await getSyncManager().sync();
}

export function getSyncStatus(): SyncStatus {
  return getSyncManager().getStatus();
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  return getSyncManager().subscribe(listener);
}

export function isOffline(): boolean {
  return getSyncManager().isOffline();
}

export async function retryFailedSubmissions(): Promise<void> {
  await getSyncManager().retryAllFailed();
}

export function getSyncHistory() {
  return getSyncManager().getSyncHistory();
}
