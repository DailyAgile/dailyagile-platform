/**
 * Quiz Card Component
 * Reusable card displaying quiz information with actions
 * Used across all three dashboards (Instructor, Student, Public)
 */

import React from 'react';
import { Quiz } from '@/lib/quiz-navigation/types';

interface QuizCardProps {
  quiz: Quiz;
  variant?: 'instructor' | 'student' | 'public';
  progress?: {
    completionPercent: number;
    status: 'not-started' | 'in-progress' | 'completed';
    currentScore?: number;
  };
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
}

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#16a34a',
  warning: '#ea8c55',
  error: '#dc2626',
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return BRAND_COLORS.success;
    case 'in-progress':
      return BRAND_COLORS.warning;
    case 'not-started':
      return BRAND_COLORS.gray;
    case 'published':
      return BRAND_COLORS.success;
    case 'draft':
      return BRAND_COLORS.gray;
    default:
      return BRAND_COLORS.gray;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In Progress';
    case 'not-started':
      return 'Not Started';
    case 'published':
      return 'Published';
    case 'draft':
      return 'Draft';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export default function QuizCard({
  quiz,
  variant = 'public',
  progress,
  actions = [],
}: QuizCardProps) {
  return (
    <div
      style={{
        backgroundColor: BRAND_COLORS.white,
        border: `1px solid ${BRAND_COLORS.border}`,
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLDivElement;
        target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        target.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLDivElement;
        target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        target.style.transform = 'translateY(0)';
      }}
    >
      {/* Header with title and status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <h3
          style={{
            margin: '0 0 4px 0',
            fontSize: '18px',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            fontFamily: 'Cambria, serif',
            flex: 1,
            wordBreak: 'break-word',
          }}
        >
          {quiz.title}
        </h3>
        <span
          style={{
            backgroundColor: getStatusColor(progress?.status || quiz.status),
            color: BRAND_COLORS.white,
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {getStatusLabel(progress?.status || quiz.status)}
        </span>
      </div>

      {/* Description */}
      {quiz.description && (
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: BRAND_COLORS.gray,
            lineHeight: '1.4',
            fontFamily: 'Calibri, sans-serif',
          }}
        >
          {quiz.description.length > 100
            ? `${quiz.description.substring(0, 100)}...`
            : quiz.description}
        </p>
      )}

      {/* Metadata grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '13px',
          color: BRAND_COLORS.gray,
          fontFamily: 'Calibri, sans-serif',
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', color: BRAND_COLORS.navy, marginBottom: '2px' }}>
            Questions
          </div>
          <div>{quiz.questionCount}</div>
        </div>

        {quiz.topic && (
          <div>
            <div style={{ fontWeight: 'bold', color: BRAND_COLORS.navy, marginBottom: '2px' }}>
              Topic
            </div>
            <div>{quiz.topic}</div>
          </div>
        )}

        {quiz.difficulty && (
          <div>
            <div style={{ fontWeight: 'bold', color: BRAND_COLORS.navy, marginBottom: '2px' }}>
              Difficulty
            </div>
            <div style={{ textTransform: 'capitalize' }}>{quiz.difficulty}</div>
          </div>
        )}

        {quiz.estimatedTime && (
          <div>
            <div style={{ fontWeight: 'bold', color: BRAND_COLORS.navy, marginBottom: '2px' }}>
              Time
            </div>
            <div>{quiz.estimatedTime} min</div>
          </div>
        )}

        {quiz.analytics && variant === 'instructor' && (
          <>
            <div>
              <div style={{ fontWeight: 'bold', color: BRAND_COLORS.navy, marginBottom: '2px' }}>
                Enrollment
              </div>
              <div>{quiz.analytics.enrollmentCount}</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: BRAND_COLORS.navy, marginBottom: '2px' }}>
                Avg Score
              </div>
              <div>{Math.round(quiz.analytics.avgScore)}%</div>
            </div>
          </>
        )}
      </div>

      {/* Progress bar for students */}
      {progress && variant === 'student' && (
        <div style={{ marginTop: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: BRAND_COLORS.navy }}>
              Progress
            </span>
            <span style={{ fontSize: '12px', color: BRAND_COLORS.gray }}>
              {Math.round(progress.completionPercent)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: BRAND_COLORS.light,
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(progress.completionPercent, 100)}%`,
                height: '100%',
                backgroundColor: BRAND_COLORS.teal,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          {progress.currentScore !== undefined && (
            <div
              style={{
                fontSize: '12px',
                color: BRAND_COLORS.gray,
                marginTop: '8px',
              }}
            >
              Best Score: {Math.round(progress.currentScore)}%
            </div>
          )}
        </div>
      )}

      {/* Quiz code for instructors */}
      {variant === 'instructor' && quiz.code && (
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            textAlign: 'center',
          }}
        >
          Code: {quiz.code}
        </div>
      )}

      {/* Action buttons */}
      {actions.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}
        >
          {actions.map((action) => {
            const isDisabled = action.disabled || false;
            const bgColor =
              action.variant === 'danger'
                ? BRAND_COLORS.error
                : action.variant === 'secondary'
                  ? BRAND_COLORS.teal
                  : BRAND_COLORS.orange;

            return (
              <button
                key={action.label}
                onClick={action.onClick}
                disabled={isDisabled}
                style={{
                  backgroundColor: isDisabled ? BRAND_COLORS.gray : bgColor,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'Calibri, sans-serif',
                  transition: 'all 0.2s ease',
                  opacity: isDisabled ? 0.6 : 1,
                  flex: actions.length <= 2 ? 1 : 'initial',
                  minHeight: '36px',
                  minWidth: '44px',
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.opacity = '0.9';
                    target.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled) {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.opacity = '1';
                    target.style.transform = 'scale(1)';
                  }
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
