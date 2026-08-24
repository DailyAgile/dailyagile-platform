'use client';

/**
 * Create Assignment Dialog
 * Instructor can create shareable or individual assignments
 * Supports METHOD A (Shareable), METHOD B/C (Individual)
 */

import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('CreateAssignmentDialog');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface CreateAssignmentDialogProps {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
  instructorId?: string;
}

export default function CreateAssignmentDialog({
  quizId,
  quizTitle,
  onClose,
  onSuccess,
  instructorId = 'system@dailyagile.com',
}: CreateAssignmentDialogProps) {
  const [step, setStep] = useState<'method' | 'config'>('method');
  const [assignmentType, setAssignmentType] = useState<'shareable' | 'individual'>('shareable');
  const [expiryDate, setExpiryDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdAssignment, setCreatedAssignment] = useState<any>(null);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);

      const expiryDateTime = new Date(expiryDate + 'T23:59:59').toISOString();

      const response = await fetch('/api/quiz/assignments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          assignmentType,
          expiryDate: expiryDateTime,
          studentIds: assignmentType === 'individual' ? selectedStudents : undefined,
          instructorId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create assignment');
      }

      setSuccess(true);
      setCreatedAssignment(data.data);
      log.info(`✅ Assignment created for ${quizTitle}`);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      log.error('Error creating assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            maxWidth: '500px',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h2
            style={{
              color: BRAND_COLORS.navy,
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '600',
            }}
          >
            Assignment Created!
          </h2>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 16px 0', fontSize: '14px' }}>
            {assignmentType === 'shareable'
              ? `Shareable link ready to share`
              : `Assigned to ${selectedStudents.length} student(s)`}
          </p>

          {assignmentType === 'shareable' && createdAssignment?.assignments?.[0] && (
            <div
              style={{
                backgroundColor: BRAND_COLORS.light,
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  color: BRAND_COLORS.gray,
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Code
              </p>
              <p
                style={{
                  margin: '0 0 12px 0',
                  color: BRAND_COLORS.navy,
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: '600',
                }}
              >
                {createdAssignment.assignments[0].assignment_code}
              </p>
              <button
                onClick={() => {
                  const code = createdAssignment.assignments[0].assignment_code;
                  navigator.clipboard.writeText(code);
                }}
                style={{
                  backgroundColor: BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Copy Code
              </button>

              <p
                style={{
                  margin: '12px 0 8px 0',
                  color: BRAND_COLORS.gray,
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                URL
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.navy,
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  lineHeight: '1.4',
                }}
              >
                {createdAssignment.assignments[0].assignment_url}
              </p>
              <button
                onClick={() => {
                  const url = createdAssignment.assignments[0].assignment_url;
                  navigator.clipboard.writeText(url);
                }}
                style={{
                  backgroundColor: BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '8px',
                }}
              >
                Copy URL
              </button>
            </div>
          )}

          <p style={{ color: BRAND_COLORS.teal, margin: '0', fontSize: '12px' }}>
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        {step === 'method' ? (
          <>
            <h2
              style={{
                color: BRAND_COLORS.navy,
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: '600',
              }}
            >
              Create Assignment
            </h2>
            <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
              How would you like to assign "{quizTitle}"?
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: `1px solid #FCA5A5`,
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#DC2626',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            {/* METHOD A: Shareable Link */}
            <div
              onClick={() => setAssignmentType('shareable')}
              style={{
                border: `2px solid ${assignmentType === 'shareable' ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer',
                backgroundColor:
                  assignmentType === 'shareable' ? BRAND_COLORS.light : BRAND_COLORS.white,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  checked={assignmentType === 'shareable'}
                  onChange={() => setAssignmentType('shareable')}
                  style={{ marginRight: '12px', marginTop: '4px', cursor: 'pointer' }}
                />
                <div>
                  <h3
                    style={{
                      margin: '0 0 4px 0',
                      color: BRAND_COLORS.navy,
                      fontSize: '15px',
                      fontWeight: '600',
                    }}
                  >
                    🔗 Shareable Link
                  </h3>
                  <p style={{ margin: '0', color: BRAND_COLORS.gray, fontSize: '13px' }}>
                    Generate a unique code and URL. Share with students via email, LMS, or Slack.
                    Anyone with the link can access.
                  </p>
                </div>
              </div>
            </div>

            {/* METHOD B/C: Individual Assignment */}
            <div
              onClick={() => setAssignmentType('individual')}
              style={{
                border: `2px solid ${assignmentType === 'individual' ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                cursor: 'pointer',
                backgroundColor:
                  assignmentType === 'individual' ? BRAND_COLORS.light : BRAND_COLORS.white,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  checked={assignmentType === 'individual'}
                  onChange={() => setAssignmentType('individual')}
                  style={{ marginRight: '12px', marginTop: '4px', cursor: 'pointer' }}
                />
                <div>
                  <h3
                    style={{
                      margin: '0 0 4px 0',
                      color: BRAND_COLORS.navy,
                      fontSize: '15px',
                      fontWeight: '600',
                    }}
                  >
                    👥 Assign to Specific Students
                  </h3>
                  <p style={{ margin: '0', color: BRAND_COLORS.gray, fontSize: '13px' }}>
                    Select individual students from your roster. Track completion per student.
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  backgroundColor: 'transparent',
                  color: BRAND_COLORS.teal,
                  border: `1px solid ${BRAND_COLORS.teal}`,
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('config')}
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
                Next →
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              style={{
                color: BRAND_COLORS.navy,
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: '600',
              }}
            >
              {assignmentType === 'shareable' ? 'Shareable Link Settings' : 'Student Selection'}
            </h2>

            {error && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: `1px solid #FCA5A5`,
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#DC2626',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            {/* Expiry Date */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: BRAND_COLORS.navy,
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ margin: '4px 0 0 0', color: BRAND_COLORS.gray, fontSize: '12px' }}>
                Default: 2 weeks from now
              </p>
            </div>

            {/* Students Selection (for individual assignments) */}
            {assignmentType === 'individual' && (
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: BRAND_COLORS.navy,
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Select Students
                </label>
                <div
                  style={{
                    border: `1px solid ${BRAND_COLORS.border}`,
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    padding: '8px',
                  }}
                >
                  <p
                    style={{
                      margin: '8px',
                      color: BRAND_COLORS.gray,
                      fontSize: '13px',
                    }}
                  >
                    📌 Student selection UI will be populated from your classroom roster
                  </p>
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setStep('method')}
                style={{
                  backgroundColor: 'transparent',
                  color: BRAND_COLORS.teal,
                  border: `1px solid ${BRAND_COLORS.teal}`,
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || (assignmentType === 'individual' && selectedStudents.length === 0)}
                style={{
                  backgroundColor: BRAND_COLORS.teal,
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
                {loading ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
