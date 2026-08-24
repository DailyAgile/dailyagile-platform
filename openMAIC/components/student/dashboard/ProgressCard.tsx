'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { useStudentProgress } from '@/lib/hooks/use-student-progress';

export function ProgressCard() {
  const { t } = useI18n();
  const { data, loading } = useStudentProgress();

  const stats = [
    {
      label: t('dashboard.progress.score'),
      value: data?.score ?? 0,
      unit: '%',
      icon: '📊',
    },
    {
      label: t('dashboard.progress.streak'),
      value: data?.streak ?? 0,
      unit: t('dashboard.progress.daysShort'),
      icon: '🔥',
    },
    {
      label: t('dashboard.progress.points'),
      value: data?.totalPoints ?? 0,
      unit: '🏆',
      icon: '⭐',
    },
    {
      label: t('dashboard.progress.badges'),
      value: data?.badgeCount ?? 0,
      unit: '',
      icon: '🎖️',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-transform duration-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-2xl sm:text-3xl font-bold transition-all duration-300 ${
                    loading ? 'text-gray-400 dark:text-gray-600' : 'text-[#1E3A5F] dark:text-teal-400'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {stat.unit}
                  </span>
                )}
              </div>
            </div>
            <div className="text-2xl sm:text-3xl" aria-hidden="true">
              {stat.icon}
            </div>
          </div>
          {loading && (
            <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-[#0891B2] dark:bg-teal-500 animate-pulse"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
