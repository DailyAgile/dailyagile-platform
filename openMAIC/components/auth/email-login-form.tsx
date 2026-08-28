'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowRight, LoaderCircle } from 'lucide-react';

interface EmailLoginFormProps {
  onEmailSubmitted: (email: string) => void;
  isLoading?: boolean;
}

export function EmailLoginForm({ onEmailSubmitted, isLoading = false }: EmailLoginFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || isSubmitting || isLoading) return;

    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        onEmailSubmitted(email.toLowerCase());
      } else {
        setError(data.error || 'Failed to send verification code. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error sending OTP:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      {/* Email Input */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '8px',
        }}>
          Enter Your Instructor Email
        </label>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Mail size={18} />
          </div>
          <input
            ref={inputRef}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '15px',
              fontFamily: 'inherit',
              outline: 'none',
              background: error ? 'rgba(239, 68, 68, 0.05)' : '#f8fafc',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = error ? '#ef4444' : '#0891b2';
              e.target.style.boxShadow = error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(8, 145, 178, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
            disabled={isSubmitting || isLoading}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={!email || isSubmitting || isLoading}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: '8px',
              background: email && !isSubmitting && !isLoading ? '#0891b2' : '#cbd5e1',
              color: '#ffffff',
              cursor: email && !isSubmitting && !isLoading ? 'pointer' : 'not-allowed',
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

      {/* Help Text */}
      <div style={{
        textAlign: 'center',
        fontSize: '13px',
        color: '#64748b',
        lineHeight: '1.5',
      }}>
        <p style={{ margin: '0 0 12px 0' }}>
          We&apos;ll send a 6-digit verification code to your email
        </p>
        <p style={{ margin: '0' }}>
          <span>Don&apos;t have access to your email? </span>
          <button
            type="button"
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
            Recover your account
          </button>
        </p>
      </div>
    </motion.form>
  );
}
