'use client';

import { Question } from '../QuestionRenderer';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface MultipleChoiceQuestionProps {
  question: Question;
  answer: string | null;
  onAnswerChange: (answer: string) => void;
  submitted?: boolean;
}

export function MultipleChoiceQuestion({
  question,
  answer,
  onAnswerChange,
  submitted = false,
}: MultipleChoiceQuestionProps) {
  if (!question.options) {
    return <div style={{ color: BRAND_COLORS.gray }}>No options available</div>;
  }

  return (
    <div>
      {/* Question Text */}
      <h3
        style={{
          margin: '0 0 16px 0',
          color: BRAND_COLORS.navy,
          fontSize: '18px',
          fontWeight: '600',
          lineHeight: '1.5',
        }}
      >
        {question.text}
      </h3>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {question.options.map((option) => {
          const isSelected = answer === option.id.toUpperCase();
          const isCorrect = option.id === question.correct_answer;

          return (
            <label
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '16px',
                marginBottom: '12px',
                backgroundColor: isSelected ? BRAND_COLORS.light : BRAND_COLORS.white,
                border: `2px solid ${
                  isSelected ? BRAND_COLORS.teal : BRAND_COLORS.border
                }`,
                borderRadius: '8px',
                cursor: submitted ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: submitted ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!submitted) {
                  e.currentTarget.style.borderColor = BRAND_COLORS.teal;
                  e.currentTarget.style.backgroundColor = BRAND_COLORS.light;
                }
              }}
              onMouseLeave={(e) => {
                if (!submitted) {
                  e.currentTarget.style.borderColor = isSelected
                    ? BRAND_COLORS.teal
                    : BRAND_COLORS.border;
                  e.currentTarget.style.backgroundColor = isSelected
                    ? BRAND_COLORS.light
                    : BRAND_COLORS.white;
                }
              }}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id.toUpperCase()}
                checked={isSelected}
                onChange={() => onAnswerChange(option.id.toUpperCase())}
                disabled={submitted}
                style={{
                  width: '20px',
                  height: '20px',
                  marginTop: '4px',
                  marginRight: '16px',
                  flexShrink: 0,
                  cursor: submitted ? 'not-allowed' : 'pointer',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: BRAND_COLORS.navy,
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  {option.id.toUpperCase()}.
                </div>
                <div
                  style={{
                    color: BRAND_COLORS.navy,
                    fontSize: '15px',
                    lineHeight: '1.5',
                  }}
                >
                  {option.text}
                </div>
              </div>

              {/* Correctness indicator after submission */}
              {submitted && (
                <div
                  style={{
                    marginLeft: '12px',
                    flexShrink: 0,
                    fontSize: '20px',
                  }}
                >
                  {isCorrect ? '✓' : isSelected ? '✗' : ''}
                </div>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
