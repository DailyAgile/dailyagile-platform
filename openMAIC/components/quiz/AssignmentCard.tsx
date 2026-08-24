'use client';

import { useRouter } from 'next/navigation';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export interface Assignment {
  id: string;
  assignment_code: string;
  quiz_id: string;
  expires_at: string;
  status: 'active' | 'archived' | 'expired';
  is_active: boolean;
  quiz_title?: string;
  total_questions?: number;
  total_points?: number;
}

interface AssignmentCardProps {
  assignment: Assignment;
  isExpired?: boolean;
}

export default function AssignmentCard({ assignment, isExpired = false }: AssignmentCardProps) {
  const router = useRouter();

  const formatExpiryDate = (expiresAt: string): string => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return 'Expired';
    } else if (daysLeft === 0) {
      return 'Due today';
    } else if (daysLeft === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${daysLeft} days`;
    }
  };

  const formatFullDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleStartQuiz = () => {
    router.push(`/learn/quiz/${assignment.assignment_code}`);
  };

  const handleRequestExtension = () => {
    router.push(`/learn/assignments/${assignment.id}/request`);
  };

  return (
    <div
      style={{
        backgroundColor: BRAND_COLORS.white,
        border: `1px solid ${BRAND_COLORS.border}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header Row - Title and Actions (Desktop: flex row, Mobile: flex column) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Title and Metadata */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3
            style={{
              margin: '0 0 8px 0',
              color: BRAND_COLORS.navy,
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            {assignment.quiz_title || 'Quiz'}
          </h3>
          <p
            style={{
              margin: '0 0 6px 0',
              color: BRAND_COLORS.gray,
              fontSize: '13px',
            }}
          >
            {assignment.total_questions || 0} questions • {assignment.total_points || 0} points
          </p>
          <p
            style={{
              margin: '0',
              color: isExpired ? BRAND_COLORS.orange : BRAND_COLORS.teal,
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {isExpired ? '❌' : '⏱️'} {formatExpiryDate(assignment.expires_at)}
            <br />
            <span style={{ fontSize: '11px', opacity: 0.8 }}>
              ({formatFullDate(assignment.expires_at)})
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            minWidth: 'auto',
          }}
        >
          {isExpired ? (
            <>
              <button
                onClick={handleRequestExtension}
                style={{
                  backgroundColor: BRAND_COLORS.orange,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minHeight: '44px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D94B08';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = BRAND_COLORS.orange;
                }}
                title="Request more time to complete this quiz"
              >
                ⏰ Extend
              </button>
              <button
                onClick={handleRequestExtension}
                style={{
                  backgroundColor: BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minHeight: '44px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0A7E9A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
                }}
                title="Request a new access code"
              >
                🔄 New Code
              </button>
            </>
          ) : (
            <button
              onClick={handleStartQuiz}
              style={{
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0A7E9A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
              }}
              title="Start taking this quiz"
            >
              Start Quiz →
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Stack buttons vertically on small screens */}
      <style>{`
        @media (max-width: 640px) {
          [data-mobile-buttons] {
            flex-direction: column !important;
            width: 100%;
          }
          [data-mobile-buttons] button {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
