'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { BRAND_COLORS } from '@/lib/design/brand-colors';

interface QuestionMapProps {
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredQuestions: Set<number>;
  flaggedQuestions: Set<number>;
  onSelectQuestion: (index: number) => void;
  disabled?: boolean;
}

export function QuestionMap({
  totalQuestions,
  currentQuestionIndex,
  answeredQuestions,
  flaggedQuestions,
  onSelectQuestion,
  disabled = false,
}: QuestionMapProps) {
  const { t } = useI18n();

  const flaggedCount = flaggedQuestions.size;
  const answeredCount = answeredQuestions.size;

  return (
    <div className="rounded-lg border p-4 md:p-6" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-xs mb-1" style={{ color: BRAND_COLORS.gray }}>{t('quiz.answered')}</p>
          <p className="text-2xl font-bold" style={{ color: BRAND_COLORS.teal }}>
            {answeredCount}
            <span className="text-sm" style={{ color: '#6B7280' }}>/{totalQuestions}</span>
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: BRAND_COLORS.gray }}>{t('quiz.flagged')}</p>
          <p className="text-2xl font-bold" style={{ color: BRAND_COLORS.orange }}>
            {flaggedCount}
            {flaggedCount > 0 && <span className="text-sm">🚩</span>}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: BRAND_COLORS.gray }}>{t('quiz.progress')}</p>
          <p className="text-2xl font-bold" style={{ color: BRAND_COLORS.navy }}>
            {Math.round((answeredCount / totalQuestions) * 100)}%
          </p>
        </div>
      </div>

      {/* Question Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: BRAND_COLORS.navy }}>
          {t('quiz.questionMap')}
        </h3>
        <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
          {Array.from({ length: totalQuestions }).map((_, index) => {
            const isCurrentQuestion = index === currentQuestionIndex;
            const isAnswered = answeredQuestions.has(index);
            const isFlagged = flaggedQuestions.has(index);

            return (
              <button
                key={index}
                onClick={() => onSelectQuestion(index)}
                disabled={disabled}
                className="w-full aspect-square rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center relative focus-visible:outline-none"
                style={{
                  backgroundColor: isAnswered ? BRAND_COLORS.teal : '#F3F4F6',
                  color: isAnswered ? BRAND_COLORS.white : '#374151',
                  border: isCurrentQuestion ? `2px solid ${BRAND_COLORS.teal}` : '2px solid transparent',
                  outline: isCurrentQuestion ? `2px solid ${BRAND_COLORS.teal}` : 'none',
                  outlineOffset: isCurrentQuestion ? '2px' : '0',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = isAnswered ? '#0891B2' : '#E5E7EB')}
                onMouseLeave={(e) => !disabled && (e.currentTarget.style.backgroundColor = isAnswered ? BRAND_COLORS.teal : '#F3F4F6')}
                aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
                aria-current={isCurrentQuestion ? 'step' : undefined}
              >
                <span>{index + 1}</span>
                {isFlagged && (
                  <span
                    className="absolute top-0 right-0 text-xs"
                    title={t('quiz.flagged')}
                  >
                    🚩
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 space-y-2" style={{ borderTopColor: BRAND_COLORS.gray, borderTopWidth: '1px' }}>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: BRAND_COLORS.teal }}></div>
          <span style={{ color: '#374151' }}>{t('quiz.answered')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', borderWidth: '1px' }}></div>
          <span style={{ color: '#374151' }}>{t('quiz.notAnswered')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
            <span className="text-xs">🚩</span>
          </div>
          <span style={{ color: '#374151' }}>{t('quiz.flaggedForReview')}</span>
        </div>
      </div>
    </div>
  );
}
