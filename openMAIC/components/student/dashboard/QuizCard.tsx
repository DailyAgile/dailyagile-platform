'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { useRouter } from 'next/navigation';
import type { Quiz } from '@/lib/hooks/use-dashboard-data';

interface QuizCardProps {
  quiz: Quiz;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const { t } = useI18n();
  const router = useRouter();

  const difficultyColors = {
    Beginner: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    Intermediate: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    Advanced: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-[#0891B2] dark:hover:border-teal-500 group cursor-pointer focus-visible:outline-none"
      onClick={() => router.push(`/student/quiz/${quiz.id}`)}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          router.push(`/student/quiz/${quiz.id}`);
        }
      }}
    >
      {/* Header with badge */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base sm:text-lg font-bold text-[#1E3A5F] dark:text-white flex-1 line-clamp-2">
            {quiz.title}
          </h3>
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${difficultyColors[quiz.difficulty]}`}
            aria-label={`Difficulty: ${quiz.difficulty}`}
          >
            {quiz.difficulty}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {quiz.description}
        </p>
      </div>

      {/* Stats row */}
      <div className="px-4 sm:px-5 py-3 bg-gray-50 dark:bg-slate-700/50 grid grid-cols-2 gap-3 text-xs sm:text-sm">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.quizzes.passRate', { rate: quiz.passRate })}
          </p>
        </div>
        {quiz.yourBestScore !== undefined && (
          <div className="text-right">
            <p className="text-[#0891B2] dark:text-teal-400 font-medium">
              {t('dashboard.quizzes.yourScore', { score: quiz.yourBestScore })}
            </p>
          </div>
        )}
      </div>

      {/* Footer with button */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {quiz.questionCount} {t('quiz.questionsCount')}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/student/quiz/${quiz.id}`);
          }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus-visible:outline-none ${
            quiz.type === 'Free'
              ? 'bg-[#0891B2] hover:bg-[#0891B2]/90 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          aria-label={
            quiz.type === 'Free'
              ? t('dashboard.quizzes.takeQuiz')
              : t('dashboard.quizzes.unlockAccess')
          }
        >
          {quiz.type === 'Free' ? (
            <>
              <span>{t('dashboard.quizzes.takeQuiz')}</span>
            </>
          ) : (
            <>
              <span>🔒 {t('dashboard.quizzes.unlockAccess')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
