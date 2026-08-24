'use client';

/**
 * Reset Password Page
 * Step 2: Set new password with token from email link
 *
 * Features:
 * - Password strength indicator with requirement checklist
 * - Shows only unfulfilled requirements (live feedback)
 * - Confirm password with match validation
 * - Step indicator (Step 2 of 2)
 * - Expiry badge (1 hour)
 * - Sticky back button
 * - Mobile optimized
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorResetPassword');

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
  success: '#059669',
};

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(60);

  const token = searchParams.get('token');

  // ─────────────────────────────────────────────────────────────────
  // PASSWORD STRENGTH CALCULATION
  // ─────────────────────────────────────────────────────────────────
  const calculateStrength = (pwd: string): { level: StrengthLevel; score: number } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++;

    const levels: StrengthLevel[] = ['weak', 'fair', 'good', 'strong'];
    return { level: levels[Math.min(score, 3)], score };
  };

  const checkRequirement = (pwd: string, req: string): boolean => {
    switch (req) {
      case 'length':
        return pwd.length >= 8;  // Already 8+ minimum
      case 'uppercase':
        return /[A-Z]/.test(pwd);
      case 'lowercase':
        return /[a-z]/.test(pwd);
      case 'number':
        return /\d/.test(pwd);
      case 'special':
        return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
      default:
        return false;
    }
  };

  const strength = calculateStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const canSubmit = strength.score >= 2 && passwordsMatch;

  // ─────────────────────────────────────────────────────────────────
  // EXPIRY TIMER
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiryMinutes((prev) => Math.max(0, prev - 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // SUBMIT RESET PASSWORD
  // ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing reset link');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Both passwords are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (strength.score < 2) {
      setError('Password is too weak');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/instructor/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        log.warn('Password reset failed:', data);
        return;
      }

      log.info(`✅ Password reset successfully`);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/instructors?reset=success');
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      log.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.light, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, fontFamily: 'Cambria, serif', marginBottom: '12px' }}>
            Invalid Link
          </h1>
          <p style={{ fontSize: '14px', color: COLORS.gray, fontFamily: 'Calibri, sans-serif', marginBottom: '24px' }}>
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link
            href="/auth/instructors/forgot-password"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: COLORS.teal,
              color: COLORS.white,
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.light, display: 'flex', flexDirection: 'column' }}>
      {/* Back Button - Sticky */}
      <button
        onClick={() => router.push('/auth/instructors/forgot-password')}
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
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔑</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.navy, margin: '0 0 8px 0', fontFamily: 'Cambria, serif' }}>
              Create New Password
            </h1>
            <p style={{ fontSize: '16px', color: COLORS.gray, margin: 0, fontFamily: 'Calibri, sans-serif', lineHeight: '1.5' }}>
              Choose a strong password for your account
            </p>
          </div>

          {/* Step Indicator + Expiry */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '12px', fontFamily: 'Calibri, sans-serif' }}>
            <span style={{ color: COLORS.gray }}>Step 2 of 2</span>
            <span style={{ color: expiryMinutes < 5 ? COLORS.orange : COLORS.gray }}>
              ⏱ Expires in {expiryMinutes}m
            </span>
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Password Field */}
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
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray, fontSize: '16px' }}>
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoFocus
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
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
                {/* Show/Hide Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: COLORS.gray,
                    fontSize: '16px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: 0.7,
                  }}
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {Array(4)
                      .fill(null)
                      .map((_, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            backgroundColor:
                              i < strength.score
                                ? strength.level === 'weak'
                                  ? COLORS.error
                                  : strength.level === 'fair'
                                    ? COLORS.orange
                                    : strength.level === 'good'
                                      ? '#FBBF24'
                                      : COLORS.success
                                : COLORS.light,
                            transition: 'background-color 150ms ease',
                          }}
                        />
                      ))}
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: COLORS.gray, margin: '0 0 8px 0', fontFamily: 'Calibri, sans-serif', textTransform: 'capitalize' }}>
                    Strength: {strength.level}
                  </p>

                  {/* Requirements Checklist */}
                  <div style={{ fontSize: '12px', fontFamily: 'Calibri, sans-serif', color: COLORS.gray, lineHeight: '1.6' }}>
                    {!checkRequirement(password, 'length') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.error }}>
                        <span>✕</span> 8+ characters
                      </div>
                    )}
                    {!checkRequirement(password, 'uppercase') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.error }}>
                        <span>✕</span> Uppercase letter (A-Z)
                      </div>
                    )}
                    {!checkRequirement(password, 'lowercase') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.error }}>
                        <span>✕</span> Lowercase letter (a-z)
                      </div>
                    )}
                    {!checkRequirement(password, 'number') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.error }}>
                        <span>✕</span> Number (0-9)
                      </div>
                    )}
                    {!checkRequirement(password, 'special') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.error }}>
                        <span>✕</span> Special character (!@#$%^&*)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
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
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray, fontSize: '16px' }}>
                  🔒
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
                    border: `1px solid ${confirmPassword ? passwordsMatch ? COLORS.border : COLORS.error : COLORS.border}`,
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
                    e.currentTarget.style.borderColor = confirmPassword ? (passwordsMatch ? COLORS.border : COLORS.error) : COLORS.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {/* Match Indicator */}
                {confirmPassword && (
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>
                    {passwordsMatch ? '✓' : '✕'}
                  </div>
                )}
              </div>
              {/* Show/Hide Toggle for Confirm */}
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '54px',
                  top: '156px',
                  background: 'none',
                  border: 'none',
                  color: COLORS.gray,
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: 0.7,
                }}
              >
                {showConfirm ? '👁' : '👁‍🗨'}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              style={{
                height: '48px',
                padding: '12px 16px',
                backgroundColor: canSubmit && !loading ? COLORS.navy : COLORS.gray,
                color: COLORS.white,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'Calibri, sans-serif',
                cursor: loading || !canSubmit ? 'not-allowed' : 'pointer',
                opacity: loading || !canSubmit ? 0.6 : 1,
                transition: 'all 150ms ease',
                transform: 'translateY(0)',
                marginTop: '8px',
              }}
              onMouseEnter={(e) => {
                if (!loading && canSubmit) {
                  e.currentTarget.style.backgroundColor = '#152A46';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(30, 58, 95, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.navy;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>

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
            <span>Your password is secure. We use bcrypt encryption.</span>
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
      `}</style>
    </div>
  );
}
