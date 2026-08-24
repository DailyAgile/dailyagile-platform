'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { useDashboardData } from '@/lib/hooks/use-dashboard-data';
import { useRouter } from 'next/navigation';

export function RecommendationCard() {
  const { t } = useI18n();
  const { data, loading } = useDashboardData();
  const router = useRouter();

  const recommendation = data?.recommendation;

  if (!recommendation && !loading) {
    return null;
  }

  const getReasonLabel = () => {
    switch (recommendation?.reason) {
      case 'spaced_repetition':
        return t('dashboard.recommendation.reason.spacedRepetition');
      case 'weak_area':
        return t('dashboard.recommendation.reason.weakArea');
      default:
        return t('dashboard.recommendation.reason.nextInLine');
    }
  };

  const getDaysText = () => {
    if (!recommendation) return '';
    if (recommendation.daysUntilNext === 0) {
      return t('dashboard.recommendation.recommended');
    }
    return t('dashboard.recommendation.nextIn', {
      days: recommendation.daysUntilNext,
    });
  };

  return (
    <div className="bg-gradient-to-br from-[#0891B2] to-[#1E3A5F] dark:from-teal-600 dark:to-blue-900 rounded-lg p-5 sm:p-6 text-white shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium opacity-90 mb-1">
            {t('dashboard.recommendation.title')}
          </h3>
          {recommendation && (
            <p className="text-xs opacity-75">{getReasonLabel()}</p>
          )}
        </div>
        <div className="text-3xl" aria-hidden="true">
          🎯
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-5 bg-white/20 rounded w-3/4"></div>
          <div className="h-4 bg-white/20 rounded w-1/2"></div>
        </div>
      ) : recommendation ? (
        <>
          <h2 className="text-lg sm:text-xl font-bold mb-2 leading-tight">
            {recommendation.quizTitle}
          </h2>
          <p className="text-xs sm:text-sm opacity-90 mb-4">{getDaysText()}</p>
          <button
            onClick={() => router.push(`/student/quiz/${recommendation.quizId}`)}
            className="w-full bg-white text-[#1E3A5F] font-semibold py-3 sm:py-4 px-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0891B2]"
            aria-label={t('dashboard.recommendation.startQuiz')}
          >
            {t('dashboard.recommendation.startQuiz')}
          </button>
        </>
      ) : (
        <p className="text-sm opacity-90">{t('common.loading')}</p>
      )}
    </div>
  );
}
