'use client';

/**
 * Student Email Verification Page
 * Students verify email before taking quiz
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentVerifyEmail');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get('email') || '';
  const quizId = searchParams.get('quiz_id') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (code.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to verify code');
      }

      log.info(`Email verified: ${email}`);

      // Store email and redirect to quiz
      localStorage.setItem('student_email', email);
      router.push(`/learn/practice/${quizId}`);
    } catch (err) {
      log.error('Verification failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !quizId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: BRAND_COLORS.gray }}>Invalid verification link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Verify Your Email</h1>
          <p style={{ color: BRAND_COLORS.gray }}>
            We sent a verification code to your email
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-md mx-auto px-4 py-12">
        <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-8 bg-white">
          <div style={{ backgroundColor: BRAND_COLORS.light }} className="p-4 rounded-lg mb-6">
            <p style={{ color: BRAND_COLORS.navy }} className="text-center font-semibold">
              {email}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-3 rounded-lg border bg-white text-center text-2xl tracking-widest focus:ring-2 font-mono"
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
              />
              <p style={{ color: BRAND_COLORS.gray }} className="text-sm mt-1">
                Check your email for the 6-digit code
              </p>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }} className="border rounded-lg p-3">
                <p style={{ color: '#991b1b' }} className="text-sm">
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
              className="w-full px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all mt-6"
            >
              {loading ? '⏳ Verifying...' : '✓ Verify & Start Quiz'}
            </button>

            <button
              onClick={() => router.back()}
              style={{ borderColor: BRAND_COLORS.teal, color: BRAND_COLORS.teal }}
              className="w-full px-6 py-2 border rounded-lg font-semibold hover:bg-opacity-10 transition-colors"
            >
              Go Back
            </button>
          </div>

          <div style={{ backgroundColor: BRAND_COLORS.light }} className="mt-6 p-4 rounded-lg text-sm text-center">
            <p style={{ color: BRAND_COLORS.gray }}>
              Check your spam folder if you don't see the email
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
