'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useDashboardData } from '@/lib/hooks/use-dashboard-data';

export function LeaderboardWidget() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const { data, loading } = useDashboardData();

  const leaderboard = data?.leaderboard || [];

  return (
    <>
      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-[#1E3A5F] dark:text-white mb-4">
          {t('dashboard.leaderboard.title')}
        </h3>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  entry.isCurrentUser
                    ? 'bg-[#0891B2]/10 dark:bg-teal-500/10 border-l-2 border-[#0891B2] dark:border-teal-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="font-bold text-[#1E3A5F] dark:text-white w-6">
                  #{entry.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {entry.name}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#0891B2] dark:text-teal-400 shrink-0">
                  {entry.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.leaderboard.loading')}
          </p>
        )}

        <button
          onClick={() => setShowModal(true)}
          className="w-full mt-4 px-4 py-2 rounded-lg border border-[#0891B2] text-[#0891B2] dark:text-teal-400 text-sm font-medium hover:bg-[#0891B2]/10 transition-all"
        >
          {t('dashboard.leaderboard.toggle')}
        </button>
      </div>

      {/* Mobile Button */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowModal(true)}
          className="w-full px-4 py-3 rounded-lg bg-[#0891B2] text-white font-medium hover:bg-[#0891B2]/90 transition-all"
          aria-label={t('dashboard.leaderboard.title')}
        >
          {t('dashboard.leaderboard.toggle')}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/60 flex items-end sm:items-center justify-center"
          role="presentation"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
                {t('dashboard.leaderboard.title')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                      entry.isCurrentUser
                        ? 'bg-[#0891B2]/10 dark:bg-teal-500/10 border-l-4 border-[#0891B2] dark:border-teal-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-center font-bold text-[#1E3A5F] dark:text-white w-12">
                      #{entry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-white">
                        {entry.name}
                        {entry.isCurrentUser && (
                          <span className="ml-2 text-xs font-semibold bg-[#0891B2] text-white px-2 py-0.5 rounded">
                            {t('common.you')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0891B2] dark:text-teal-400 text-lg">
                        {entry.points.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('dashboard.progress.points')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-600 dark:text-gray-400">
                {t('dashboard.leaderboard.loading')}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
