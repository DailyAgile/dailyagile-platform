'use client';

import { useState, useCallback } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useDashboardData } from '@/lib/hooks/use-dashboard-data';
import { QuizCard } from './QuizCard';

export function QuizBrowser() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: 'all',
    type: 'all',
    industry: 'all',
  });

  // Debounce search
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const { data, loading } = useDashboardData(page, 20);

  const quizzes = data?.quizzes || [];
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      search === '' ||
      quiz.title.toLowerCase().includes(search.toLowerCase()) ||
      quiz.description.toLowerCase().includes(search.toLowerCase());

    const matchesDifficulty =
      filters.difficulty === 'all' || quiz.difficulty === filters.difficulty;
    const matchesType = filters.type === 'all' || quiz.type === filters.type;
    const matchesIndustry =
      filters.industry === 'all' || quiz.industry === filters.industry;

    return matchesSearch && matchesDifficulty && matchesType && matchesIndustry;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] dark:text-white mb-2">
          {t('dashboard.quizzes.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.totalQuizzes || 0} {t('quiz.questionsCount')} available
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="search"
            placeholder={t('dashboard.quizzes.search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 sm:py-4 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent transition-all"
            aria-label={t('dashboard.quizzes.search')}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white font-medium transition-all hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center justify-between"
            aria-label={t('dashboard.quizzes.filter')}
            aria-expanded={showFilters}
          >
            <span>{t('dashboard.quizzes.filter')}</span>
            <span>{showFilters ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Filters - Mobile Drawer / Desktop Visible */}
        <div
          className={`space-y-3 md:space-y-4 md:block ${showFilters ? 'block' : 'hidden'} md:!block`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Difficulty Filter */}
            <div>
              <label
                htmlFor="difficulty-filter"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('dashboard.quizzes.difficulty')}
              </label>
              <select
                id="difficulty-filter"
                value={filters.difficulty}
                onChange={(e) => {
                  setFilters({ ...filters, difficulty: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              >
                <option value="all">{t('dashboard.quizzes.allDifficulties')}</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label
                htmlFor="type-filter"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('dashboard.quizzes.type')}
              </label>
              <select
                id="type-filter"
                value={filters.type}
                onChange={(e) => {
                  setFilters({ ...filters, type: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              >
                <option value="all">{t('dashboard.quizzes.allTypes')}</option>
                <option value="Free">{t('dashboard.quizzes.free')}</option>
                <option value="Premium">{t('dashboard.quizzes.premium')}</option>
              </select>
            </div>

            {/* Industry Filter */}
            <div>
              <label
                htmlFor="industry-filter"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('dashboard.quizzes.industry')}
              </label>
              <select
                id="industry-filter"
                value={filters.industry}
                onChange={(e) => {
                  setFilters({ ...filters, industry: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              >
                <option value="all">{t('dashboard.quizzes.allIndustries')}</option>
                <option value="Technology">Technology</option>
                <option value="AI">AI</option>
                <option value="Business">Business</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-lg h-64 animate-pulse"
            >
              <div className="h-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {t('dashboard.quizzes.noQuizzes')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('dashboard.quizzes.noQuizzesHint')}
          </p>
        </div>
      )}

      {/* Load More Button */}
      {data && filteredQuizzes.length < data.totalQuizzes && (
        <div className="flex justify-center pt-6">
          <button
            onClick={() => setPage(page + 1)}
            disabled={loading}
            className="px-6 py-3 rounded-lg border border-[#0891B2] text-[#0891B2] dark:text-teal-400 font-semibold hover:bg-[#0891B2]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('dashboard.quizzes.loadMore')}
          >
            {loading ? t('common.loading') : t('dashboard.quizzes.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
