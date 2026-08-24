'use client';

/**
 * Delete Quiz Dialog
 * Instructor can soft delete (archive) or hard delete (permanent)
 */

import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('DeleteQuizDialog');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface DeleteQuizDialogProps {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteQuizDialog({
  quizId,
  quizTitle,
  onClose,
  onSuccess,
}: DeleteQuizDialogProps) {
  const [deleteType, setDeleteType] = useState<'soft' | 'hard' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!deleteType) {
        setError('Please select a delete type');
        return;
      }

      if (deleteType === 'hard' && confirmText !== quizTitle) {
        setError(`Please type "${quizTitle}" exactly to confirm permanent deletion`);
        return;
      }

      const response = await fetch(`/api/instructor/quiz/${quizId}/delete?deleteType=${deleteType}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmQuizName: deleteType === 'hard' ? confirmText : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete quiz');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete quiz');
      }

      setDeleted(true);
      log.info(`✅ Quiz ${deleteType} deleted: ${quizTitle}`);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      log.error('Error deleting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  if (deleted) {
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
            Quiz {deleteType === 'soft' ? 'Archived' : 'Deleted'}
          </h2>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 16px 0', fontSize: '14px' }}>
            {deleteType === 'soft'
              ? 'Quiz has been archived and can be restored later'
              : 'Quiz has been permanently deleted. Student records are preserved.'}
          </p>
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
        }}
      >
        <h2
          style={{
            color: BRAND_COLORS.navy,
            margin: '0 0 8px 0',
            fontSize: '20px',
            fontWeight: '600',
          }}
        >
          Delete Quiz
        </h2>
        <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
          How would you like to delete "{quizTitle}"?
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

        {/* Soft Delete Option */}
        <div
          onClick={() => setDeleteType('soft')}
          style={{
            border: `2px solid ${deleteType === 'soft' ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            cursor: 'pointer',
            backgroundColor: deleteType === 'soft' ? BRAND_COLORS.light : BRAND_COLORS.white,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <input
              type="radio"
              checked={deleteType === 'soft'}
              onChange={() => setDeleteType('soft')}
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
                📦 Archive (Soft Delete)
              </h3>
              <p style={{ margin: '0', color: BRAND_COLORS.gray, fontSize: '13px' }}>
                Hide the quiz but keep it recoverable. Student records and assignments preserved.
                Can be restored anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Hard Delete Option */}
        <div
          onClick={() => setDeleteType('hard')}
          style={{
            border: `2px solid ${deleteType === 'hard' ? BRAND_COLORS.orange : BRAND_COLORS.border}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            cursor: 'pointer',
            backgroundColor: deleteType === 'hard' ? '#FEF3C7' : BRAND_COLORS.white,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <input
              type="radio"
              checked={deleteType === 'hard'}
              onChange={() => setDeleteType('hard')}
              style={{ marginRight: '12px', marginTop: '4px', cursor: 'pointer' }}
            />
            <div>
              <h3
                style={{
                  margin: '0 0 4px 0',
                  color: BRAND_COLORS.orange,
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                🔴 Permanent Delete (Hard Delete)
              </h3>
              <p style={{ margin: '0 0 8px 0', color: BRAND_COLORS.gray, fontSize: '13px' }}>
                Permanently remove the quiz. <strong>Cannot be undone.</strong> Student records and
                scores are preserved.
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.orange,
                  fontSize: '12px',
                  fontStyle: 'italic',
                }}
              >
                ⚠️ This action is permanent and irreversible.
              </p>
            </div>
          </div>
        </div>

        {/* Hard Delete Confirmation */}
        {deleteType === 'hard' && (
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: BRAND_COLORS.orange,
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Type the quiz name to confirm permanent deletion:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={quizTitle}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${confirmText === quizTitle ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '8px 0 0 0', color: BRAND_COLORS.gray, fontSize: '12px' }}>
              Copy and paste: <strong>{quizTitle}</strong>
            </p>
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
            onClick={handleDelete}
            disabled={!deleteType || loading || (deleteType === 'hard' && confirmText !== quizTitle)}
            style={{
              backgroundColor: deleteType === 'hard' ? BRAND_COLORS.orange : BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading || !deleteType ? 'not-allowed' : 'pointer',
              opacity: loading || !deleteType ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting...' : 'Delete Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}
