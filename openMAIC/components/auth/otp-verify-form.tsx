'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShieldCheck, LoaderCircle, CheckCircle } from 'lucide-react';

interface OTPVerifyFormProps {
  email: string;
  onSuccess: () => void;
  onBackClick: () => void;
  isLoading?: boolean;
}

export function OTPVerifyForm({ email, onSuccess, onBackClick, isLoading = false }: OTPVerifyFormProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
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
        body: JSON.stringify({ email, otp }),
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
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </motion.div>
          <p className="text-center text-sm font-medium text-emerald-600">
            Welcome! Redirecting to classroom...
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          className="space-y-4 w-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-2">
            <p className="text-sm text-muted-foreground">
              Verification code sent to
            </p>
            <p className="text-sm font-medium text-foreground">{email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                maxLength={6}
                className={`
                  w-full rounded-xl border bg-background/60 px-4 py-3 text-center text-2xl font-bold
                  outline-none transition-all duration-200 tracking-widest
                  placeholder:text-muted-foreground/50
                  focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                  ${error ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10' : 'border-border/60'}
                `}
                disabled={isSubmitting || isLoading}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              <button
                type="submit"
                disabled={otp.length !== 6 || isSubmitting || isLoading}
                className={`
                  absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center
                  justify-center rounded-lg transition-all duration-200
                  ${otp.length === 6 && !isSubmitting && !isLoading ? 'bg-primary text-primary-foreground hover:opacity-90 cursor-pointer' : 'text-muted-foreground/30 cursor-default'}
                `}
              >
                {isSubmitting || isLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  className="text-center text-sm text-destructive"
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </form>

          <div className="flex gap-2 text-center text-xs">
            {!canResend ? (
              <p className="flex-1 text-muted-foreground">
                Resend code in {countdown}s
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting}
                className="flex-1 text-primary hover:underline font-medium disabled:opacity-50"
              >
                Resend code
              </button>
            )}
            <button
              type="button"
              onClick={onBackClick}
              disabled={isSubmitting}
              className="flex-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
