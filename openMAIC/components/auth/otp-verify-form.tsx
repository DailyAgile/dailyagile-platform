'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, LoaderCircle, CheckCircle } from 'lucide-react';

interface OTPVerifyFormProps {
  email: string;
  onSuccess: () => void;
  onBackClick: () => void;
  onShowContactSupport?: () => void;
  isLoading?: boolean;
}

export function OTPVerifyForm({ email, onSuccess, onBackClick, onShowContactSupport, isLoading = false }: OTPVerifyFormProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for resend button
  useEffect(() => {
    if (!canResend && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Only allow numeric input
  const handleOtpChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setOtp(numericValue);
    if (error) setError('');
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || otp.length !== 6 || isSubmitting || isLoading) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, rememberDevice }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(onSuccess, 800);
      } else {
        setError(data.error || 'Invalid verification code. Please try again.');
        setOtp('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error verifying OTP:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setOtp('');
    setCanResend(false);
    setCountdown(60);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to resend code. Please try again.');
        setCanResend(true);
        setCountdown(0);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setCanResend(true);
      setCountdown(0);
      console.error('Error resending OTP:', err);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {success ? (
        <motion.div
          key="success"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CheckCircle size={32} color="#10b981" />
          </motion.div>
          <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: '500', color: '#059669', margin: '0' }}>
            ✓ Verified! Redirecting to your dashboard...
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Email Confirmation */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>
              Verification code sent to:
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
              {email}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* OTP Input */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '8px',
              }}>
                Enter 6-Digit Code
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '16px 48px 16px 16px',
                  border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  background: error ? 'rgba(239, 68, 68, 0.05)' : '#f8fafc',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                disabled={isSubmitting || isLoading}
                autoComplete="one-time-code"
                inputMode="numeric"
                onFocus={(e) => {
                  e.target.style.borderColor = error ? '#ef4444' : '#0891b2';
                  e.target.style.boxShadow = error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(8, 145, 178, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                disabled={otp.length !== 6 || isSubmitting || isLoading}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: 'calc(50% + 12px)',
                  transform: 'translateY(-50%)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '8px',
                  background: otp.length === 6 && !isSubmitting && !isLoading ? '#0891b2' : '#cbd5e1',
                  color: '#ffffff',
                  cursor: otp.length === 6 && !isSubmitting && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  padding: '0',
                }}
              >
                {isSubmitting || isLoading ? (
                  <LoaderCircle size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <p style={{ margin: '0', fontSize: '13px', color: '#dc2626' }}>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Remember Device */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(8, 145, 178, 0.05)',
            cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => !isSubmitting && !isLoading && (e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)')}
          onMouseLeave={(e) => !isSubmitting && !isLoading && (e.currentTarget.style.background = 'rgba(8, 145, 178, 0.05)')}
          >
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
                accentColor: '#0891b2',
              }}
              disabled={isSubmitting || isLoading}
            />
            <span style={{ fontSize: '14px', color: '#1e293b', margin: '0' }}>
              Remember this device for 30 days
            </span>
          </label>

          {/* Resend & Back Actions */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
            {!canResend ? (
              <div style={{ flex: 1, textAlign: 'center', color: '#64748b' }}>
                Resend code in {countdown}s
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: '#0891b2',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  textDecoration: 'underline',
                  font: 'inherit',
                  opacity: isSubmitting ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                Didn&apos;t receive code?
              </button>
            )}
            <button
              type="button"
              onClick={onBackClick}
              disabled={isSubmitting}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                font: 'inherit',
                opacity: isSubmitting ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              Use different email
            </button>
          </div>

          {/* Help Text */}
          <p style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#64748b',
            margin: '0',
            lineHeight: '1.5',
          }}>
            Check spam folder if needed. {' '}
            <button
              type="button"
              onClick={onShowContactSupport}
              style={{
                background: 'none',
                border: 'none',
                color: '#0891b2',
                cursor: 'pointer',
                fontWeight: '500',
                textDecoration: 'underline',
                font: 'inherit',
              }}
            >
              Get help
            </button>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
