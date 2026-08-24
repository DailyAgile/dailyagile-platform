'use client';

/**
 * Quiz Settings Form Component
 * Configure quiz title, description, and grading settings
 * DailyAgile brand colors with light theme
 */

import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizSettingsForm');

interface QuizSettings {
  title: string;
  description?: string;
  show_answers_after_submit: boolean;
  allow_retakes: number;
  passing_score: number;
}

interface QuizSettingsFormProps {
  totalQuestions: number;
  totalPoints: number;
  onSubmit: (settings: QuizSettings) => Promise<void>;
  isLoading?: boolean;
  onBack?: () => void;
}

export function QuizSettingsForm({
  totalQuestions,
  totalPoints,
  onSubmit,
  isLoading = false,
  onBack,
}: QuizSettingsFormProps) {
  const [settings, setSettings] = useState<QuizSettings>({
    title: '',
    description: '',
    show_answers_after_submit: true,
    allow_retakes: 3,
    passing_score: 70,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settings.title.trim()) {
      newErrors.title = 'Quiz title is required';
    }

    if (settings.passing_score < 0 || settings.passing_score > 100) {
      newErrors.passing_score = 'Passing score must be between 0 and 100';
    }

    if (settings.allow_retakes < 1 || settings.allow_retakes > 10) {
      newErrors.allow_retakes = 'Retakes must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(settings);
    } catch (error) {
      log.error('Failed to create quiz:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create quiz' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F]">Configure Quiz Settings</h2>
        <p className="text-sm text-[#64748B] mt-1">
          {totalQuestions} questions • {totalPoints} points • Ready to customize
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-[#1E3A5F] mb-2">
            Quiz Title *
          </label>
          <input
            id="title"
            type="text"
            value={settings.title}
            onChange={(e) => {
              setSettings({ ...settings, title: e.target.value });
              if (errors.title) setErrors({ ...errors, title: '' });
            }}
            placeholder="e.g., Module 1: AI Fundamentals"
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              errors.title
                ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400'
                : 'border-[#E2E8F0] bg-white text-[#1E293B] placeholder-[#64748B] focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]'
            }`}
            disabled={isLoading || submitting}
          />
          {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-[#1E3A5F] mb-2">
            Quiz Description
          </label>
          <textarea
            id="description"
            value={settings.description || ''}
            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
            placeholder="Optional: Add context or instructions for students"
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] placeholder-[#64748B] focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2] transition-colors disabled:opacity-50"
            disabled={isLoading || submitting}
          />
        </div>

        {/* Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Show Answers Toggle */}
          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F0F7FA]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_answers_after_submit}
                onChange={(e) =>
                  setSettings({ ...settings, show_answers_after_submit: e.target.checked })
                }
                disabled={isLoading || submitting}
                className="w-5 h-5 rounded border-[#0891B2] text-[#0891B2] focus:ring-[#0891B2]"
              />
              <div>
                <p className="font-semibold text-[#1E3A5F]">Show Answers After Submit</p>
                <p className="text-xs text-[#64748B]">
                  Students see correct answers and explanations immediately
                </p>
              </div>
            </label>
          </div>

          {/* Retakes Field */}
          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white">
            <label htmlFor="retakes" className="block text-sm font-semibold text-[#1E3A5F] mb-2">
              Allow Retakes
            </label>
            <select
              id="retakes"
              value={settings.allow_retakes}
              onChange={(e) => {
                setSettings({ ...settings, allow_retakes: parseInt(e.target.value) });
                if (errors.allow_retakes) setErrors({ ...errors, allow_retakes: '' });
              }}
              disabled={isLoading || submitting}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                errors.allow_retakes
                  ? 'border-red-300 bg-red-50 text-red-900'
                  : 'border-[#E2E8F0] bg-white text-[#1E293B] focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]'
              }`}
            >
              {[1, 2, 3, 4, 5, 10].map((num) => (
                <option key={num} value={num}>
                  {num} attempt{num !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
            {errors.allow_retakes && (
              <p className="text-sm text-red-600 mt-1">{errors.allow_retakes}</p>
            )}
          </div>
        </div>

        {/* Passing Score Slider */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white">
          <div className="flex justify-between mb-3">
            <label htmlFor="passing" className="text-sm font-semibold text-[#1E3A5F]">
              Passing Score
            </label>
            <span className="text-lg font-bold text-[#0891B2]">{settings.passing_score}%</span>
          </div>
          <input
            id="passing"
            type="range"
            min="0"
            max="100"
            step="5"
            value={settings.passing_score}
            onChange={(e) => {
              setSettings({ ...settings, passing_score: parseInt(e.target.value) });
              if (errors.passing_score) setErrors({ ...errors, passing_score: '' });
            }}
            disabled={isLoading || submitting}
            className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0891B2] disabled:opacity-50"
          />
          <p className="text-xs text-[#64748B] mt-2">
            Students must score at least {settings.passing_score}% to pass
          </p>
          {errors.passing_score && (
            <p className="text-sm text-red-600 mt-1">{errors.passing_score}</p>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 rounded-lg border border-[#0891B2] bg-[#F0F7FA]">
          <p className="font-semibold text-[#1E3A5F] mb-2">Quiz Summary</p>
          <ul className="text-sm text-[#64748B] space-y-1">
            <li>• <span className="font-medium">{totalQuestions} questions</span>, {totalPoints} points total</li>
            <li>• Students must score <span className="font-medium">≥{settings.passing_score}%</span> to pass</li>
            <li>• <span className="font-medium">{settings.allow_retakes} attempt{settings.allow_retakes !== 1 ? 's' : ''}</span> allowed</li>
            <li>
              •{' '}
              <span className="font-medium">
                {settings.show_answers_after_submit ? 'Answers shown' : 'Answers hidden'}
              </span>{' '}
              after submission
            </li>
          </ul>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading || submitting}
              className="flex-1 px-4 py-2 border border-[#0891B2] text-[#0891B2] rounded-lg font-medium hover:bg-[#F0F7FA] disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || submitting}
            className="flex-1 px-4 py-3 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating Quiz...' : 'Create Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}
