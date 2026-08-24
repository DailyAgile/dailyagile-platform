'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockAuthApi } from '@/lib/api/mock-api';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('EmailVerify');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#D1FAE5',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  errorBorder: '#FCA5A5',
};

type Status = 'loading' | 'success' | 'error' | 'expired';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const token = searchParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('No verification token found. Please check your email link.');
          return;
        }

        log.info(`Verifying token: ${token}`);

        // Try real API first, fallback to mock
        const response = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
          method: 'GET'
        }).catch(async () => {
          // Fallback to mock API
          const result = await mockAuthApi.verifyToken(token);
          return {
            ok: result.success,
            status: result.statusCode || (result.success ? 200 : 401),
            json: async () => result
          } as Response;
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            setStatus('expired');
            setMessage('This login link has expired. Please request a new one.');
          } else {
            setStatus('error');
            setMessage(data.error?.message || 'Verification failed. Please try again.');
          }
          return;
        }

        if (data.success && data.data?.studentId) {
          log.info(`Verified student: ${data.data.studentId}`);
          setStudentId(data.data.studentId);

          // Store in localStorage and redirect
          localStorage.setItem('studentId', data.data.studentId);
          localStorage.setItem('studentEmail', data.data.email);

          setStatus('success');
          setMessage('Email verified! Redirecting to your dashboard...');

          // Redirect after 2 seconds
          setTimeout(() => {
            router.push('/learn/assignments');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Verification failed. Please try again.');
        }
      } catch (err) {
        log.error('Verification error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      }
    };

    verify();
  }, [searchParams, router]);

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
        <span style={{ fontSize: '24px' }}>📚</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>DailyAgile</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Accelerate Business Agility</div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          marginTop: '80px',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <>
            <div
              style={{
                display: 'inline-block',
                width: '48px',
                height: '48px',
                border: '4px solid ' + BRAND_COLORS.light,
                borderTopColor: BRAND_COLORS.teal,
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                marginBottom: '24px',
              }}
            />
            <h1
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.navy,
                fontSize: '24px',
                fontWeight: '700',
              }}
            >
              Verifying Email
            </h1>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.gray,
                fontSize: '14px',
              }}
            >
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h1
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.navy,
                fontSize: '24px',
                fontWeight: '700',
              }}
            >
              Email Verified!
            </h1>
            <div
              style={{
                backgroundColor: BRAND_COLORS.successBg,
                border: `1px solid ${BRAND_COLORS.successBorder}`,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
              }}
            >
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.success,
                  fontSize: '14px',
                }}
              >
                {message}
              </p>
            </div>
          </>
        )}

        {status === 'expired' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
            <h1
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.navy,
                fontSize: '24px',
                fontWeight: '700',
              }}
            >
              Link Expired
            </h1>
            <div
              style={{
                backgroundColor: BRAND_COLORS.errorBg,
                border: `1px solid ${BRAND_COLORS.errorBorder}`,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
              }}
            >
              <p
                style={{
                  margin: '0 0 12px 0',
                  color: BRAND_COLORS.error,
                  fontSize: '14px',
                }}
              >
                {message}
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/auth/login'}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                minHeight: '44px',
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Request New Link
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h1
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.navy,
                fontSize: '24px',
                fontWeight: '700',
              }}
            >
              Verification Failed
            </h1>
            <div
              style={{
                backgroundColor: BRAND_COLORS.errorBg,
                border: `1px solid ${BRAND_COLORS.errorBorder}`,
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
              }}
            >
              <p
                style={{
                  margin: '0 0 12px 0',
                  color: BRAND_COLORS.error,
                  fontSize: '14px',
                }}
              >
                {message}
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/auth/login'}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                minHeight: '44px',
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>

      {/* Help Text */}
      <div
        style={{
          marginTop: '24px',
          maxWidth: '480px',
          textAlign: 'center',
          fontSize: '12px',
          color: BRAND_COLORS.gray,
        }}
      >
        Need help? Contact support@dailyagile.com
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
