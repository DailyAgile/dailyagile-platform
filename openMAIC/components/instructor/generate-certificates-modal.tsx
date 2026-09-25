'use client';

/**
 * Generate Certificates Modal
 * Allows instructors to generate and email certificates to passing students
 */

import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('GenerateCertificatesModal');

const COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
  darkText: '#1E293B',
};

interface GenerateCertificatesModalProps {
  isOpen: boolean;
  quizId: string;
  quizTitle: string;
  passingStudentCount: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GenerateCertificatesModal({
  isOpen,
  quizId,
  quizTitle,
  passingStudentCount,
  onClose,
  onSuccess,
}: GenerateCertificatesModalProps) {
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/instructor/quiz/${quizId}/generate-certificates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ send_email: sendEmail }),
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to generate certificates');
      }

      setSuccess(
        `Successfully generated ${data.data.generated_count} certificates${
          data.data.emailed_count > 0 ? ` and emailed ${data.data.emailed_count}` : ''
        }`
      );

      log.info('Certificates generated successfully:', data.data);

      // Close after delay to show success message
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      log.error('Error generating certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: COLORS.white,
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          width: '90%',
          padding: '30px',
          border: `2px solid ${COLORS.navy}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: COLORS.navy,
              margin: '0 0 10px 0',
            }}
          >
            🎓 Generate Certificates
          </h2>
          <p style={{ color: COLORS.gray, margin: 0 }}>
            Create PDF certificates for students who passed this quiz
          </p>
        </div>

        {/* Quiz Info */}
        <div
          style={{
            backgroundColor: COLORS.light,
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '20px',
            borderLeft: `4px solid ${COLORS.teal}`,
          }}
        >
          <p style={{ margin: '5px 0', color: COLORS.darkText }}>
            <strong>Quiz:</strong> {quizTitle}
          </p>
          <p style={{ margin: '5px 0', color: COLORS.darkText }}>
            <strong>Passing Students:</strong> {passingStudentCount}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: COLORS.error,
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              fontSize: '14px',
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              color: COLORS.success,
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              fontSize: '14px',
            }}
          >
            ✅ {success}
          </div>
        )}

        {/* Send Email Checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            disabled={loading}
            style={{
              marginRight: '10px',
              width: '18px',
              height: '18px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          />
          <span style={{ color: COLORS.darkText }}>
            Send certificates via email to students
          </span>
        </label>

        {/* Info Text */}
        <p style={{ fontSize: '13px', color: COLORS.gray, marginBottom: '20px' }}>
          ℹ️ Certificates will be generated in PDF format and stored in the database.
          {sendEmail && ' Students will receive an email with a link to their certificate.'}
        </p>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: COLORS.light,
              color: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || passingStudentCount === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? COLORS.gray : COLORS.teal,
              color: COLORS.white,
              border: 'none',
              borderRadius: '6px',
              cursor: loading || passingStudentCount === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: loading || passingStudentCount === 0 ? 0.6 : 1,
            }}
          >
            {loading ? 'Generating...' : '✨ Generate & Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
