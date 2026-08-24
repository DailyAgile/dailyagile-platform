'use client';

/**
 * Student Forgot Password Page
 * Step 1: Email entry → Step 2: Confirmation message
 * Identical design to instructor version
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentForgotPassword');

const COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  errorBorder: '#FECACA',
};

type Step = 'email' | 'sent';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset link');
        log.warn('Forgot password request failed:', data);
        return;
      }

      log.info(`✅ Reset link sent to ${email}`);
      setStep('sent');

      // Start resend countdown (30 seconds)
      setResendCountdown(30);
      const countdown = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      log.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/student/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset link');
        return;
      }

      log.info(`✅ Reset link resent to ${email}`);
      setResendCountdown(30);

      const countdown = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      log.error('Resend error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.light, display: 'flex', flexDirection: 'column' }}>
      {/* Back Button - Sticky */}
      <button
        onClick={() => {
          if (step === 'sent') {
            setStep('email');
            setError(null);
          } else {
            router.push('/auth/login');
          }
        }}
        disabled={loading}
        style={{
          position: 'fixed',
          top: '12px',
          left: '12px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          border: 'none',
          color: COLORS.gray,
          fontSize: '14px',
          fontFamily: 'Calibri, sans-serif',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'color 150ms ease, background-color 150ms ease',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.color = COLORS.teal;
            e.currentTarget.style.backgroundColor = 'rgba(8, 145, 178, 0.08)';
            e.currentTarget.style.borderRadius = '6px';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = COLORS.gray;
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ‹ Back
      </button>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 16px 32px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: COLORS.white,
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: '32px 24px',
            animation: 'slideUp 300ms ease-out',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 8px 0', fontFamily: 'Cambria, serif' }}>
              Reset Your Password
            </h1>
            <p style={{ fontSize: '16px', color: COLORS.gray, margin: 0, fontFamily: 'Calibri, sans-serif', lineHeight: '1.5' }}>
              {step === 'email' ? 'Enter your email to receive a reset link' : 'Reset link sent to your email'}
            </p>
          </div>

          {/* Step Indicator - Desktop */}
          <div
            style={{
              fontSize: '12px',
              color: COLORS.gray,
              textAlign: 'right',
              marginBottom: '24px',
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Step {step === 'email' ? 1 : 2} of 2
          </div>

          {/* Step Indicator - Mobile (Visual Progress Bar) */}
          <div
            style={{
              marginBottom: '24px',
              padding: '12px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            {/* Step 1 Circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: COLORS.teal,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.white,
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              1
            </div>
            {/* Line */}
            <div
              style={{
                width: '40px',
                height: '3px',
                backgroundColor: step === 'sent' ? COLORS.teal : COLORS.border,
                transition: 'background-color 300ms ease',
              }}
            />
            {/* Step 2 Circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step === 'sent' ? COLORS.teal : COLORS.border,
                border: step === 'sent' ? 'none' : `2px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: step === 'sent' ? COLORS.white : COLORS.gray,
                fontSize: '14px',
                fontWeight: 700,
                transition: 'all 300ms ease',
              }}
            >
              2
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                backgroundColor: COLORS.errorBg,
                color: COLORS.error,
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                border: `1px solid ${COLORS.errorBorder}`,
                fontFamily: 'Calibri, sans-serif',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span style={{ marginTop: '2px' }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Email Entry */}
          {step === 'email' && (
            <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.navy,
                    marginBottom: '6px',
                    fontFamily: 'Calibri, sans-serif',
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray, fontSize: '16px' }}>
                    🔒
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={loading}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontFamily: 'Calibri, sans-serif',
                      boxSizing: 'border-box',
                      backgroundColor: COLORS.white,
                      color: COLORS.navy,
                      opacity: loading ? 0.6 : 1,
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = COLORS.teal;
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(8, 145, 178, 0.1)`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = COLORS.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  height: '48px',
                  padding: '12px 16px',
                  backgroundColor: loading || !email ? COLORS.gray : COLORS.teal,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Calibri, sans-serif',
                  cursor: loading || !email ? 'not-allowed' : 'pointer',
                  opacity: loading || !email ? 0.6 : 1,
                  transition: 'all 150ms ease',
                  transform: 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (!loading && email) {
                    e.currentTarget.style.backgroundColor = '#0677A1';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(8, 145, 178, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.teal;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? 'Sending reset link...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* Step 2: Confirmation Message */}
          {step === 'sent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Success Icon */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 8px',
                  backgroundColor: 'rgba(8, 145, 178, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  animation: 'scaleIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                ✓
              </div>

              {/* Email Confirmation */}
              <div style={{ backgroundColor: COLORS.light, padding: '12px', borderRadius: '6px' }}>
                <p style={{ fontSize: '13px', color: COLORS.gray, margin: '0 0 4px 0', fontFamily: 'Calibri, sans-serif' }}>
                  Reset link sent to
                </p>
                <p style={{ fontSize: '14px', color: COLORS.navy, fontWeight: 600, margin: 0, fontFamily: 'Calibri, monospace', wordBreak: 'break-all' }}>
                  {email}
                </p>
              </div>

              {/* Instructions */}
              <p style={{ fontSize: '13px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', margin: 0, lineHeight: '1.5', textAlign: 'center' }}>
                Check your inbox for an email with a reset link. The link expires in 1 hour.
              </p>

              {/* Resend Option */}
              {resendCountdown > 0 ? (
                <p style={{ fontSize: '12px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', margin: 0, textAlign: 'center' }}>
                  Can resend in {resendCountdown}s
                </p>
              ) : (
                <button
                  onClick={handleResendLink}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: COLORS.teal,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'Calibri, sans-serif',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = COLORS.light;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {loading ? 'Sending...' : 'Resend Reset Link'}
                </button>
              )}

              {/* Check Spam Note */}
              <p style={{ fontSize: '11px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', margin: 0, textAlign: 'center' }}>
                Didn't receive the email? Check your spam or junk folder.
              </p>

              {/* Back to Login Link */}
              <Link
                href="/auth/login"
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: COLORS.teal,
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontFamily: 'Calibri, sans-serif',
                  fontWeight: 600,
                  borderTop: `1px solid ${COLORS.border}`,
                  marginTop: '8px',
                  paddingTop: '16px',
                }}
              >
                Back to Login
              </Link>
            </div>
          )}

          {/* Security Footer */}
          <div
            style={{
              marginTop: '32px',
              paddingTop: '16px',
              borderTop: `1px solid ${COLORS.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              color: COLORS.gray,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            <span>⏱</span>
            <span>Reset link expires in 1 hour</span>
          </div>
        </div>
      </div>

      {/* Animation Keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
