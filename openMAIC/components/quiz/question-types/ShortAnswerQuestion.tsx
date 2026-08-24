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

interface ShortAnswerQuestionProps {
  question: Question;
  answer: string | null;
  onAnswerChange: (answer: string) => void;
  submitted?: boolean;
}

export function ShortAnswerQuestion({
  question,
  answer,
  onAnswerChange,
  submitted = false,
}: ShortAnswerQuestionProps) {
  const maxLength = question.maxLength || 100;
  const currentLength = (answer || '').length;
  const isNearLimit = currentLength > maxLength * 0.8;

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

      {/* Input Field */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={answer || ''}
          onChange={(e) => {
            if (e.target.value.length <= maxLength) {
              onAnswerChange(e.target.value);
            }
          }}
          disabled={submitted}
          placeholder="Type your answer here..."
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '16px',
            border: `2px solid ${BRAND_COLORS.border}`,
            borderRadius: '6px',
            backgroundColor: BRAND_COLORS.white,
            color: BRAND_COLORS.navy,
            boxSizing: 'border-box',
            opacity: submitted ? 0.7 : 1,
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            if (!submitted) {
              e.currentTarget.style.borderColor = BRAND_COLORS.teal;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = BRAND_COLORS.border;
          }}
        />
      </div>

      {/* Character Counter */}
      <div
        style={{
          fontSize: '13px',
          color: isNearLimit ? '#EA580C' : BRAND_COLORS.gray,
          textAlign: 'right',
          marginBottom: '16px',
        }}
      >
        {currentLength}/{maxLength} characters
      </div>

      {/* Hint */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          border: `1px solid ${BRAND_COLORS.border}`,
          borderRadius: '6px',
          padding: '12px',
          fontSize: '13px',
          color: BRAND_COLORS.gray,
          marginTop: '12px',
        }}
      >
        💡 <strong>Tip:</strong> Answer in a complete sentence. Your answer will be case-insensitive.
      </div>
    </div>
  );
}
