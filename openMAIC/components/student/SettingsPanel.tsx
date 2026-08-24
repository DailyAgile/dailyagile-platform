'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import {
  useSettingsForm,
  type StudentSettings,
  type FontSize,
  type Timezone,
  type Currency,
  type Language,
} from '@/lib/hooks/useSettingsForm';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'INR', 'AUD', 'JPY', 'CAD', 'CHF'];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'ar', label: 'العربية' },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

interface SettingsPanelProps {
  initialSettings?: Partial<StudentSettings>;
  onSave?: (settings: StudentSettings) => Promise<void>;
  onClose?: () => void;
  isOpen?: boolean;
}

export function SettingsPanel({
  initialSettings = {},
  onSave,
  onClose,
  isOpen = true,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const {
    settings,
    updateSetting,
    saveSettings,
    resetSettings,
    applyAccessibilitySettings,
    isLoading,
    error,
    successMessage,
  } = useSettingsForm({
    initialSettings,
    onSave,
  });

  useEffect(() => {
    applyAccessibilitySettings();
  }, [settings.fontSize, settings.highContrast, settings.reducedMotion, applyAccessibilitySettings]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-navy-900 text-white p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('settings.title')}</h2>
          <button
            onClick={onClose}
            className="text-white hover:opacity-80 text-xl font-bold focus-visible:outline-none"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-900 text-sm">
              {successMessage}
            </div>
          )}

          {/* Profile Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <span>👤</span> {t('settings.profile')}
            </h3>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.timezone')}
              </label>
              <select
                value={settings.timezone}
                onChange={e => updateSetting('timezone', e.target.value as Timezone)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus-visible:outline-none"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.language')}
              </label>
              <select
                value={settings.language}
                onChange={e => updateSetting('language', e.target.value as Language)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus-visible:outline-none"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.currency')}
              </label>
              <select
                value={settings.currency}
                onChange={e => updateSetting('currency', e.target.value as Currency)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CURRENCIES.map(cur => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Accessibility Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <span>♿</span> {t('settings.accessibility')}
            </h3>

            {/* Read Aloud */}
            <label className="flex items-center p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.readAloud}
                onChange={e => updateSetting('readAloud', e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 focus-visible:outline-none"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900">{t('settings.readAloud')}</p>
                <p className="text-sm text-gray-600">
                  {t('settings.readAloudHelp')}
                </p>
              </div>
            </label>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('settings.fontSize')}
              </label>
              <div className="space-y-2">
                {FONT_SIZES.map(size => (
                  <label
                    key={size.value}
                    className="flex items-center p-2 rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="fontSize"
                      value={size.value}
                      checked={settings.fontSize === size.value}
                      onChange={() => updateSetting('fontSize', size.value)}
                      className="w-4 h-4 text-teal-600 focus-visible:outline-none"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {size.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                {t('settings.fontSizePreview')}
              </div>
            </div>

            {/* High Contrast */}
            <label className="flex items-center p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={e => updateSetting('highContrast', e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 focus-visible:outline-none"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900">
                  {t('settings.highContrast')}
                </p>
                <p className="text-sm text-gray-600">
                  {t('settings.highContrastHelp')}
                </p>
              </div>
            </label>

            {/* Reduced Motion */}
            <label className="flex items-center p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={e => updateSetting('reducedMotion', e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 focus-visible:outline-none"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900">
                  {t('settings.reducedMotion')}
                </p>
                <p className="text-sm text-gray-600">
                  {t('settings.reducedMotionHelp')}
                </p>
              </div>
            </label>

            {/* Extra Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.extraTime')}:{' '}
                <span className="font-bold text-teal-600">
                  {settings.extraTimePercentage}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={settings.extraTimePercentage}
                onChange={e =>
                  updateSetting('extraTimePercentage', parseInt(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus-visible:outline-none"
              />
              <p className="text-xs text-gray-600 mt-2">
                {t('settings.extraTimeHelp')}
              </p>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <span>🔒</span> {t('settings.privacy')}
            </h3>

            {/* Download Data */}
            <button className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm focus-visible:outline-none">
              📥 {t('settings.downloadData')}
            </button>

            {/* Delete Account */}
            <button className="w-full px-4 py-2 rounded-lg border border-red-300 text-red-700 font-medium hover:bg-red-50 transition-all text-sm focus-visible:outline-none">
              🗑️ {t('settings.deleteAccount')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 space-y-3">
          <button
            onClick={saveSettings}
            disabled={isLoading}
            className="w-full px-6 py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none"
          >
            {isLoading && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {t('common.save')}
          </button>
          <button
            onClick={resetSettings}
            disabled={isLoading}
            className="w-full px-6 py-3 rounded-lg font-semibold text-gray-900 bg-gray-200 hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none"
          >
            {t('common.reset')}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 rounded-lg font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50 transition-all focus-visible:outline-none"
            >
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
