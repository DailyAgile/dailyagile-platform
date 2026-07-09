'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { EmailLoginForm } from '@/components/auth/email-login-form';
import { OTPVerifyForm } from '@/components/auth/otp-verify-form';

export default function LoginPage() {
  const router = useRouter();
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        if (data.authenticated) {
          router.replace('/classroom');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 20% 40%, var(--primary) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% 20%, oklch(0.6 0.15 280) 0%, transparent 50%),
              radial-gradient(ellipse 50% 50% at 60% 80%, oklch(0.5 0.12 300) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6">
            <img
              src="/assets/dailyagile_logo.png"
              alt="DailyAgile"
              className="h-12 w-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Cambria, serif' }}>
            Access Classroom
          </h1>
          <p className="text-muted-foreground">
            Sign in with your email to get started
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl shadow-black/5 backdrop-blur-xl dark:bg-card/60 dark:shadow-black/20">
          {authStep === 'email' ? (
            <EmailLoginForm
              onEmailSubmitted={(email) => {
                setSubmittedEmail(email);
                setAuthStep('otp');
              }}
            />
          ) : (
            <OTPVerifyForm
              email={submittedEmail}
              onSuccess={() => {
                router.replace('/classroom');
              }}
              onBackClick={() => {
                setAuthStep('email');
                setSubmittedEmail('');
              }}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Need help?{' '}
          <a href="mailto:support@dailyagile.com" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </motion.div>
    </div>
  );
}
