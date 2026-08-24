'use client';

/**
 * Request Extension or New Code
 * Student form to request extension or new assignment code
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('RequestExtension');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function RequestPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const assignmentId = params.assignmentId as string;
  const requestType = (searchParams.get('type') as 'extension' | 'new_code') || 'extension';

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Get student ID from localStorage
    const storedStudentId = localStorage.getItem('studentId');
    if (!storedStudentId) {
      setError('Please log in first');
      setTimeout(() => router.push('/auth/student-login'), 2000);
      return;
    }
    setStudentId(storedStudentId);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId) {
      setError('Student ID not found. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 🔒 JWT is sent in Authorization header automatically
      const response = await fetch(
        `/api/quiz/assignments/${assignmentId}/request-extension`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType,
            reason: reason || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to submit request');
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to submit request');
      }

      log.info(`✅ ${requestType} request submitted: ${data.data?.requestId}`);
      setSuccess(true);

      // Redirect back to assignments after 2 seconds
      setTimeout(() => {
        router.push('/learn/assignments');
      }, 2000);
    } catch (err) {
      log.error('Error submitting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ color: BRAND_COLORS.navy, margin: '0 0 8px 0', fontSize: '20px' }}>
            Request Submitted
          </h1>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
            Your {requestType === 'extension' ? 'extension' : 'new code'} request has been sent to your
            instructor. You'll be notified when they respond.
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
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND_COLORS.light,
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h1
          style={{
            margin: '0 0 8px 0',
            color: BRAND_COLORS.navy,
            fontSize: '24px',
            fontWeight: '700',
          }}
        >
          {requestType === 'extension'
            ? '⏱️ Request Extension'
            : '🔄 Request New Code'}
        </h1>
        <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
          {requestType === 'extension'
            ? 'Request more time to complete this assignment.'
            : 'Request a fresh assignment code with a new expiry date.'}
        </p>

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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="reason"
              style={{
                display: 'block',
                marginBottom: '8px',
                color: BRAND_COLORS.navy,
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Reason (Optional)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell your instructor why you need this..."
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '100px',
                resize: 'vertical',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: requestType === 'extension' ? BRAND_COLORS.orange : BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: BRAND_COLORS.teal,
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
