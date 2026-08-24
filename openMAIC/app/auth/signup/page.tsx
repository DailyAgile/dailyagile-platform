'use client';

/**
 * Student Signup Page
 * Step 1: Email entry → Step 2: Choose authentication method (Password or OTP)
 *
 * Identical design to instructor signup but for student audience
 * Features same: step indicators, back buttons, animations, mobile optimization
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentSignup');

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

type Step = 'email' | 'method';

export default function StudentSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleRequestVerification = async (e: React.FormEvent) => {
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

    if (!privacyConsent) {
      setError('You must accept the Privacy Policy to continue');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/student/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start signup');
        log.warn('Signup request failed:', data);
        return;
      }

      log.info(`✅ Verification email sent to ${email}`);
      setStep('method');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      log.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseMethod = async (method: 'password' | 'otp') => {
    setLoading(true);
    try {
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&method=${method}`);
    } catch (err) {
      log.error('Navigation error:', err);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.light, display: 'flex', flexDirection: 'column' }}>
      {/* Back Button - Sticky */}
      <button
        onClick={() => {
          if (step === 'method') {
            setStep('email');
            setError(null);
          } else {
            router.push('/');
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
          {/* Logo + Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 8px 0', fontFamily: 'Cambria, serif' }}>
              Start Learning
            </h1>
            <p style={{ fontSize: '16px', color: COLORS.gray, margin: 0, fontFamily: 'Calibri, sans-serif', lineHeight: '1.5' }}>
              {step === 'email' ? 'Enter your email to create an account' : 'Choose how you want to log in'}
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
                backgroundColor: step === 'email' || step === 'method' ? COLORS.teal : COLORS.gray,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.white,
                fontSize: '14px',
                fontWeight: 700,
                transition: 'background-color 300ms ease',
              }}
            >
              1
            </div>
            {/* Line */}
            <div
              style={{
                width: '40px',
                height: '3px',
                backgroundColor: step === 'method' ? COLORS.teal : COLORS.border,
                transition: 'background-color 300ms ease',
              }}
            />
            {/* Step 2 Circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step === 'method' ? COLORS.teal : COLORS.border,
                border: step === 'method' ? 'none' : `2px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: step === 'method' ? COLORS.white : COLORS.gray,
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
            <form onSubmit={handleRequestVerification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

              {/* Privacy Policy Consent */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: COLORS.light,
                  borderRadius: '6px',
                  border: error && error.includes('Privacy') ? `1px solid ${COLORS.error}` : `1px solid ${COLORS.border}`,
                }}
              >
                <input
                  type="checkbox"
                  id="privacy-consent"
                  checked={privacyConsent}
                  onChange={(e) => {
                    setPrivacyConsent(e.target.checked);
                    if (e.target.checked && error?.includes('Privacy')) {
                      setError(null);
                    }
                  }}
                  disabled={loading}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                />
                <label
                  htmlFor="privacy-consent"
                  style={{
                    fontSize: '13px',
                    color: COLORS.navy,
                    fontFamily: 'Calibri, sans-serif',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    lineHeight: '1.4',
                  }}
                >
                  I agree to the{' '}
                  <Link
                    href="/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: COLORS.teal,
                      fontWeight: 600,
                      textDecoration: 'none',
                      borderBottom: `1px solid ${COLORS.teal}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Privacy Policy
                  </Link>
                  {' '}and understand how my data is used.
                </label>
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
                {loading ? 'Sending verification link...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Choose Authentication Method */}
          {step === 'method' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: COLORS.light, borderRadius: '6px' }}>
                <p style={{ fontSize: '13px', color: COLORS.gray, margin: 0, fontFamily: 'Calibri, sans-serif' }}>
                  Verification link sent to
                </p>
                <p style={{ fontSize: '14px', color: COLORS.navy, fontWeight: 600, margin: '4px 0 0 0', fontFamily: 'Calibri, sans-serif', wordBreak: 'break-all' }}>
                  {email}
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: COLORS.navy, margin: '0 0 12px 0', fontFamily: 'Calibri, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Authentication Method
                </p>

                {/* Password Option */}
                <button
                  onClick={() => handleChooseMethod('password')}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '12px',
                    border: `2px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    backgroundColor: COLORS.white,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = COLORS.teal;
                      e.currentTarget.style.backgroundColor = COLORS.light;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.backgroundColor = COLORS.white;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🔐</span>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: COLORS.navy, margin: 0, fontFamily: 'Calibri, sans-serif' }}>
                        Create Password
                      </p>
                      <p style={{ fontSize: '12px', color: COLORS.gray, margin: '4px 0 0 0', fontFamily: 'Calibri, sans-serif' }}>
                        Set a secure password for your account
                      </p>
                    </div>
                  </div>
                </button>

                {/* OTP Option */}
                <button
                  onClick={() => handleChooseMethod('otp')}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: `2px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    backgroundColor: COLORS.white,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = COLORS.teal;
                      e.currentTarget.style.backgroundColor = COLORS.light;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.backgroundColor = COLORS.white;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>📧</span>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: COLORS.navy, margin: 0, fontFamily: 'Calibri, sans-serif' }}>
                        Email Code Login
                      </p>
                      <p style={{ fontSize: '12px', color: COLORS.gray, margin: '4px 0 0 0', fontFamily: 'Calibri, sans-serif' }}>
                        Use 6-digit codes sent to your email
                      </p>
                    </div>
                  </div>
                </button>
              </div>
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
              textAlign: 'center',
            }}
          >
            <span>🔒</span>
            <span>Your data is secure. We never share your email.</span>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          fontSize: '13px',
          color: COLORS.gray,
          fontFamily: 'Calibri, sans-serif',
        }}
      >
        <span>Already have an account? </span>
        <Link
          href="/auth/login"
          style={{
            color: COLORS.teal,
            textDecoration: 'none',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          Sign In
        </Link>
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
      `}</style>
    </div>
  );
}
