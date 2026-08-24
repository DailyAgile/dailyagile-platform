'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';

interface SettingsFormState {
  timezone: string;
  language: string;
  currency: string;
  readAloud: boolean;
  largeFont: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const [settings, setSettings] = useState<SettingsFormState>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: locale,
    currency: 'USD',
    readAloud: false,
    largeFont: false,
    highContrast: false,
    reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/student/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Update language if changed
      if (settings.language !== locale) {
        setLocale(settings.language as any);
      }

      setMessage({ type: 'success', text: t('dashboard.settings.saved') });
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: t('dashboard.settings.error'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    try {
      const response = await fetch('/api/student/data-export', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dailyagile-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({
        type: 'error',
        text: t('dashboard.settings.error'),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 dark:bg-black/60 lg:hidden"
        onClick={onClose}
        role="presentation"
      ></div>

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-800 overflow-y-auto transition-transform duration-300 lg:relative lg:w-auto lg:inset-auto lg:bg-white dark:lg:bg-slate-800 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h2 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
              {t('dashboard.settings.title')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}
              role="status"
            >
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            {/* General Settings */}
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F] dark:text-white mb-4">
                {t('dashboard.settings.general')}
              </h3>

              <div className="space-y-4">
                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('dashboard.settings.timezone')}
                  </label>
                  <input
                    type="text"
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('dashboard.settings.language')}
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                    <option value="fr-FR">Français</option>
                    <option value="zh-CN">中文</option>
                    <option value="ar-SA">العربية</option>
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('dashboard.settings.currency')}
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Accessibility Settings */}
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F] dark:text-white mb-4">
                {t('dashboard.settings.accessibility')}
              </h3>

              <div className="space-y-3">
                {/* Read Aloud */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.readAloud}
                    onChange={(e) =>
                      setSettings({ ...settings, readAloud: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('dashboard.settings.readAloud')}
                  </span>
                </label>

                {/* Large Font */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.largeFont}
                    onChange={(e) =>
                      setSettings({ ...settings, largeFont: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('dashboard.settings.largeFont')}
                  </span>
                </label>

                {/* High Contrast */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.highContrast}
                    onChange={(e) =>
                      setSettings({ ...settings, highContrast: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('dashboard.settings.highContrast')}
                  </span>
                </label>

                {/* Reduced Motion */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) =>
                      setSettings({ ...settings, reducedMotion: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('dashboard.settings.reducedMotion')}
                  </span>
                </label>
              </div>
            </div>

            {/* Privacy & Data */}
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F] dark:text-white mb-4">
                {t('dashboard.settings.privacy')}
              </h3>

              <button
                onClick={handleDataExport}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-sm"
              >
                📥 {t('dashboard.settings.dataExport')}
              </button>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {t('dashboard.settings.dataExportDesc')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 lg:hidden">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                {t('dashboard.settings.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg bg-[#0891B2] text-white font-medium hover:bg-[#0891B2]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? t('common.loading') : t('dashboard.settings.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
