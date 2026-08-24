'use client';

import { useState, useCallback } from 'react';

export type FontSize = 'small' | 'medium' | 'large';
export type Timezone = string; // IANA timezone
export type Currency = 'USD' | 'GBP' | 'EUR' | 'INR' | 'AUD' | 'JPY' | 'CAD' | 'CHF';
export type Language = 'en' | 'es' | 'fr' | 'zh' | 'ar' | 'de' | 'pt' | 'ja' | 'ko';

export interface StudentSettings {
  timezone: Timezone;
  language: Language;
  currency: Currency;
  readAloud: boolean;
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
  extraTimePercentage: number; // 0-100
}

interface UseSettingsFormProps {
  initialSettings: Partial<StudentSettings>;
  onSave?: (settings: StudentSettings) => Promise<void>;
}

export function useSettingsForm({
  initialSettings,
  onSave,
}: UseSettingsFormProps) {
  const [settings, setSettings] = useState<StudentSettings>({
    timezone: 'UTC',
    language: 'en',
    currency: 'USD',
    readAloud: false,
    fontSize: 'medium',
    highContrast: false,
    reducedMotion: false,
    extraTimePercentage: 0,
    ...initialSettings,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateSetting = useCallback(
    <K extends keyof StudentSettings>(key: K, value: StudentSettings[K]) => {
      setSettings(prev => ({
        ...prev,
        [key]: value,
      }));
      setError(null);
    },
    []
  );

  const saveSettings = useCallback(async () => {
    if (!onSave) return;

    try {
      setIsLoading(true);
      setError(null);
      await onSave(settings);
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [settings, onSave]);

  const resetSettings = useCallback(() => {
    setSettings({
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      readAloud: false,
      fontSize: 'medium',
      highContrast: false,
      reducedMotion: false,
      extraTimePercentage: 0,
      ...initialSettings,
    });
    setError(null);
  }, [initialSettings]);

  // Apply accessibility settings to DOM
  const applyAccessibilitySettings = useCallback(() => {
    const root = document.documentElement;

    // Font size
    if (settings.fontSize === 'small') {
      root.style.fontSize = '14px';
    } else if (settings.fontSize === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [settings.fontSize, settings.highContrast, settings.reducedMotion]);

  return {
    settings,
    updateSetting,
    saveSettings,
    resetSettings,
    applyAccessibilitySettings,
    isLoading,
    error,
    successMessage,
  };
}
