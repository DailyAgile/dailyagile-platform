'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { BRAND_COLORS } from '@/lib/design/brand-colors';

interface SubmitButtonProps {
  onSubmit: () => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  unansweredCount?: number;
  confirmMessage?: string;
  variant?: 'primary' | 'secondary';
}

export function SubmitButton({
  onSubmit,
  disabled = false,
  isLoading = false,
  unansweredCount = 0,
  confirmMessage,
  variant = 'primary',
}: SubmitButtonProps) {
  const { t } = useI18n();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleClick = async () => {
    if (unansweredCount > 0 && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      await onSubmit();
      setShowConfirmation(false);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Submit error:', error);
    }
  };

  if (showConfirmation) {
    return (
      <div className="flex flex-col gap-3">
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE047' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#92400E' }}>
            {confirmMessage || t('quiz.confirmSubmitWithUnanswered', {
              count: unansweredCount,
            })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClick}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-all focus-visible:outline-none text-white"
              style={{
                backgroundColor: variant === 'primary' ? BRAND_COLORS.teal : '#2563EB',
                opacity: isLoading ? 0.5 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.opacity = '1')}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {t('common.submitting')}
                </span>
              ) : (
                t('common.yes')
              )}
            </button>
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-all focus-visible:outline-none"
              style={{
                backgroundColor: BRAND_COLORS.light,
                color: BRAND_COLORS.navy,
                opacity: isLoading ? 0.5 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.opacity = '1')}
            >
              {t('common.no')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 focus-visible:outline-none"
      style={{
        backgroundColor: variant === 'primary' ? BRAND_COLORS.teal : '#2563EB',
        opacity: disabled || isLoading ? 0.5 : 1,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => !disabled && !isLoading && (e.currentTarget.style.opacity = '0.9')}
      onMouseLeave={(e) => !disabled && !isLoading && (e.currentTarget.style.opacity = '1')}
      onMouseDown={(e) => !disabled && !isLoading && (e.currentTarget.style.transform = 'scale(0.95)')}
      onMouseUp={(e) => !disabled && !isLoading && (e.currentTarget.style.transform = 'scale(1)')}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          {t('common.submitting')}
        </>
      ) : (
        <>
          <span>✓</span>
          {t('quiz.submitQuiz')}
          {unansweredCount > 0 && (
            <span className="ml-1 text-sm opacity-75">
              ({unansweredCount} {t('quiz.unanswered')})
            </span>
          )}
        </>
      )}
    </button>
  );
}
