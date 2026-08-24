'use client';

/**
 * Quiz Preview Card - Enhanced quiz information display with hover preview
 * Shows quiz details before starting
 */

import { useState } from 'react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#16A34A',
};

export interface QuizPreviewData {
  id: string;
  title: string;
  description?: string;
  questionCount: number;
  totalPoints: number;
  timeLimit?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  attemptsRemaining?: number;
  attemptsTotal?: number;
  passScore?: number;
  tags?: string[];
}

interface QuizPreviewCardProps {
  quiz: QuizPreviewData;
  onStartQuiz?: (quizId: string) => void;
}

export function QuizPreviewCard({ quiz, onStartQuiz }: QuizPreviewCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  const difficultyColor =
    quiz.difficulty === 'beginner'
      ? BRAND_COLORS.success
      : quiz.difficulty === 'intermediate'
        ? BRAND_COLORS.orange
        : '#DC2626';

  const estimatedTime = quiz.timeLimit ? Math.ceil(quiz.timeLimit / 60) : 'Untimed';

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
      }}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* Main Card */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.white,
          border: `1px solid ${BRAND_COLORS.border}`,
          borderRadius: '8px',
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Title & Quick Info */}
        <div>
          <h3
            style={{
              margin: '0 0 8px 0',
              color: BRAND_COLORS.navy,
              fontSize: '16px',
              fontWeight: '600',
              wordBreak: 'break-word',
            }}
          >
            {quiz.title}
          </h3>

          {/* Meta Row */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              fontSize: '13px',
              color: BRAND_COLORS.gray,
              flexWrap: 'wrap',
            }}
          >
            <div>📝 {quiz.questionCount} questions</div>
            <div>⏱️ {estimatedTime}min</div>
            <div>⭐ {quiz.totalPoints}pts</div>

            {quiz.difficulty && (
              <div style={{ color: difficultyColor, fontWeight: '600' }}>
                {quiz.difficulty === 'beginner' && '✓ Beginner'}
                {quiz.difficulty === 'intermediate' && '⚡ Intermediate'}
                {quiz.difficulty === 'advanced' && '🔥 Advanced'}
              </div>
            )}
          </div>
        </div>

        {/* Attempts Info */}
        {quiz.attemptsRemaining !== undefined && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `1px solid ${BRAND_COLORS.border}`,
              fontSize: '12px',
              color:
                quiz.attemptsRemaining === 0
                  ? '#DC2626'
                  : quiz.attemptsRemaining === 1
                    ? BRAND_COLORS.orange
                    : BRAND_COLORS.gray,
            }}
          >
            {quiz.attemptsRemaining === 0
              ? `No attempts remaining`
              : `${quiz.attemptsRemaining}/${quiz.attemptsTotal} attempts`}
          </div>
        )}
      </div>

      {/* Preview Popup (Desktop only) */}
      {showPreview && quiz.description && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '110%',
            width: '300px',
            backgroundColor: BRAND_COLORS.white,
            border: `2px solid ${BRAND_COLORS.teal}`,
            borderRadius: '8px',
            padding: '16px',
            zIndex: 1000,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          }}
          className="hidden lg:block"
        >
          <div
            style={{
              color: BRAND_COLORS.navy,
              fontSize: '13px',
              lineHeight: '1.6',
            }}
          >
            {quiz.description}
          </div>

          {quiz.passScore && (
            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${BRAND_COLORS.border}`,
                fontSize: '12px',
                color: BRAND_COLORS.gray,
              }}
            >
              <strong>Passing score:</strong> {quiz.passScore}%
            </div>
          )}

          {quiz.tags && quiz.tags.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              {quiz.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-block',
                    backgroundColor: BRAND_COLORS.light,
                    color: BRAND_COLORS.teal,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    marginRight: '4px',
                    marginBottom: '4px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile preview (expandable card) */}
      <style>{`
        @media (max-width: 640px) {
          [data-mobile-preview] {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
