'use client';

/**
 * Instructor Signup Page
 * Step 1: Email entry → Step 2: Choose authentication method (Password or OTP)
 *
 * Features:
 * - Visual step indicator with progress bar on mobile
 * - Sticky back button (always visible)
 * - Security signals (lock icons, "data is secure" footer)
 * - Mobile-optimized (16px text, 48px buttons, proper spacing)
 * - Specific error messages
 * - Smooth step transitions
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorSignup');

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

type Step = 'email' | 'method' | 'check-email';

export default function InstructorSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'password' | 'otp' | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: REQUEST EMAIL VERIFICATION
  // ─────────────────────────────────────────────────────────────────
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

    setLoading(true);
    try {
      console.log('🔄 START: Sending signup request for:', email);

      const response = await fetch('/api/instructor/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      console.log(`📊 HTTP ${response.status} - ok=${response.ok}`);

      const text = await response.text();
      console.log('📊 Response body:', text);

      let data: Record<string, any> = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('❌ JSON parse failed:', text);
      }

      if (!response.ok) {
        const errorMsg = data?.error || `HTTP ${response.status}`;
        console.error(`❌ API ERROR: ${errorMsg}`);
        setError(errorMsg);
        return;
      }

      console.log('✅ SUCCESS - Moving to step 2');
      log.info(`✅ Verification email sent to ${email}`);
      setStep('method');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      console.error('❌ EXCEPTION:', msg);
      setError(msg);
      log.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: CHOOSE AUTHENTICATION METHOD
  // ─────────────────────────────────────────────────────────────────
  const handleChooseMethod = (method: 'password' | 'otp') => {
    // Store method choice in localStorage so verify-email page can access it
    localStorage.setItem('instructor_auth_method', method);
    setSelectedMethod(method);
    setStep('check-email');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.light, display: 'flex', flexDirection: 'column' }}>
      {/* Back Button - Sticky (Mobile + Desktop) */}
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
        {/* Card Container */}
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
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎓</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 8px 0', fontFamily: 'Cambria, serif' }}>
              Create Your Account
            </h1>
            <p style={{ fontSize: '16px', color: COLORS.gray, margin: 0, fontFamily: 'Calibri, sans-serif', lineHeight: '1.5' }}>
              {step === 'email' ? 'Enter your email to get started' : 'Choose how you want to log in'}
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
            Step {step === 'email' ? 1 : step === 'method' ? 2 : 3} of 3
          </div>

          {/* Step Indicator - Mobile (Visual Progress Bar) */}
          <div
            style={{
              marginBottom: '24px',
              padding: '12px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
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
                transition: 'background-color 300ms ease',
              }}
            >
              1
            </div>
            {/* Line */}
            <div
              style={{
                width: '24px',
                height: '3px',
                backgroundColor: step === 'method' || step === 'check-email' ? COLORS.teal : COLORS.border,
                transition: 'background-color 300ms ease',
              }}
            />
            {/* Step 2 Circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step === 'method' || step === 'check-email' ? COLORS.teal : COLORS.border,
                border: step === 'method' || step === 'check-email' ? 'none' : `2px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: step === 'method' || step === 'check-email' ? COLORS.white : COLORS.gray,
                fontSize: '14px',
                fontWeight: 700,
                transition: 'all 300ms ease',
              }}
            >
              2
            </div>
            {/* Line */}
            <div
              style={{
                width: '24px',
                height: '3px',
                backgroundColor: step === 'check-email' ? COLORS.teal : COLORS.border,
                transition: 'background-color 300ms ease',
              }}
            />
            {/* Step 3 Circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step === 'check-email' ? COLORS.teal : COLORS.border,
                border: step === 'check-email' ? 'none' : `2px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: step === 'check-email' ? COLORS.white : COLORS.gray,
                fontSize: '14px',
                fontWeight: 700,
                transition: 'all 300ms ease',
              }}
            >
              3
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
                      paddingLeft: '40px',
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

          {/* Step 3: Check Email for Verification Link */}
          {step === 'check-email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 16px',
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                  }}
                >
                  📧
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: COLORS.navy, margin: '0 0 12px 0', fontFamily: 'Cambria, serif' }}>
                  Check Your Email
                </h2>
                <p style={{ fontSize: '14px', color: COLORS.gray, margin: 0, fontFamily: 'Calibri, sans-serif', lineHeight: '1.5' }}>
                  We've sent a verification link to<br />
                  <strong style={{ color: COLORS.navy }}>{email}</strong>
                </p>
              </div>

              <div style={{ padding: '12px', backgroundColor: COLORS.light, borderRadius: '6px' }}>
                <p style={{ fontSize: '12px', color: COLORS.gray, margin: 0, fontFamily: 'Calibri, sans-serif', lineHeight: '1.6' }}>
                  <strong>Authentication Method:</strong><br />
                  {selectedMethod === 'password' ? '🔐 Create Password' : '📧 Email Code Login'}
                </p>
              </div>

              <div style={{ fontSize: '12px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', lineHeight: '1.6' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>Next steps:</strong>
                </p>
                <p style={{ margin: 0 }}>
                  1. Click the verification link in your email<br />
                  2. Follow the prompts to complete signup<br />
                  3. You'll be able to log in immediately
                </p>
              </div>

              <button
                onClick={() => {
                  setStep('email');
                  setEmail('');
                  setSelectedMethod(null);
                  setError(null);
                  localStorage.removeItem('instructor_auth_method');
                }}
                style={{
                  height: '48px',
                  padding: '12px 16px',
                  backgroundColor: COLORS.gray,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Calibri, sans-serif',
                  cursor: 'pointer',
                  marginTop: '12px',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#475569';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(100, 116, 139, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.gray;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Start Over
              </button>
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
          href="/auth/instructors"
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
