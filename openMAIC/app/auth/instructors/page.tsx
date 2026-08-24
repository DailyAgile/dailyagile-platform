'use client';

/**
 * Instructor Login Page
 * 2-step verification using Brevo OTP
 *
 * Step 1: Email entry → Send code via Brevo
 * Step 2: Code verification → Create session & login
 *
 * Proven pattern from reconnection project
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorLogin');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#991B1B',
  errorBg: '#FEE2E2',
  errorBorder: '#FECACA',
  success: '#065F46',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
};

type Step = 'email' | 'password' | 'otp-code';
type AuthMethod = 'password' | 'otp' | null;

export default function InstructorLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState(10);
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Start OTP countdown timer when code verification step begins
  useEffect(() => {
    if (step === 'otp-code') {
      const timer = setInterval(() => {
        setOtpExpiryMinutes((prev) => Math.max(0, prev - 1));
      }, 60000); // Decrement every minute
      return () => clearInterval(timer);
    }
  }, [step]);

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: CHECK EMAIL & DETERMINE AUTH METHOD
  // ─────────────────────────────────────────────────────────────────
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevCode(null);

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
      const response = await fetch('/api/instructor/auth-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Email not found');
        log.warn('Auth method check failed:', data);
        return;
      }

      const method = data.method as AuthMethod;
      setAuthMethod(method);

      if (method === 'password') {
        setStep('password');
      } else if (method === 'otp') {
        // Send OTP
        const otpResponse = await fetch('/api/instructor/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });

        const otpData = await otpResponse.json();
        if (!otpResponse.ok) {
          setError(otpData.error || 'Failed to send code');
          log.warn('OTP send failed:', otpData);
          return;
        }

        log.info('OTP sent successfully');
        setStep('otp-code');
        setCode('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      log.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // STEP 2A: PASSWORD LOGIN
  // ─────────────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/instructor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        log.warn('Password login failed:', data);
        return;
      }

      log.info(`✅ Instructor logged in: ${data.email}`);
      router.push('/teach/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      log.error('Password login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // STEP 2B: VERIFY OTP CODE
  // ─────────────────────────────────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Code is required');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('Code must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/instructor/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        log.warn('OTP verify failed:', data);
        return;
      }

      log.info(`✅ Instructor logged in: ${data.email}`);
      router.push('/teach/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      log.error('OTP verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND_COLORS.light,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: BRAND_COLORS.navy,
          color: BRAND_COLORS.white,
          padding: '16px 24px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          minHeight: '60px',
        }}
      >
        <span style={{ fontSize: '24px' }}>👨‍🏫</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>DailyAgile Instructors</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Secure Dashboard Access</div>
        </div>
      </div>

      {/* Form Card */}
      <div
        style={{
          marginTop: '80px',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          padding: '32px 24px',
        }}
      >
        {step === 'email' ? (
          // STEP 1: EMAIL
          <>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: BRAND_COLORS.navy,
                margin: '0 0 8px 0',
                textAlign: 'center',
              }}
            >
              Instructor Login
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: BRAND_COLORS.gray,
                margin: '0 0 24px 0',
                textAlign: 'center',
              }}
            >
              Enter your email to continue
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: BRAND_COLORS.errorBg,
                  color: BRAND_COLORS.error,
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  border: `1px solid ${BRAND_COLORS.errorBorder}`,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCheckEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                    marginBottom: '6px',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="instructor@dailyagile.com"
                  disabled={loading}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${BRAND_COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    backgroundColor: BRAND_COLORS.white,
                    color: BRAND_COLORS.navy,
                    opacity: loading ? 0.6 : 1,
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  padding: '10px 16px',
                  backgroundColor: loading ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginTop: '8px',
                }}
              >
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          </>
        ) : step === 'password' ? (
          // STEP 2A: PASSWORD LOGIN
          <>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: BRAND_COLORS.navy,
                margin: '0 0 8px 0',
                textAlign: 'center',
              }}
            >
              Enter Password
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: BRAND_COLORS.gray,
                margin: '0 0 24px 0',
                textAlign: 'center',
              }}
            >
              {email}
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: BRAND_COLORS.errorBg,
                  color: BRAND_COLORS.error,
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  border: `1px solid ${BRAND_COLORS.errorBorder}`,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                    marginBottom: '6px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 12px',
                      border: `1px solid ${BRAND_COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      backgroundColor: BRAND_COLORS.white,
                      color: BRAND_COLORS.navy,
                      opacity: loading ? 0.6 : 1,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0',
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                style={{
                  padding: '10px 16px',
                  backgroundColor: loading ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginTop: '8px',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setPassword('');
                  setError(null);
                  setAuthMethod(null);
                  setShowPassword(false);
                }}
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: BRAND_COLORS.teal,
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ← Back to Email
              </button>
            </form>
          </>
        ) : (
          // STEP 2B: OTP CODE
          <>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: BRAND_COLORS.navy,
                margin: '0 0 8px 0',
                textAlign: 'center',
              }}
            >
              Enter Verification Code
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: BRAND_COLORS.gray,
                margin: '0 0 8px 0',
                textAlign: 'center',
              }}
            >
              We sent a 6-digit code to
            </p>

            <p
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: BRAND_COLORS.navy,
                margin: '0 0 12px 0',
                textAlign: 'center',
              }}
            >
              {email}
            </p>

            <p
              style={{
                fontSize: '12px',
                color: otpExpiryMinutes < 2 ? BRAND_COLORS.orange : BRAND_COLORS.gray,
                margin: '0 0 16px 0',
                textAlign: 'center',
                fontWeight: otpExpiryMinutes < 2 ? 600 : 400,
              }}
            >
              ⏱ Code expires in {otpExpiryMinutes} minute{otpExpiryMinutes !== 1 ? 's' : ''}
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: BRAND_COLORS.errorBg,
                  color: BRAND_COLORS.error,
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  border: `1px solid ${BRAND_COLORS.errorBorder}`,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                    marginBottom: '6px',
                  }}
                >
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={loading}
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${BRAND_COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    fontWeight: '600',
                    boxSizing: 'border-box',
                    backgroundColor: BRAND_COLORS.white,
                    color: BRAND_COLORS.navy,
                    opacity: loading ? 0.6 : 1,
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                style={{
                  padding: '10px 16px',
                  backgroundColor: loading ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginTop: '8px',
                }}
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError(null);
                  setCode('');
                  setDevCode(null);
                  setOtpExpiryMinutes(10); // Reset timer
                }}
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: BRAND_COLORS.teal,
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ← Back to Email
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer Links */}
      <div
        style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '13px',
          color: BRAND_COLORS.gray,
        }}
      >
        <Link
          href="/auth/instructors/forgot-password"
          style={{
            color: BRAND_COLORS.teal,
            textDecoration: 'none',
            fontWeight: '500',
            marginRight: '8px',
          }}
        >
          🔐 Forgot Password?
        </Link>
        <span style={{ marginRight: '8px' }}>•</span>
        <Link
          href="/auth/login"
          style={{
            color: BRAND_COLORS.teal,
            textDecoration: 'none',
            fontWeight: '500',
            marginRight: '8px',
          }}
        >
          👨‍🎓 Student Login
        </Link>
        <span style={{ marginRight: '8px' }}>•</span>
        <Link
          href="/"
          style={{
            color: BRAND_COLORS.teal,
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          🏠 Home
        </Link>
      </div>

      {/* Help Text */}
      <div
        style={{
          marginTop: '32px',
          maxWidth: '480px',
          textAlign: 'center',
          fontSize: '12px',
          color: BRAND_COLORS.gray,
          lineHeight: '1.6',
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
