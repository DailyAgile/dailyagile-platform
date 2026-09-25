'use client';

/**
 * Quiz Reminder Modal Component
 * Allows instructors to send email reminders to incomplete students
 */

import { useState } from 'react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

interface QuizReminderModalProps {
  open: boolean;
  incompleteCount: number;
  quizTitle: string;
  onClose: () => void;
  onSend: (message?: string) => Promise<void>;
}

export default function QuizReminderModal({
  open,
  incompleteCount,
  quizTitle,
  onClose,
  onSend,
}: QuizReminderModalProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    try {
      setSending(true);
      await onSend(customMessage);
      setCustomMessage('');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 1000,
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.navy,
            color: 'white',
            padding: '20px',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'Cambria, serif' }}>Send Quiz Reminders</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Quiz info */}
          <div
            style={{
              backgroundColor: BRAND_COLORS.light,
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
            }}
          >
            <div style={{ fontSize: '12px', color: BRAND_COLORS.gray, marginBottom: '5px' }}>Quiz</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: BRAND_COLORS.navy }}>
              {quizTitle}
            </div>
          </div>

          {/* Incomplete count */}
          <div
            style={{
              backgroundColor: '#FEF3C7',
              borderLeft: `4px solid ${BRAND_COLORS.orange}`,
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            <strong>📬 Recipients:</strong> {incompleteCount} student{incompleteCount !== 1 ? 's' : ''} with incomplete
            quizzes
          </div>

          {/* Custom message */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 'bold',
                color: BRAND_COLORS.navy,
                marginBottom: '8px',
              }}
            >
              Additional Message (Optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g., 'Please complete this quiz by Friday 5pm. It covers everything we discussed in class.'"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${BRAND_COLORS.border}`,
                fontFamily: 'Calibri, sans-serif',
                fontSize: '13px',
                resize: 'vertical',
                minHeight: '100px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '11px', color: BRAND_COLORS.gray, marginTop: '5px' }}>
              {customMessage.length} characters
            </div>
          </div>

          {/* Preview */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: BRAND_COLORS.navy,
                marginBottom: '8px',
              }}
            >
              📧 Preview
            </div>
            <div
              style={{
                backgroundColor: BRAND_COLORS.light,
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: BRAND_COLORS.navy,
                lineHeight: '1.5',
              }}
            >
              <div>
                <strong>Subject:</strong> Reminder: Complete "{quizTitle}" - DailyAgile
              </div>
              <div style={{ marginTop: '10px' }}>
                <strong>Message:</strong>
              </div>
              <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
                This is a reminder to complete the quiz "{quizTitle}" on DailyAgile.
              </div>
              {customMessage && (
                <div style={{ marginTop: '5px', padding: '8px', backgroundColor: BRAND_COLORS.white, borderRadius: '4px' }}>
                  {customMessage}
                </div>
              )}
              <div style={{ marginTop: '5px' }}>
                Your instructor has included a direct quiz link and deadline information.
              </div>
            </div>
          </div>

          {/* Info message */}
          <div
            style={{
              backgroundColor: '#D1FAE5',
              borderLeft: `4px solid #16A34A`,
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#065F46',
            }}
          >
            <strong>✓ Email Delivery:</strong> Reminders will be queued and sent via email. Students will receive the
            quiz link and deadline.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            padding: '15px 20px',
            borderRadius: '0 0 8px 8px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              backgroundColor: BRAND_COLORS.white,
              color: BRAND_COLORS.navy,
              padding: '10px 20px',
              border: `2px solid ${BRAND_COLORS.navy}`,
              borderRadius: '6px',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              opacity: sending ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || incompleteCount === 0}
            style={{
              backgroundColor: BRAND_COLORS.orange,
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: sending || incompleteCount === 0 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              opacity: sending || incompleteCount === 0 ? 0.6 : 1,
            }}
          >
            {sending ? '⏳ Sending...' : `📧 Send to ${incompleteCount} Student${incompleteCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </>
  );
}
