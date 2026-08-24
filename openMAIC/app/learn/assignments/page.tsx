'use client';

/**
 * Student Assignments Portal
 * View assigned quizzes with expiry dates
 * Only assigned quizzes are visible (no open quiz list)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';
import AssignmentCard from '@/components/quiz/AssignmentCard';
import { useAssignments } from '@/lib/hooks/useAssignments';

const log = createLogger('StudentAssignments');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function AssignmentsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);

  // Get student ID from localStorage on mount
  useEffect(() => {
    const storedStudentId = localStorage.getItem('studentId');
    if (!storedStudentId) {
      // Redirect to login if no student ID
      router.push('/auth/login');
      return;
    }
    setStudentId(storedStudentId);
  }, [router]);

  // Use the assignments hook
  const { activeAssignments, expiredAssignments, archivedAssignments, loading, error } =
    useAssignments(studentId);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: BRAND_COLORS.gray }}>Loading assignments...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND_COLORS.light,
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              margin: '0 0 8px 0',
              color: BRAND_COLORS.navy,
              fontSize: '28px',
              fontWeight: '700',
            }}
          >
            My Assignments
          </h1>
          <p
            style={{
              margin: '0',
              color: BRAND_COLORS.gray,
              fontSize: '14px',
            }}
          >
            View and take your assigned quizzes
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#DC2626',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Active Assignments */}
        {activeAssignments.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2
              style={{
                margin: '0 0 16px 0',
                color: BRAND_COLORS.navy,
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              📋 Active Assignments
            </h2>
            {activeAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}

        {/* Expired Assignments */}
        {expiredAssignments.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2
              style={{
                margin: '0 0 16px 0',
                color: BRAND_COLORS.navy,
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              ⏰ Expired Assignments
            </h2>
            {expiredAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} isExpired={true} />
            ))}
          </div>
        )}

        {/* Archived Assignments */}
        {archivedAssignments.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2
              style={{
                margin: '0 0 16px 0',
                color: BRAND_COLORS.gray,
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              📦 Archived Assignments
            </h2>
            {archivedAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {activeAssignments.length === 0 &&
          expiredAssignments.length === 0 &&
          archivedAssignments.length === 0 && (
            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                border: `2px dashed ${BRAND_COLORS.border}`,
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  color: BRAND_COLORS.navy,
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                No assignments yet
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.gray,
                  fontSize: '14px',
                }}
              >
                Your instructor will assign quizzes here. Check back soon!
              </p>
            </div>
          )}

        {/* Help Section */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '8px',
            padding: '16px',
            marginTop: '32px',
          }}
        >
          <p
            style={{
              margin: '0',
              color: BRAND_COLORS.gray,
              fontSize: '13px',
            }}
          >
            💡 <strong>Tip:</strong> You can only access quizzes assigned to you by your instructor. If you
            have an assignment code, visit the assignment link directly to start.
          </p>
        </div>
      </div>
    </div>
  );
}
