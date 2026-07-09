'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { EmailLoginForm } from './email-login-form';
import { OTPVerifyForm } from './otp-verify-form';
import { ShieldCheck } from 'lucide-react';

export function ClassroomGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<{
    authenticated: boolean;
    loading: boolean;
  }>({ authenticated: false, loading: true });

  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setStatus({
            authenticated: !!data.authenticated,
            loading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ authenticated: false, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const needsAuth = !status.loading && !status.authenticated;

  if (status.loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <ShieldCheck className="h-8 w-8 text-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {needsAuth && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            {/* Background — subtle mesh gradient */}
            <div className="absolute inset-0 bg-background">
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
              <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: '128px 128px',
                }}
              />
            </div>

            {/* Content card */}
            <motion.div
              className="relative z-10 w-full max-w-sm mx-4"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl shadow-black/5 backdrop-blur-xl dark:bg-card/60 dark:shadow-black/20">
                {/* Icon */}
                <motion.div
                  className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ShieldCheck className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </motion.div>

                {/* Title */}
                <motion.h1
                  className="mb-1 text-center text-lg font-semibold tracking-tight text-foreground"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {authStep === 'email' ? 'Access Classroom' : 'Verify Code'}
                </motion.h1>

                <motion.p
                  className="mb-6 text-center text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  DailyAgile Platform
                </motion.p>

                {/* Forms */}
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
                      setStatus({ authenticated: true, loading: false });
                    }}
                    onBackClick={() => {
                      setAuthStep('email');
                      setSubmittedEmail('');
                    }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
