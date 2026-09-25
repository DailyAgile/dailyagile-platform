/**
 * Completion Stats Card Component
 * Displays completion statistics for a quiz
 * Used in instructor dashboard/management pages
 */

import React from 'react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
};

interface CompletionStatData {
  quiz_id: string;
  quiz_code: string;
  title: string;
  assigned_count: number;
  completed_count: number;
  completion_percentage: number;
  avg_score: number | null;
  last_completion_date: string | null;
}

interface CompletionStatsCardProps {
  stat: CompletionStatData;
  onClick?: () => void;
  showDetails?: boolean;
}

export const CompletionStatsCard: React.FC<CompletionStatsCardProps> = ({
  stat,
  onClick,
  showDetails = true,
}) => {
  const getCompletionColor = (percentage: number): string => {
    if (percentage >= 80) return BRAND_COLORS.success;
    if (percentage >= 60) return BRAND_COLORS.teal;
    if (percentage >= 40) return BRAND_COLORS.warning;
    return BRAND_COLORS.orange;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'No completions yet';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPending = stat.assigned_count > stat.completed_count;
  const pending = stat.assigned_count - stat.completed_count;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: BRAND_COLORS.white,
        border: `1px solid ${BRAND_COLORS.border}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: onClick ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 4px 12px rgba(0, 0, 0, 0.15)';
          (e.currentTarget as HTMLElement).style.borderColor = BRAND_COLORS.teal;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 1px 3px rgba(0, 0, 0, 0.1)';
          (e.currentTarget as HTMLElement).style.borderColor = BRAND_COLORS.border;
        }
      }}
    >
      {/* Header: Quiz Title and Code */}
      <div style={{ marginBottom: '12px' }}>
        <h3
          style={{
            margin: '0 0 4px 0',
            color: BRAND_COLORS.navy,
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {stat.title}
        </h3>
        <p
          style={{
            margin: '0',
            color: BRAND_COLORS.gray,
            fontSize: '12px',
          }}
        >
          Code: {stat.quiz_code}
        </p>
      </div>

      {/* Main Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        {/* Assigned Count */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            padding: '8px 12px',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: BRAND_COLORS.navy,
            }}
          >
            {stat.assigned_count}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: BRAND_COLORS.gray,
              marginTop: '2px',
            }}
          >
            Assigned
          </div>
        </div>

        {/* Completed Count */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            padding: '8px 12px',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: BRAND_COLORS.teal,
            }}
          >
            {stat.completed_count}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: BRAND_COLORS.gray,
              marginTop: '2px',
            }}
          >
            Completed
          </div>
        </div>

        {/* Completion Percentage */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            padding: '8px 12px',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: getCompletionColor(stat.completion_percentage),
            }}
          >
            {stat.completion_percentage}%
          </div>
          <div
            style={{
              fontSize: '11px',
              color: BRAND_COLORS.gray,
              marginTop: '2px',
            }}
          >
            Complete
          </div>
        </div>

        {/* Average Score */}
        {stat.avg_score !== null && (
          <div
            style={{
              backgroundColor: BRAND_COLORS.light,
              padding: '8px 12px',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: stat.avg_score >= 70 ? BRAND_COLORS.teal : BRAND_COLORS.orange,
              }}
            >
              {stat.avg_score}%
            </div>
            <div
              style={{
                fontSize: '11px',
                color: BRAND_COLORS.gray,
                marginTop: '2px',
              }}
            >
              Avg Score
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          borderRadius: '4px',
          height: '6px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            backgroundColor: getCompletionColor(stat.completion_percentage),
            height: '100%',
            width: `${stat.completion_percentage}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Details Row */}
      {showDetails && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
          }}
        >
          <div
            style={{
              color: BRAND_COLORS.gray,
            }}
          >
            {isPending && (
              <span style={{ color: BRAND_COLORS.orange }}>
                {pending} pending
              </span>
            )}
            {!isPending && stat.completed_count > 0 && (
              <span style={{ color: BRAND_COLORS.success }}>
                ✓ All completed
              </span>
            )}
            {stat.assigned_count === 0 && (
              <span style={{ color: BRAND_COLORS.gray }}>
                No assignments yet
              </span>
            )}
          </div>
          <div
            style={{
              color: BRAND_COLORS.gray,
              textAlign: 'right',
            }}
          >
            Last: {formatDate(stat.last_completion_date)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletionStatsCard;
