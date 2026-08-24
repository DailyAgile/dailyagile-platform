'use client';

/**
 * Instructor Extension Requests
 * View and manage student requests for extensions and new codes
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('ExtensionRequests');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Request {
  id: string;
  assignment_id: string;
  student_id: string;
  request_type: 'extension' | 'new_code';
  requested_at: string;
  status: 'pending' | 'approved' | 'denied';
  instructor_response?: string;
  new_expiry_date?: string;
  quiz_assignments: {
    quiz_id: string;
    expires_at: string;
    quizzes: {
      title: string;
    };
    students?: {
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

export default function ExtensionRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [denialReason, setDenialReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔒 JWT is sent in Authorization header automatically by Next.js
      const response = await fetch(
        `/api/instructor/requests?status=${activeTab}`,
      );

      if (!response.ok) {
        throw new Error('Failed to load requests');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load requests');
      }

      setRequests(data.data.requests || []);
    } catch (err) {
      log.error('Failed to load requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, requestType: 'extension' | 'new_code') => {
    try {
      setProcessingId(requestId);

      const body: Record<string, any> = {
        action: 'approve',
      };

      if (requestType === 'extension') {
        if (!newExpiryDate) {
          setError('Please select a new expiry date');
          return;
        }
        body.newExpiryDate = newExpiryDate;
      }

      const response = await fetch(`/api/instructor/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to approve request');
      }

      log.info(`✅ Request approved: ${requestId}`);
      setExpandedRequest(null);
      loadRequests();
    } catch (err) {
      log.error('Error approving request:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      setProcessingId(requestId);

      const response = await fetch(`/api/instructor/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deny',
          reason: denialReason || 'Request denied',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deny request');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to deny request');
      }

      log.info(`✅ Request denied: ${requestId}`);
      setExpandedRequest(null);
      loadRequests();
    } catch (err) {
      log.error('Error denying request:', err);
      setError(err instanceof Error ? err.message : 'Failed to deny request');
    } finally {
      setProcessingId(null);
    }
  };

  const RequestCard = ({ request }: { request: Request }) => {
    const isExpanded = expandedRequest === request.id;
    const student = request.quiz_assignments?.students;
    const quiz = request.quiz_assignments?.quizzes;
    const originalExpiry = request.quiz_assignments?.expires_at;

    return (
      <div
        style={{
          backgroundColor: BRAND_COLORS.white,
          border: `1px solid ${BRAND_COLORS.border}`,
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        <div
          onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
          style={{
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: isExpanded ? BRAND_COLORS.light : BRAND_COLORS.white,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: request.request_type === 'extension' ? BRAND_COLORS.orange : BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                {request.request_type === 'extension' ? '⏱️ Extension' : '🔄 New Code'}
              </span>
            </div>
            <h3
              style={{
                margin: '0 0 4px 0',
                color: BRAND_COLORS.navy,
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              {student?.first_name} {student?.last_name}
            </h3>
            <p
              style={{
                margin: '0 0 4px 0',
                color: BRAND_COLORS.gray,
                fontSize: '13px',
              }}
            >
              {student?.email}
            </p>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.gray,
                fontSize: '13px',
              }}
            >
              Quiz: {quiz?.title}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                margin: '0 0 4px 0',
                color: BRAND_COLORS.gray,
                fontSize: '12px',
              }}
            >
              Requested {new Date(request.requested_at).toLocaleDateString()}
            </p>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.teal,
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              {isExpanded ? '▼ Details' : '▶ Details'}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div style={{ backgroundColor: BRAND_COLORS.light, padding: '16px', borderTop: `1px solid ${BRAND_COLORS.border}` }}>
            {request.instructor_response && (
              <div style={{ marginBottom: '12px' }}>
                <p
                  style={{
                    margin: '0 0 4px 0',
                    color: BRAND_COLORS.navy,
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Student's Message
                </p>
                <p
                  style={{
                    margin: '0 0 12px 0',
                    color: BRAND_COLORS.gray,
                    fontSize: '13px',
                    fontStyle: 'italic',
                  }}
                >
                  "{request.instructor_response}"
                </p>
              </div>
            )}

            {activeTab === 'pending' && (
              <>
                {request.request_type === 'extension' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '4px',
                        color: BRAND_COLORS.navy,
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      New Expiry Date
                    </label>
                    <input
                      type="date"
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      defaultValue={
                        originalExpiry ? new Date(originalExpiry).toISOString().split('T')[0] : ''
                      }
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${BRAND_COLORS.border}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {request.request_type === 'new_code' && (
                  <div style={{ marginBottom: '12px' }}>
                    <p
                      style={{
                        margin: '0 0 8px 0',
                        color: BRAND_COLORS.gray,
                        fontSize: '13px',
                      }}
                    >
                      A new assignment code will be generated with a 2-week expiry when approved.
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      color: BRAND_COLORS.navy,
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    Denial Reason (if applicable)
                  </label>
                  <textarea
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    placeholder="Why are you denying this request? (Optional - student will see this)"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${BRAND_COLORS.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      minHeight: '60px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <button
                    onClick={() => handleApprove(request.id, request.request_type)}
                    disabled={processingId === request.id}
                    style={{
                      flex: 1,
                      backgroundColor: BRAND_COLORS.teal,
                      color: BRAND_COLORS.white,
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                      opacity: processingId === request.id ? 0.6 : 1,
                    }}
                  >
                    {processingId === request.id ? 'Processing...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => handleDeny(request.id)}
                    disabled={processingId === request.id}
                    style={{
                      flex: 1,
                      backgroundColor: BRAND_COLORS.orange,
                      color: BRAND_COLORS.white,
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                      opacity: processingId === request.id ? 0.6 : 1,
                    }}
                  >
                    {processingId === request.id ? 'Processing...' : '✗ Deny'}
                  </button>
                </div>
              </>
            )}

            {activeTab !== 'pending' && (
              <div
                style={{
                  backgroundColor: BRAND_COLORS.white,
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '4px',
                  padding: '8px',
              fontSize: '13px',
                  color: BRAND_COLORS.gray,
                }}
              >
                <p style={{ margin: '0 0 4px 0' }}>
                  <strong>Status:</strong> {request.status}
                </p>
                {request.new_expiry_date && (
                  <p style={{ margin: '0 0 4px 0' }}>
                    <strong>New Expiry:</strong> {new Date(request.new_expiry_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
            Extension Requests
          </h1>
          <p
            style={{
              margin: '0',
              color: BRAND_COLORS.gray,
              fontSize: '14px',
            }}
          >
            Manage student requests for extensions and new assignment codes
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

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: `2px solid ${BRAND_COLORS.border}`,
          }}
        >
          {(['pending', 'approved', 'denied'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? BRAND_COLORS.teal : 'transparent',
                color: activeTab === tab ? BRAND_COLORS.white : BRAND_COLORS.gray,
                border: 'none',
                borderBottom: activeTab === tab ? `3px solid ${BRAND_COLORS.teal}` : 'none',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: BRAND_COLORS.gray }}>Loading requests...</p>
        ) : requests.length === 0 ? (
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
              No {activeTab} requests
            </p>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.gray,
                fontSize: '14px',
              }}
            >
              {activeTab === 'pending'
                ? 'All caught up!'
                : `Check the "${activeTab}" tab for historical requests`}
            </p>
          </div>
        ) : (
          <div>
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
