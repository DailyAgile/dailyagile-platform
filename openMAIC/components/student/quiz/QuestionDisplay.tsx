'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { BRAND_COLORS } from '@/lib/design/brand-colors';

interface Question {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  text: string;
  description?: string;
  options?: {
    id: string;
    label: string;
    text: string;
  }[];
}

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswers: string | string[];
  onAnswerChange: (answer: string | string[]) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  feedback?: {
    isCorrect: boolean;
    explanation: string;
  };
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswers,
  onAnswerChange,
  disabled = false,
  showFeedback = false,
  feedback,
}: QuestionDisplayProps) {
  const { t } = useI18n();

  const handleSingleSelect = (optionId: string) => {
    onAnswerChange(optionId);
  };

  const handleMultipleSelect = (optionId: string) => {
    const current = Array.isArray(selectedAnswers) ? selectedAnswers : [];
    const updated = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    onAnswerChange(updated);
  };

  const handleShortAnswerChange = (text: string) => {
    onAnswerChange(text);
  };

  return (
    <div className="w-full">
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: BRAND_COLORS.gray }}>
            {t('quiz.question')} {questionNumber} {t('common.of')} {totalQuestions}
          </span>
          {question.type === 'multiple' && (
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
              {t('quiz.multipleAnswers')}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full rounded-full h-2" style={{ backgroundColor: '#E5E7EB' }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(questionNumber / totalQuestions) * 100}%`,
              backgroundColor: BRAND_COLORS.teal,
            }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="rounded-lg border p-6 md:p-8 mb-6" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
        <h2 className="text-lg md:text-xl font-bold mb-2" style={{ color: BRAND_COLORS.navy }}>
          {question.text}
        </h2>
        {question.description && (
          <p className="text-sm md:text-base mb-6" style={{ color: BRAND_COLORS.gray }}>
            {question.description}
          </p>
        )}

        {/* Answer Options - Single Select */}
        {question.type === 'single' && question.options && (
          <div className="space-y-3">
            {question.options.map(option => (
              <label
                key={option.id}
                className="flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all"
                style={{
                  borderColor: selectedAnswers === option.id ? BRAND_COLORS.teal : BRAND_COLORS.gray,
                  backgroundColor: selectedAnswers === option.id ? '#E0F2FE' : BRAND_COLORS.white,
                  opacity: disabled ? 0.6 : 1,
                  pointerEvents: disabled ? 'none' : 'auto',
                }}
              >
                <input
                  type="radio"
                  name="question-option"
                  value={option.id}
                  checked={selectedAnswers === option.id}
                  onChange={() => handleSingleSelect(option.id)}
                  disabled={disabled}
                  className="mt-1 w-5 h-5 cursor-pointer focus-visible:outline-none"
                  aria-label={option.text}
                />
                <div className="ml-4 flex-1">
                  <div className="font-medium" style={{ color: BRAND_COLORS.navy }}>{option.label}</div>
                  <div className="text-sm mt-1" style={{ color: '#374151' }}>{option.text}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Answer Options - Multiple Select */}
        {question.type === 'multiple' && question.options && (
          <div className="space-y-3">
            {question.options.map(option => {
              const currentAnswers = Array.isArray(selectedAnswers) ? selectedAnswers : [];
              return (
                <label
                  key={option.id}
                  className="flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: currentAnswers.includes(option.id) ? BRAND_COLORS.teal : BRAND_COLORS.gray,
                    backgroundColor: currentAnswers.includes(option.id) ? '#E0F2FE' : BRAND_COLORS.white,
                    opacity: disabled ? 0.6 : 1,
                    pointerEvents: disabled ? 'none' : 'auto',
                  }}
                >
                  <input
                    type="checkbox"
                    value={option.id}
                    checked={currentAnswers.includes(option.id)}
                    onChange={() => handleMultipleSelect(option.id)}
                    disabled={disabled}
                    className="mt-1 w-5 h-5 cursor-pointer focus-visible:outline-none"
                    aria-label={option.text}
                  />
                  <div className="ml-4 flex-1">
                    <div className="font-medium" style={{ color: BRAND_COLORS.navy }}>{option.label}</div>
                    <div className="text-sm mt-1" style={{ color: '#374151' }}>{option.text}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Short Answer Input */}
        {question.type === 'short_answer' && (
          <textarea
            value={typeof selectedAnswers === 'string' ? selectedAnswers : ''}
            onChange={e => handleShortAnswerChange(e.target.value)}
            disabled={disabled}
            placeholder={t('quiz.enterYourAnswer')}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border-2 focus-visible:outline-none resize-none"
            style={{
              borderColor: BRAND_COLORS.gray,
              backgroundColor: disabled ? BRAND_COLORS.light : BRAND_COLORS.white,
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => !disabled && (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
            onBlur={(e) => !disabled && (e.currentTarget.style.borderColor = BRAND_COLORS.gray)}
            aria-label={t('quiz.answerField')}
          />
        )}

        {/* Feedback Section */}
        {showFeedback && feedback && (
          <div
            className={`mt-6 p-4 rounded-lg border-l-4 ${
              feedback.isCorrect
                ? 'bg-green-50 border-green-500 text-green-900'
                : 'bg-red-50 border-red-500 text-red-900'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start">
              <span className="text-xl mr-3">
                {feedback.isCorrect ? '✓' : '✗'}
              </span>
              <div className="flex-1">
                <p className="font-semibold mb-1">
                  {feedback.isCorrect
                    ? t('quiz.correct')
                    : t('quiz.incorrect')}
                </p>
                <p className="text-sm">{feedback.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
