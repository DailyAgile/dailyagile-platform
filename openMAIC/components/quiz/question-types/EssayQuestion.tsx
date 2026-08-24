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

interface EssayQuestionProps {
  question: Question;
  answer: string | null;
  onAnswerChange: (answer: string) => void;
  submitted?: boolean;
}

export function EssayQuestion({
  question,
  answer,
  onAnswerChange,
  submitted = false,
}: EssayQuestionProps) {
  const minLength = question.minLength || 50;
  const maxLength = question.maxLength || 1000;
  const currentLength = (answer || '').length;
  const wordCount = (answer || '').trim().split(/\s+/).length;
  const isBelowMin = currentLength < minLength;
  const isAboveMax = currentLength > maxLength;
  const isNearLimit = currentLength > maxLength * 0.9;

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

      {/* Rubric */}
      {question.rubric && question.rubric.length > 0 && (
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
          }}
        >
          <p
            style={{
              margin: '0 0 8px 0',
              color: BRAND_COLORS.navy,
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            Grading Rubric:
          </p>
          <ul
            style={{
              margin: '0',
              paddingLeft: '20px',
              color: BRAND_COLORS.gray,
              fontSize: '12px',
            }}
          >
            {question.rubric.map((criterion, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                <strong>{criterion.criterion}</strong> ({criterion.weight}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Textarea */}
      <div style={{ marginBottom: '12px' }}>
        <textarea
          value={answer || ''}
          onChange={(e) => {
            if (e.target.value.length <= maxLength) {
              onAnswerChange(e.target.value);
            }
          }}
          disabled={submitted}
          placeholder="Write your essay here. Take your time to provide a comprehensive answer."
          style={{
            width: '100%',
            height: '280px',
            padding: '16px',
            fontSize: '16px',
            lineHeight: '1.6',
            border: `2px solid ${BRAND_COLORS.border}`,
            borderRadius: '6px',
            backgroundColor: BRAND_COLORS.white,
            color: BRAND_COLORS.navy,
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            opacity: submitted ? 0.7 : 1,
            transition: 'border-color 0.2s',
            resize: 'vertical',
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

      {/* Character and Word Count */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: isNearLimit || isAboveMax ? '#EA580C' : BRAND_COLORS.gray,
          marginBottom: '16px',
        }}
      >
        <div>
          {wordCount} words • {currentLength} characters
        </div>
        <div style={{ textAlign: 'right' }}>
          {isBelowMin ? (
            <span style={{ color: '#EA580C' }}>
              ⚠️ Minimum {minLength} characters required
            </span>
          ) : (
            <span>
              {currentLength}/{maxLength} characters
            </span>
          )}
        </div>
      </div>

      {/* Tips */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          border: `1px solid ${BRAND_COLORS.border}`,
          borderRadius: '6px',
          padding: '12px',
          fontSize: '13px',
          color: BRAND_COLORS.gray,
          lineHeight: '1.5',
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Tips for a strong essay:</strong>
        </p>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '4px' }}>Use complete sentences and paragraphs</li>
          <li style={{ marginBottom: '4px' }}>Support your claims with examples</li>
          <li style={{ marginBottom: '4px' }}>Proofread before submitting</li>
          <li>Aim for at least {minLength} characters</li>
        </ul>
      </div>
    </div>
  );
}
