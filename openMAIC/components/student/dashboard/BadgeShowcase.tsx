'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useDashboardData } from '@/lib/hooks/use-dashboard-data';

export function BadgeShowcase() {
  const { t } = useI18n();
  const { data, loading } = useDashboardData();
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const badges = data?.badges || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-[#1E3A5F] dark:text-white mb-1">
          {t('dashboard.badges.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {loading ? t('common.loading') : t('dashboard.badges.earned', { count: badges.length })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg"
            ></div>
          ))}
        </div>
      ) : badges.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {badges.map((badge) => (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(selectedBadge === badge.id ? null : badge.id)}
                className="aspect-square bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all hover:border-[#0891B2] dark:hover:border-teal-400 hover:shadow-lg group cursor-pointer"
                aria-pressed={selectedBadge === badge.id}
                aria-label={badge.name}
              >
                <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">
                  {badge.icon}
                </span>
                <span className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 line-clamp-2">
                  {badge.name}
                </span>
              </button>
            ))}
          </div>

          {/* Badge Details Modal */}
          {selectedBadge && (
            <div
              className="bg-gradient-to-br from-[#F0F7FA] to-white dark:from-slate-700 dark:to-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 sm:p-6"
              role="region"
              aria-live="polite"
            >
              {(() => {
                const badge = badges.find((b) => b.id === selectedBadge);
                return badge ? (
                  <div className="text-center sm:text-left">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-4xl sm:text-5xl shrink-0">{badge.icon}</span>
                      <div className="flex-1">
                        <h4 className="text-lg sm:text-xl font-bold text-[#1E3A5F] dark:text-white mb-1">
                          {badge.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {t('dashboard.badges.earnedOn', { date: badge.earnedAt })}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t('dashboard.badges.requirements')}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {badge.requirements}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <p className="text-2xl mb-2">🎖️</p>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.badges.noBadges')}
          </p>
        </div>
      )}
    </div>
  );
}
