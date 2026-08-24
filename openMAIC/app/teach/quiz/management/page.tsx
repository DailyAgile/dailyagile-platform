'use client';

/**
 * Instructor Quiz Management Dashboard
 * View and manage all quizzes
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizManagement');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Quiz {
  id: string;
  title: string;
  quiz_code: string;
  total_questions: number;
  total_points: number;
  is_published: boolean;
  assignment_count: number;
  completed_count: number;
  created_at: string;
}

export default function QuizManagementPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<{ open: boolean; quizCode?: string; quizTitle?: string }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; quizIds?: string[]; quizTitles?: string[] }>({ open: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ visible: boolean; text: string }>({ visible: false, text: '' });

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/instructor/quiz/list');

      if (!response.ok) {
        throw new Error('Failed to load quizzes');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load quizzes');
      }

      setQuizzes(data.data.quizzes || []);
    } catch (err) {
      log.error('Failed to load quizzes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (quizId: string, currentStatus: boolean) => {
    try {
      setPublishingId(quizId);

      const response = await fetch(`/api/instructor/quiz/${quizId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quiz');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update quiz');
      }

      log.info(`✅ Quiz ${!currentStatus ? 'published' : 'unpublished'}: ${quizId}`);
      await loadQuizzes();
    } catch (err) {
      log.error('Error publishing quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quiz');
    } finally {
      setPublishingId(null);
    }
  };

  const handleCloneQuiz = async (quizId: string, quizTitle: string) => {
    try {
      setCloningId(quizId);
      setError(null);

      const response = await fetch(`/api/instructor/quiz/${quizId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to clone quiz');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to clone quiz');
      }

      const clonedTitle = data.data.title;
      const clonedCode = data.data.quiz_code;

      log.info(`✅ Quiz cloned: "${quizTitle}" → "${clonedTitle}" (Code: ${clonedCode})`);

      // Show success message
      setSuccessMessage({
        visible: true,
        text: `✓ Quiz cloned successfully! Quiz code: ${clonedCode}`,
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage({ visible: false, text: '' });
      }, 3000);

      // Reload quizzes list to show new cloned quiz
      await loadQuizzes();
    } catch (err) {
      log.error('Error cloning quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to clone quiz');
    } finally {
      setCloningId(null);
    }
  };

  const handleDeleteQuizzes = async () => {
    if (!deleteModal.quizIds || deleteModal.quizIds.length === 0) return;

    try {
      setDeletingId('deleting');

      // Delete each quiz one by one
      for (const quizId of deleteModal.quizIds) {
        const response = await fetch(`/api/instructor/quiz/${quizId}/delete?deleteType=soft`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        let data;
        try {
          data = await response.json();
        } catch (e) {
          // If 401, it's likely an auth error
          if (response.status === 401) {
            throw new Error('⚠️ Instructor authentication required. Please log in with instructor credentials to delete quizzes.');
          }
          log.error(`Failed to parse response for quiz ${quizId}:`, e);
          throw new Error(`Failed to delete quiz ${quizId}`);
        }

        if (!response.ok || !data.success) {
          const errorMsg = data.error || data.error?.message || data.message || `Failed to delete quiz ${quizId}`;

          // Check if it's an auth error
          if (response.status === 401 || (typeof errorMsg === 'string' && (errorMsg.includes('Unauthorized') || errorMsg.includes('login')))) {
            throw new Error('⚠️ Instructor authentication required. Please log in with instructor credentials to delete quizzes.');
          }

          log.error(`Delete failed for ${quizId}:`, errorMsg);
          throw new Error(typeof errorMsg === 'string' ? errorMsg : `Failed to delete quiz ${quizId}`);
        }

        log.info(`✅ Quiz deleted: ${quizId}`);
      }

      setDeleteModal({ open: false });
      setSelectedQuizzes(new Set());
      setError(null);
      loadQuizzes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete quizzes';
      log.error('Error deleting quizzes:', errorMessage);
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleQuizSelection = (quizId: string) => {
    const newSelected = new Set(selectedQuizzes);
    if (newSelected.has(quizId)) {
      newSelected.delete(quizId);
    } else {
      newSelected.add(quizId);
    }
    setSelectedQuizzes(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedQuizzes.size === quizzes.length) {
      setSelectedQuizzes(new Set());
    } else {
      setSelectedQuizzes(new Set(quizzes.map((q) => q.id)));
    }
  };

  const handleBulkPublish = async () => {
    const ids = Array.from(selectedQuizzes);
    let successCount = 0;

    for (const quizId of ids) {
      try {
        const response = await fetch(`/api/instructor/quiz/${quizId}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish: true }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          successCount++;
          log.info(`✅ Quiz published: ${quizId}`);
        } else {
          log.error(`Failed to publish ${quizId}:`, data.error?.message);
        }
      } catch (err) {
        log.error('Error publishing quiz:', err);
      }
    }

    setError(successCount === ids.length ? null : `Published ${successCount}/${ids.length} quizzes`);
    await loadQuizzes();
    setSelectedQuizzes(new Set());
  };

  const handleBulkUnpublish = async () => {
    const ids = Array.from(selectedQuizzes);
    let successCount = 0;

    for (const quizId of ids) {
      try {
        const response = await fetch(`/api/instructor/quiz/${quizId}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish: false }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          successCount++;
          log.info(`✅ Quiz unpublished: ${quizId}`);
        } else {
          log.error(`Failed to unpublish ${quizId}:`, data.error?.message);
        }
      } catch (err) {
        log.error('Error unpublishing quiz:', err);
      }
    }

    setError(successCount === ids.length ? null : `Unpublished ${successCount}/${ids.length} quizzes`);
    await loadQuizzes();
    setSelectedQuizzes(new Set());
  };

  const QuizCard = ({ quiz }: { quiz: Quiz }) => {
    const completionRate =
      quiz.assignment_count > 0
        ? Math.round((quiz.completed_count / quiz.assignment_count) * 100)
        : 0;

    return (
      <div
        style={{
          backgroundColor: selectedQuizzes.has(quiz.id) ? '#E0F2FE' : BRAND_COLORS.white,
          border: `2px solid ${selectedQuizzes.has(quiz.id) ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '8px',
          cursor: 'default',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Mobile Layout */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {/* Large Selection Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              minWidth: '48px',
              cursor: 'pointer',
              borderRadius: '8px',
              backgroundColor: selectedQuizzes.has(quiz.id) ? BRAND_COLORS.teal : BRAND_COLORS.light,
              border: `2px solid ${selectedQuizzes.has(quiz.id) ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
            onClick={() => toggleQuizSelection(quiz.id)}
          >
            <input
              type="checkbox"
              checked={selectedQuizzes.has(quiz.id)}
              onChange={() => toggleQuizSelection(quiz.id)}
              style={{
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                accentColor: BRAND_COLORS.white,
                margin: 0,
              }}
            />
          </div>

          {/* Quiz Info - Clickable to view details */}
          <div
            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => router.push(`/teach/quiz/management/${quiz.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h3
                style={{
                  margin: '0',
                  color: BRAND_COLORS.navy,
                  fontSize: '15px',
                  fontWeight: '600',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {quiz.title}
              </h3>
              <span
                style={{
                  backgroundColor: quiz.is_published ? BRAND_COLORS.teal : BRAND_COLORS.gray,
                  color: BRAND_COLORS.white,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {quiz.is_published ? '📢' : '⏸️'}
              </span>
            </div>

            <p
              style={{
                margin: '0 0 6px 0',
                color: BRAND_COLORS.gray,
                fontSize: '12px',
              }}
            >
              {quiz.quiz_code} • {quiz.total_questions}Q • {quiz.total_points}pts
            </p>

            {/* Compact Stats */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
              <span style={{ color: BRAND_COLORS.gray }}>
                Assigned: <strong style={{ color: BRAND_COLORS.navy }}>{quiz.assignment_count}</strong>
              </span>
              <span style={{ color: BRAND_COLORS.gray }}>
                Completed: <strong style={{ color: BRAND_COLORS.navy }}>{quiz.completed_count}</strong>
              </span>
              <span style={{ color: completionRate > 70 ? BRAND_COLORS.teal : BRAND_COLORS.orange, fontWeight: '600' }}>
                {completionRate}% complete
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', whiteSpace: 'nowrap', cursor: 'default', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handlePublish(quiz.id, quiz.is_published)}
              disabled={publishingId === quiz.id}
              style={{
                backgroundColor: quiz.is_published ? BRAND_COLORS.orange : BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: publishingId === quiz.id ? 'not-allowed' : 'pointer',
                opacity: publishingId === quiz.id ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {publishingId === quiz.id
                ? 'Updating...'
                : quiz.is_published
                  ? 'Unpublish'
                  : 'Publish'}
            </button>

            <button
              onClick={() => router.push(`/teach/quiz/${quiz.id}/edit`)}
              style={{
                backgroundColor: 'transparent',
                color: BRAND_COLORS.teal,
                border: `1px solid ${BRAND_COLORS.teal}`,
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✏️ Edit
            </button>

            <button
              onClick={() =>
                setShareModal({ open: true, quizCode: quiz.quiz_code, quizTitle: quiz.title })
              }
              style={{
                backgroundColor: 'transparent',
                color: BRAND_COLORS.orange,
                border: `1px solid ${BRAND_COLORS.orange}`,
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🔗 Share
            </button>

            <button
              onClick={() => handleCloneQuiz(quiz.id, quiz.title)}
              disabled={cloningId === quiz.id}
              style={{
                backgroundColor: 'transparent',
                color: BRAND_COLORS.teal,
                border: `1px solid ${BRAND_COLORS.teal}`,
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: cloningId === quiz.id ? 'not-allowed' : 'pointer',
                opacity: cloningId === quiz.id ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {cloningId === quiz.id ? '🔄 Cloning...' : '🔄 Clone'}
            </button>

            <button
              onClick={() => router.push(`/teach/quiz/management/${quiz.id}`)}
              style={{
                backgroundColor: 'transparent',
                color: BRAND_COLORS.gray,
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ℹ️ Details
            </button>

          </div>
        </div>
      </div>
    );
  };

  const DeleteModal = () => {
    if (!deleteModal.open || !deleteModal.quizIds) return null;

    const isMultiple = (deleteModal.quizIds?.length || 0) > 1;

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
          zIndex: 1001,
        }}
        onClick={() => setDeleteModal({ open: false })}
      >
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ color: BRAND_COLORS.navy, margin: '0 0 8px 0', fontSize: '20px' }}>
            🗑️ {isMultiple ? 'Delete Quizzes' : 'Delete Quiz'}
          </h2>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 16px 0', fontSize: '14px' }}>
            {isMultiple ? `${deleteModal.quizIds.length} quizzes selected` : deleteModal.quizTitles?.[0]}
          </p>

          {isMultiple && deleteModal.quizTitles && deleteModal.quizTitles.length > 0 && (
            <div style={{
              backgroundColor: BRAND_COLORS.light,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              maxHeight: '150px',
              overflowY: 'auto',
            }}>
              {deleteModal.quizTitles.map((title, idx) => (
                <div key={idx} style={{ color: BRAND_COLORS.navy, fontSize: '13px', padding: '4px 0' }}>
                  • {title}
                </div>
              ))}
            </div>
          )}

          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            color: '#DC2626',
            fontSize: '13px',
            lineHeight: '1.5',
          }}>
            ⚠️ This will permanently delete {isMultiple ? 'these quizzes' : 'this quiz'}. This action cannot be undone.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => setDeleteModal({ open: false })}
              style={{
                backgroundColor: BRAND_COLORS.light,
                color: BRAND_COLORS.navy,
                border: 'none',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteQuizzes}
              disabled={deletingId === 'deleting'}
              style={{
                backgroundColor: '#EF4444',
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: deletingId === 'deleting' ? 'not-allowed' : 'pointer',
                opacity: deletingId === 'deleting' ? 0.6 : 1,
              }}
            >
              {deletingId === 'deleting' ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ShareModal = () => {
    if (!shareModal.open) return null;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const links = {
      practice: `${baseUrl}/learn/quizzes/${shareModal.quizCode}/practice`,
      mockTest: `${baseUrl}/learn/quizzes/${shareModal.quizCode}/mock-test`,
      gameMode: `${baseUrl}/teach/quizzes/${shareModal.quizCode}/game-mode`,
    };

    if (!baseUrl) {
      log.error('No baseUrl available for share links');
      return null;
    }

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
        onClick={() => setShareModal({ open: false })}
      >
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '550px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ color: BRAND_COLORS.navy, margin: '0 0 8px 0', fontSize: '20px' }}>
            🔗 Share Quiz
          </h2>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
            {shareModal.quizTitle}
          </p>

          <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
            {/* Practice Mode Link */}
            <div>
              <p style={{ color: BRAND_COLORS.navy, fontWeight: '600', fontSize: '13px', margin: '0 0 8px 0' }}>
                📚 Practice Mode
              </p>
              <input
                type="text"
                readOnly
                value={links.practice}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `2px solid ${BRAND_COLORS.teal}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  marginBottom: '8px',
                }}
              />
              <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0', lineHeight: '1.4' }}>
                📋 Triple-click to select, then press <strong>Ctrl+C</strong> (or <strong>Cmd+C</strong> on Mac) to copy
              </p>
            </div>

            {/* Mock Test Link */}
            <div>
              <p style={{ color: BRAND_COLORS.navy, fontWeight: '600', fontSize: '13px', margin: '0 0 8px 0' }}>
                🎯 Mock Test Mode
              </p>
              <input
                type="text"
                readOnly
                value={links.mockTest}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `2px solid ${BRAND_COLORS.teal}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  marginBottom: '8px',
                }}
              />
              <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0', lineHeight: '1.4' }}>
                📋 Triple-click to select, then press <strong>Ctrl+C</strong> (or <strong>Cmd+C</strong> on Mac) to copy
              </p>
            </div>

            {/* Game Mode Link */}
            <div>
              <p style={{ color: BRAND_COLORS.navy, fontWeight: '600', fontSize: '13px', margin: '0 0 8px 0' }}>
                🎮 Game Mode (Live)
              </p>
              <input
                type="text"
                readOnly
                value={links.gameMode}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `2px solid ${BRAND_COLORS.teal}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  marginBottom: '8px',
                }}
              />
              <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0', lineHeight: '1.4' }}>
                📋 Triple-click to select, then press <strong>Ctrl+C</strong> (or <strong>Cmd+C</strong> on Mac) to copy
              </p>
            </div>
          </div>

          <button
            onClick={() => setShareModal({ open: false })}
            style={{
              width: '100%',
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => router.back()}
            style={{
              backgroundColor: BRAND_COLORS.white,
              color: BRAND_COLORS.teal,
              border: `1px solid ${BRAND_COLORS.teal}`,
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => router.push('/teach/dashboard')}
            style={{
              backgroundColor: BRAND_COLORS.white,
              color: BRAND_COLORS.navy,
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🏠 Dashboard
          </button>
        </div>

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
            Quiz Management
          </h1>
          <p
            style={{
              margin: '0',
              color: BRAND_COLORS.gray,
              fontSize: '14px',
            }}
          >
            Create, publish, and manage your quizzes
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

        {successMessage.visible && (
          <div
            style={{
              backgroundColor: '#DCFCE7',
              border: '1px solid #86EFAC',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#16A34A',
              fontSize: '14px',
            }}
          >
            {successMessage.text}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/teach/quiz/new')}
            style={{
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '4px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Create New Quiz
          </button>

          {quizzes.length > 0 && (
            <button
              onClick={toggleSelectAll}
              style={{
                backgroundColor: selectedQuizzes.size === quizzes.length ? BRAND_COLORS.teal : 'transparent',
                color: selectedQuizzes.size === quizzes.length ? BRAND_COLORS.white : BRAND_COLORS.teal,
                border: `1px solid ${BRAND_COLORS.teal}`,
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ☑️ {selectedQuizzes.size === quizzes.length ? 'Deselect All' : 'Select All'}
            </button>
          )}

          {selectedQuizzes.size > 0 && (
            <>
              <span style={{ color: BRAND_COLORS.gray, fontSize: '14px', fontWeight: '600', marginLeft: '8px' }}>
                {selectedQuizzes.size}/{quizzes.length} selected
              </span>

              <button
                onClick={handleBulkPublish}
                style={{
                  backgroundColor: BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📢 Publish Selected
              </button>

              <button
                onClick={handleBulkUnpublish}
                style={{
                  backgroundColor: BRAND_COLORS.orange,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ⏸️ Unpublish Selected
              </button>

              <button
                onClick={() => {
                  const ids = Array.from(selectedQuizzes);
                  const titles = quizzes
                    .filter((q) => ids.includes(q.id))
                    .map((q) => q.title);
                  setDeleteModal({ open: true, quizIds: ids, quizTitles: titles });
                }}
                style={{
                  backgroundColor: '#EF4444',
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🗑️ Delete Selected
              </button>

              <button
                onClick={() => setSelectedQuizzes(new Set())}
                style={{
                  backgroundColor: 'transparent',
                  color: BRAND_COLORS.gray,
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ✕ Clear
              </button>
            </>
          )}
        </div>

        {loading ? (
          <p style={{ color: BRAND_COLORS.gray }}>Loading quizzes...</p>
        ) : quizzes.length === 0 ? (
          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              border: `2px dashed ${BRAND_COLORS.border}`,
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.navy,
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              No quizzes yet
            </p>
            <p
              style={{
                margin: '0 0 16px 0',
                color: BRAND_COLORS.gray,
                fontSize: '14px',
              }}
            >
              Create your first quiz to get started
            </p>
            <button
              onClick={() => router.push('/teach/quiz/new')}
              style={{
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '4px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Create Quiz
            </button>
          </div>
        ) : (
          <div>
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteModal />

      {/* Share Modal */}
      <ShareModal />
    </div>
  );
}
