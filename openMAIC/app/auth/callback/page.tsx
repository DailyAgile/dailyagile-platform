'use client';

/**
 * Auth Callback Page
 * Handles magic link redirects from Supabase Auth
 * User clicks link in email → redirects here → logged in → redirects to dashboard
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/client/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('AuthCallback');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing login...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Get the session from the URL (Supabase automatically processes the magic link)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          setError(`Authentication failed: ${sessionError.message}`);
          log.error('Session error:', sessionError);
          return;
        }

        if (!session) {
          setError('No active session. Please try logging in again.');
          log.warn('No session found after magic link redirect');
          return;
        }

        log.info(`✅ Instructor logged in: ${session.user.email}`);
        setStatus('Login successful! Redirecting to dashboard...');

        // Redirect to instructor dashboard
        setTimeout(() => {
          router.push('/teach/dashboard');
        }, 500);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        log.error('Callback error:', err);
      }
    };

    handleCallback();
  }, [router]);

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
          color: '#FFFFFF',
          padding: '16px 24px',
          textAlign: 'center',
          minHeight: '60px',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: '700' }}>DailyAgile</div>
      </div>

      {/* Content */}
      <div
        style={{
          marginTop: '80px',
          textAlign: 'center',
        }}
      >
        {error ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: BRAND_COLORS.navy,
                margin: '0 0 8px 0',
              }}
            >
              Login Failed
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#991B1B',
                margin: '0 0 24px 0',
              }}
            >
              {error}
            </p>
            <a
              href="/auth/instructors"
              style={{
                color: BRAND_COLORS.teal,
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Try again
            </a>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>⏳</div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: BRAND_COLORS.navy,
                margin: '0 0 8px 0',
              }}
            >
              {status}
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: BRAND_COLORS.gray,
                margin: '0',
              }}
            >
              Please wait while we verify your login...
            </p>
          </>
        )}
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
