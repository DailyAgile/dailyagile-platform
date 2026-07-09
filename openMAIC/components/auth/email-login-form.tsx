'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Mail, LoaderCircle } from 'lucide-react';

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
      className="space-y-4 w-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Mail className="h-5 w-5" />
        </div>
        <input
          ref={inputRef}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          className={`
            w-full rounded-xl border bg-background/60 px-4 py-3 pl-10 pr-12 text-sm
            outline-none transition-all duration-200
            placeholder:text-muted-foreground/50
            focus:border-primary/40 focus:ring-2 focus:ring-primary/10
            ${error ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10' : 'border-border/60'}
          `}
          disabled={isSubmitting || isLoading}
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={!email || isSubmitting || isLoading}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center
            justify-center rounded-lg transition-all duration-200
            ${email && !isSubmitting && !isLoading ? 'bg-primary text-primary-foreground hover:opacity-90 cursor-pointer' : 'text-muted-foreground/30 cursor-default'}
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

      <p className="text-center text-xs text-muted-foreground">
        We'll send a verification code to your email
      </p>
    </motion.form>
  );
}
