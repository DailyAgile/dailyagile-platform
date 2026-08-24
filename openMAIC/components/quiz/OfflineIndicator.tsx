/**
 * Offline Indicator Component
 * Shows network status and sync progress
 */

'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import { createLogger } from '@/lib/logger';

const log = createLogger('OfflineIndicator');

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  compact?: boolean;
  onSyncClick?: () => void;
}

export function OfflineIndicator({
  position = 'top',
  compact = false,
  onSyncClick,
}: OfflineIndicatorProps) {
  const { syncStatus, sync, isInitialized } = useOfflineSync();
  const [showDetails, setShowDetails] = useState(false);

  if (!isInitialized || !syncStatus) {
    return null;
  }

  const isOffline = syncStatus.state === 'offline';
  const isSyncing = syncStatus.state === 'syncing';
  const isError = syncStatus.state === 'error';
  const hasPending = syncStatus.pendingCount > 0;

  // Don't show if online and no pending submissions
  if (!isOffline && !hasPending && syncStatus.state === 'idle') {
    return null;
  }

  const handleSync = async () => {
    log.info('Manual sync triggered');
    await sync();
    if (onSyncClick) onSyncClick();
  };

  const positionClass =
    position === 'top'
      ? 'top-0 left-0 right-0'
      : 'bottom-0 left-0 right-0 md:bottom-4 md:left-auto md:right-4 md:max-w-sm';

  if (compact) {
    return (
      <div
        className={`fixed ${positionClass} z-40 mx-auto md:mx-0 px-4 py-2 md:px-0`}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isOffline
              ? 'bg-red-50 text-red-700 border border-red-200'
              : isError
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : hasPending
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {isOffline && <WifiOff className="h-4 w-4 flex-shrink-0" />}
          {!isOffline && hasPending && isSyncing && (
            <Zap className="h-4 w-4 flex-shrink-0 animate-pulse" />
          )}
          {!isOffline && !isSyncing && hasPending && (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {!isOffline && !hasPending && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
          {isOffline && <span>Offline — Changes saved locally</span>}
          {!isOffline && hasPending && (
            <span>
              {isSyncing ? 'Syncing...' : `${syncStatus.pendingCount} unsent answer(s)`}
            </span>
          )}
          {!isOffline && !hasPending && <span>All synced</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${positionClass} z-40 mx-auto md:mx-0 px-4 py-3 md:px-0 md:py-4 md:max-w-sm transition-all`}
    >
      <div
        className={`rounded-lg border p-4 shadow-lg transition-all ${
          isOffline
            ? 'bg-red-50 border-red-200'
            : isError
              ? 'bg-orange-50 border-orange-200'
              : hasPending
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {isOffline && <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
            {!isOffline && isSyncing && (
              <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
            )}
            {!isOffline && !isSyncing && hasPending && (
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            )}
            {!isOffline && !hasPending && (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <h3
                className={`font-semibold text-sm ${
                  isOffline
                    ? 'text-red-900'
                    : isError
                      ? 'text-orange-900'
                      : hasPending
                        ? 'text-blue-900'
                        : 'text-green-900'
                }`}
              >
                {isOffline && 'You are offline'}
                {!isOffline && isSyncing && 'Syncing your answers...'}
                {!isOffline && !isSyncing && hasPending && 'Pending answers to send'}
                {!isOffline && !hasPending && 'All answers synced'}
              </h3>

              <p
                className={`text-xs mt-1 ${
                  isOffline
                    ? 'text-red-700'
                    : isError
                      ? 'text-orange-700'
                      : hasPending
                        ? 'text-blue-700'
                        : 'text-green-700'
                }`}
              >
                {isOffline && 'Your answers are saved locally. They will sync when you are online.'}
                {!isOffline && isSyncing && `Sending ${syncStatus.pendingCount} answer(s)...`}
                {!isOffline && !isSyncing && hasPending && (
                  <>
                    {syncStatus.pendingCount} answer(s) waiting to send.
                    {isError && syncStatus.lastError && ` Error: ${syncStatus.lastError}`}
                  </>
                )}
                {!isOffline && !hasPending && 'Last sync: ' + formatTime(syncStatus.lastSyncTime)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm font-medium px-2 py-1 rounded hover:bg-black/5 transition-colors"
          >
            {showDetails ? '−' : '+'}
          </button>
        </div>

        {/* Details Section */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-10">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="opacity-75">Pending submissions:</span>
                <span className="font-semibold">{syncStatus.pendingCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="opacity-75">Total synced:</span>
                <span className="font-semibold">{syncStatus.totalSynced}</span>
              </div>

              {syncStatus.lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="opacity-75">Last sync:</span>
                  <span className="font-semibold">{formatTime(syncStatus.lastSyncTime)}</span>
                </div>
              )}

              {syncStatus.lastError && (
                <div className="mt-2 p-2 bg-red-100 rounded text-red-700 text-xs">
                  Last error: {syncStatus.lastError}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {hasPending && !isOffline && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex-1 px-3 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp?: string): string {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}
