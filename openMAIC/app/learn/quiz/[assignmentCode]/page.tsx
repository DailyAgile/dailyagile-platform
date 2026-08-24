'use client';

/**
 * Assignment Link Handler
 * When student clicks: /learn/quiz/[assignmentCode]
 * Validates assignment and starts quiz or shows expiry message
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('AssignmentLinkHandler');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Assignment {
  id: string;
  quiz_id: string;
  assignment_code: string;
  expires_at: string;
  status: 'active' | 'archived' | 'expired';
}

export default function AssignmentLinkPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentCode = params.assignmentCode as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Get student ID
    const storedStudentId = localStorage.getItem('studentId');
    if (!storedStudentId) {
      setError('Please log in first');
      setTimeout(() => router.push('/auth/student-login'), 2000);
      return;
    }
    setStudentId(storedStudentId);

    // Validate assignment
    validateAssignment();
  }, [assignmentCode]);

  const validateAssignment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quiz/assignments?code=${assignmentCode}`);

      if (!response.ok) {
        throw new Error('Assignment code not found');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Invalid assignment');
      }

      const { assignment: assignmentData, expired } = data.data;
      setAssignment(assignmentData);
      setIsExpired(expired);

      // Auto-redirect to quiz if valid
      if (!expired) {
        setTimeout(() => {
          startQuiz(assignmentData);
        }, 500);
      }
    } catch (err) {
      log.error('Failed to validate assignment:', err);
      setError(err instanceof Error ? err.message : 'Invalid assignment code');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (assignmentData: Assignment) => {
    try {
      const response = await fetch('/api/student/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_code: assignmentCode,
          student_id: studentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start quiz');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to start quiz');
      }

      // Redirect to quiz taker
      router.push(`/learn/practice/${data.data.quiz_id}`);
    } catch (err) {
      log.error('Failed to start quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
    }
  };

  const handleRequestExtension = () => {
    if (assignment) {
      router.push(`/learn/assignments/${assignment.id}/request?type=extension`);
    }
  };

  const handleRequestNewCode = () => {
    if (assignment) {
      router.push(`/learn/assignments/${assignment.id}/request?type=new_code`);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}
          >
            ⏳
          </div>
          <p style={{ color: BRAND_COLORS.gray, fontSize: '16px' }}>
            Validating assignment...
          </p>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light,
        }}
      >
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ color: BRAND_COLORS.navy, margin: '0 0 8px 0', fontSize: '20px' }}>
            Invalid Assignment
          </h1>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/learn/assignments')}
            style={{
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go to My Assignments
          </button>
        </div>
      </div>
    );
  }

  if (isExpired && assignment) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light,
        }}
      >
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏰</div>
          <h1 style={{ color: BRAND_COLORS.navy, margin: '0 0 8px 0', fontSize: '20px' }}>
            Assignment Expired
          </h1>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
            This assignment expired on{' '}
            <strong>{new Date(assignment.expires_at).toLocaleDateString()}</strong>.
          </p>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '13px' }}>
            You can request an extension or a new assignment code from your instructor.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={handleRequestExtension}
              style={{
                backgroundColor: BRAND_COLORS.orange,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Request Extension
            </button>
            <button
              onClick={handleRequestNewCode}
              style={{
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Request New Code
            </button>
          </div>

          <hr style={{ margin: '24px 0', borderColor: BRAND_COLORS.border }} />

          <button
            onClick={() => router.push('/learn/assignments')}
            style={{
              backgroundColor: 'transparent',
              color: BRAND_COLORS.teal,
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            ← Back to My Assignments
          </button>
        </div>
      </div>
    );
  }

  // If valid, should redirect before this renders
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND_COLORS.light,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <p style={{ color: BRAND_COLORS.gray, fontSize: '16px' }}>
          Loading quiz...
        </p>
      </div>
    </div>
  );
}
