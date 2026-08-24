'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ProgressCard } from '@/components/student/dashboard/ProgressCard';
import { RecommendationCard } from '@/components/student/dashboard/RecommendationCard';
import { QuizBrowser } from '@/components/student/dashboard/QuizBrowser';
import { LeaderboardWidget } from '@/components/student/dashboard/LeaderboardWidget';
import { BadgeShowcase } from '@/components/student/dashboard/BadgeShowcase';
import { SettingsPanel } from '@/components/student/dashboard/SettingsPanel';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent layout shift
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <span className="text-xl sm:text-2xl font-bold text-[#1E3A5F] dark:text-white">
                  DailyAgile
                </span>
                <span className="hidden sm:inline text-xs text-gray-600 dark:text-gray-400">
                  {t('home.slogan')}
                </span>
              </button>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label={t('dashboard.settings.title')}
                title={t('dashboard.settings.title')}
              >
                <span className="text-xl">⚙️</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-medium text-gray-800 dark:text-white"
              >
                ⚙️ {t('dashboard.settings.title')}
              </button>
              <button
                onClick={() => {
                  router.push('/');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-medium text-gray-800 dark:text-white"
              >
                🏠 {t('dashboard.menu.dashboard')}
              </button>
              <button
                onClick={() => {
                  // Handle logout
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-red-600 dark:text-red-400"
              >
                🚪 {t('dashboard.menu.logout')}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] dark:text-white mb-2">
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Desktop Layout: Sidebar + Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Left Column - Progress & Recommendation (Desktop: 1/4, Mobile: Full) */}
          <div className="lg:col-span-1 space-y-6 sm:space-y-8">
            {/* Progress Stats */}
            <div>
              <h2 className="text-lg font-bold text-[#1E3A5F] dark:text-white mb-4">
                {t('dashboard.progress.title')}
              </h2>
              <ProgressCard />
            </div>

            {/* Recommendation Card */}
            <RecommendationCard />

            {/* Leaderboard - Desktop Only */}
            <div className="hidden lg:block">
              <LeaderboardWidget />
            </div>
          </div>

          {/* Right Column - Quizzes & Badges (Desktop: 3/4, Mobile: Full) */}
          <div className="lg:col-span-3 space-y-8 sm:space-y-12">
            {/* Quiz Browser */}
            <QuizBrowser />

            {/* Leaderboard - Mobile */}
            <div className="lg:hidden">
              <LeaderboardWidget />
            </div>

            {/* Badges */}
            <BadgeShowcase />
          </div>
        </div>
      </main>

      {/* Settings Drawer */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 lg:static lg:z-auto">
          <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      )}

      {/* Accessibility: Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 bg-[#0891B2] text-white px-4 py-2"
      >
        Skip to main content
      </a>
    </div>
  );
}
