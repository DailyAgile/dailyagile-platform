/**
 * Instructor Code Modal Component
 * Modal for entering 8-digit instructor code to load quizzes
 * Used in public dashboard for code-based quiz access
 */

import React, { useState } from 'react';
import { validateInstructorCode } from '@/lib/quiz-navigation/user-type-detector';

interface InstructorCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  isLoading?: boolean;
}

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#dc2626',
};

export default function InstructorCodeModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: InstructorCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = (e.target.value || '').replace(/\D/g, '').slice(0, 8);
    setCode(value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code) {
      setError('Please enter an instructor code');
      return;
    }

    if (!validateInstructorCode(code)) {
      setError('Code must be exactly 8 digits');
      return;
    }

    try {
      await onSubmit(code);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            fontFamily: 'Cambria, serif',
          }}
        >
          Enter Instructor Code
        </h2>
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '14px',
            color: BRAND_COLORS.gray,
            fontFamily: 'Calibri, sans-serif',
          }}
        >
          Ask your instructor for their 8-digit code to access their quizzes.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="instructorCode"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: BRAND_COLORS.navy,
                marginBottom: '8px',
                fontFamily: 'Calibri, sans-serif',
              }}
            >
              Instructor Code
            </label>
            <input
              id="instructorCode"
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={handleCodeChange}
              placeholder="12345678"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: `2px solid ${error ? BRAND_COLORS.error : BRAND_COLORS.border}`,
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                boxSizing: 'border-box',
                letterSpacing: '4px',
                textAlign: 'center',
              }}
              autoFocus
            />
            {error && (
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '13px',
                  color: BRAND_COLORS.error,
                  fontFamily: 'Calibri, sans-serif',
                }}
              >
                {error}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: BRAND_COLORS.light,
                color: BRAND_COLORS.navy,
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'Calibri, sans-serif',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                minHeight: '44px',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.backgroundColor = BRAND_COLORS.border;
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.backgroundColor = BRAND_COLORS.light;
                }
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !code}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: isLoading || !code ? BRAND_COLORS.gray : BRAND_COLORS.orange,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading || !code ? 'not-allowed' : 'pointer',
                fontFamily: 'Calibri, sans-serif',
                opacity: isLoading || !code ? 0.6 : 1,
                transition: 'all 0.2s ease',
                minHeight: '44px',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && code) {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.opacity = '0.9';
                  target.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && code) {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.opacity = '1';
                  target.style.transform = 'scale(1)';
                }
              }}
            >
              {isLoading ? 'Loading...' : 'Load Quizzes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
