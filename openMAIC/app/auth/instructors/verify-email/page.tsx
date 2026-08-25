'use client';

/**
 * Email Verification Page
 * After user clicks email link from verification email:
 * - Collects password if method='password'
 * - Shows OTP verification if method='otp'
 * - Verifies token and creates account
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';
import PasswordCreationForm from '@/components/auth/PasswordCreationForm';

const log = createLogger('InstructorVerifyEmail');

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

type PageState = 'form' | 'loading' | 'success' | 'error' | 'expired';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>('form');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [method, setMethod] = useState<'password' | 'otp' | null>(null);

  const token = searchParams.get('token');

  // On load, get method from localStorage and determine which form to show
  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Invalid or missing verification link');
      return;
    }

    // Get stored method or default to password
    const storedMethod = localStorage.getItem('instructor_auth_method') as 'password' | 'otp' | null;
    setMethod(storedMethod || 'password');
  }, [token]);

const handleSubmitOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');

    try {
      const response = await fetch('/api/instructor/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, method }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.error?.includes('expired')) {
          setState('expired');
        } else {
          setState('error');
        }
        setError(data.error || 'Verification failed');
        log.warn('Verification failed:', data);
        return;
      }

      setEmail(data.email);
      setState('success');
      log.info(`✅ Email verified: ${data.email}`);

      setTimeout(() => {
        router.push('/auth/instructors');
      }, 3000);
    } catch (err) {
      setState('error');
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      log.error('Verification error:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.light, display: 'flex', flexDirection: 'column' }}>
      {/* Back Button - Sticky */}
      <button
        onClick={() => router.push('/auth/instructors/signup')}
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
          cursor: 'pointer',
          transition: 'color 150ms ease, background-color 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = COLORS.teal;
          e.currentTarget.style.backgroundColor = 'rgba(8, 145, 178, 0.08)';
          e.currentTarget.style.borderRadius = '6px';
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
            textAlign: 'center',
            animation: 'slideUp 300ms ease-out',
          }}
        >
          {/* Form State - Password */}
          {state === 'form' && method === 'password' && (
            <PasswordCreationForm
              onSubmit={async (pwd) => {
                setState('loading');
                try {
                  const response = await fetch('/api/instructor/verify-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, method, password: pwd }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    if (response.status === 400 && data.error?.includes('expired')) {
                      setState('expired');
                    } else {
                      setState('error');
                    }
                    setError(data.error || 'Verification failed');
                    log.warn('Verification failed:', data);
                    return;
                  }

                  setEmail(data.email);
                  setState('success');
                  log.info(`✅ Account created: ${data.email}`);

                  // Redirect after 3 seconds
                  setTimeout(() => {
                    router.push('/auth/instructors');
                  }, 3000);
                } catch (err) {
                  setState('error');
                  const msg = err instanceof Error ? err.message : 'Network error';
                  setError(msg);
                  log.error('Verification error:', err);
                }
              }}
              isLoading={(state as PageState) === 'loading'}
              error={error}
            />
          )}

          {/* Form State - OTP */}
          {state === 'form' && method === 'otp' && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 16px 0', fontFamily: 'Cambria, serif' }}>
                Email Verified!
              </h1>
              <p style={{ fontSize: '14px', color: COLORS.gray, margin: '0 0 24px 0', fontFamily: 'Calibri, sans-serif' }}>
                Your email has been verified successfully. Complete your signup with OTP login.
              </p>

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
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmitOTP}
                disabled={(state as PageState) === 'loading'}
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '12px 16px',
                  backgroundColor: (state as PageState) === 'loading' ? COLORS.gray : COLORS.teal,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Calibri, sans-serif',
                  cursor: (state as PageState) === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: (state as PageState) === 'loading' ? 0.6 : 1,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if ((state as PageState) !== 'loading') {
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
                {(state as PageState) === 'loading' ? 'Completing Setup...' : 'Complete Signup'}
              </button>
            </>
          )}

          {/* Loading State */}
          {state === 'loading' && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 16px 0', fontFamily: 'Cambria, serif' }}>
                Setting Up Your Account
              </h1>
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 16px',
                    border: `4px solid ${COLORS.light}`,
                    borderTop: `4px solid ${COLORS.teal}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p style={{ fontSize: '14px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', margin: 0 }}>
                  Creating your instructor account...
                </p>
              </div>
            </>
          )}

          {/* Success State */}
          {state === 'success' && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 16px 0', fontFamily: 'Cambria, serif' }}>
                Account Created!
              </h1>
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
                    fontSize: '40px',
                    animation: 'scaleIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  ✓
                </div>
                <p style={{ fontSize: '16px', color: COLORS.navy, fontFamily: 'Calibri, sans-serif', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                  Your instructor account has been created successfully.
                </p>
                {email && (
                  <div style={{ backgroundColor: COLORS.light, padding: '12px', borderRadius: '6px' }}>
                    <p style={{ fontSize: '13px', color: COLORS.gray, margin: '0 0 4px 0', fontFamily: 'Calibri, sans-serif' }}>
                      Email
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: COLORS.navy, margin: 0, fontFamily: 'Calibri, monospace', wordBreak: 'break-all' }}>
                      {email}
                    </p>
                  </div>
                )}
                <p style={{ fontSize: '12px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', margin: '12px 0 0 0' }}>
                  Redirecting to login...
                </p>
              </div>

              <button
                onClick={() => router.push('/auth/instructors')}
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '12px 16px',
                  backgroundColor: COLORS.navy,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Calibri, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#152A46';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(30, 58, 95, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.navy;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Go to Login
              </button>
            </>
          )}

          {/* Error State */}
          {state === 'error' && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 16px 0', fontFamily: 'Cambria, serif' }}>
                Verification Failed
              </h1>
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 16px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                  }}
                >
                  ✕
                </div>
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
                  }}
                >
                  {error || 'Something went wrong during verification'}
                </div>
                <p style={{ fontSize: '13px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', margin: 0 }}>
                  Please try signing up again or contact support.
                </p>
              </div>

              <button
                onClick={() => router.push('/auth/instructors/signup')}
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '12px 16px',
                  backgroundColor: COLORS.teal,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Calibri, sans-serif',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0677A1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(8, 145, 178, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.teal;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Start Over
              </button>

              <Link
                href="/"
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: COLORS.teal,
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontFamily: 'Calibri, sans-serif',
                  fontWeight: 600,
                }}
              >
                Return to Home
              </Link>
            </>
          )}

          {/* Expired State */}
          {state === 'expired' && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 16px 0', fontFamily: 'Cambria, serif' }}>
                Link Expired
              </h1>
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 16px',
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                  }}
                >
                  ⏱
                </div>
                <p style={{ fontSize: '13px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', margin: 0, lineHeight: '1.5' }}>
                  This verification link expired after 24 hours. Please request a new one to continue.
                </p>
              </div>

              <button
                onClick={() => router.push('/auth/instructors/signup')}
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '12px 16px',
                  backgroundColor: COLORS.teal,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Calibri, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0677A1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(8, 145, 178, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.teal;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Request New Link
              </button>
            </>
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
            <span>🔒</span>
            <span>Email link expires in 24 hours</span>
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

        @keyframes spin {
          to {
            transform: rotate(360deg);
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
