'use client';

import { useState } from 'react';
import { mockAuthApi } from '@/lib/api/mock-api';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  errorBorder: '#FCA5A5',
};

interface LoginFormProps {
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
}

export default function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email address');
      onError?.('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      onError?.('Invalid email format');
      return;
    }

    try {
      setLoading(true);

      // Use real API if available, otherwise use mock
      const endpoint = '/api/auth/send-magic-link';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).catch(async () => {
        // Fallback to mock API if real endpoint fails
        const result = await mockAuthApi.sendMagicLink(email);
        return {
          ok: result.success,
          status: result.success ? 200 : 400,
          json: async () => result
        } as Response;
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Failed to send magic link';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setSuccess(true);
      setSubmittedEmail(email);
      setEmail('');
      onSuccess?.(email);

      // Store for verification page
      localStorage.setItem('last-login-email', submittedEmail);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submittedEmail })
      }).catch(async () => {
        const result = await mockAuthApi.resendCode(submittedEmail);
        return {
          ok: result.success,
          status: result.success ? 200 : 400,
          json: async () => result
        } as Response;
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error?.message || 'Failed to resend code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      {/* Success State */}
      {success && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #D1FAE5',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: '0 0 8px 0',
              color: '#065F46',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            ✅ Check your email
          </p>
          <p
            style={{
              margin: '0 0 12px 0',
              color: '#047857',
              fontSize: '14px',
            }}
          >
            We sent a login link to <strong>{submittedEmail}</strong>
          </p>
          <p
            style={{
              margin: '0 0 12px 0',
              color: '#047857',
              fontSize: '13px',
            }}
          >
            Click the link in the email to log in. The link expires in 15 minutes.
          </p>
          <button
            onClick={handleResend}
            disabled={loading}
            style={{
              backgroundColor: 'transparent',
              color: BRAND_COLORS.teal,
              border: `1px solid ${BRAND_COLORS.teal}`,
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Sending...' : 'Resend link'}
          </button>
          <p
            style={{
              margin: '12px 0 0 0',
              color: BRAND_COLORS.gray,
              fontSize: '12px',
            }}
          >
            Or enter a different email:
          </p>
        </div>
      )}

      {/* Form State */}
      {!success && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h1
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.navy,
                fontSize: '24px',
                fontWeight: '700',
              }}
            >
              Welcome Back
            </h1>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.gray,
                fontSize: '14px',
              }}
            >
              Enter your email to get a magic login link
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: BRAND_COLORS.errorBg,
                border: `1px solid ${BRAND_COLORS.errorBorder}`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                color: BRAND_COLORS.error,
                fontSize: '13px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: BRAND_COLORS.navy,
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  backgroundColor: BRAND_COLORS.white,
                  color: BRAND_COLORS.navy,
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = BRAND_COLORS.teal;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND_COLORS.light}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = BRAND_COLORS.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                width: '100%',
                padding: '14px 16px',
                minHeight: '44px',
                backgroundColor:
                  loading || !email.trim() ? '#CBD5E1' : BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading && email.trim()) {
                  e.currentTarget.style.backgroundColor = '#0A7E9A';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && email.trim()) {
                  e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
                }
              }}
            >
              {loading && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              )}
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          {/* Help Text */}
          <div
            style={{
              backgroundColor: BRAND_COLORS.light,
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '6px',
              padding: '12px',
              fontSize: '13px',
              color: BRAND_COLORS.gray,
              lineHeight: '1.5',
            }}
          >
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>💡 Tip:</strong> We'll send a secure link to your email. No password needed.
            </p>
            <p style={{ margin: '0' }}>
              <strong>✅ Safe:</strong> You can only log in with a link sent to your email.
            </p>
          </div>
        </>
      )}

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
