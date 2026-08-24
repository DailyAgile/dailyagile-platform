'use client';

import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('EmailVerificationGate');

interface EmailVerificationGateProps {
  quizId: string;
  onVerified: (email: string, token: string) => void;
}

type Step = 'email-input' | 'code-verification' | 'verified';

export function EmailVerificationGate({ quizId, onVerified }: EmailVerificationGateProps) {
  const [step, setStep] = useState<Step>('email-input');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testCode, setTestCode] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Failed to send code');
        return;
      }

      // Store test code if in development
      if (data.test_code) {
        setTestCode(data.test_code);
      }

      setStep('code-verification');
    } catch (err) {
      log.error('Failed to send verification code:', err);
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setError('Verification code is required');
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

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Invalid verification code');
        return;
      }

      setStep('verified');
      onVerified(email, data.session_token);
    } catch (err) {
      log.error('Failed to verify code:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* STEP 1: Enter Email */}
        {step === 'email-input' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">Welcome to DailyAgile</h1>
              <p className="text-[#64748B]">Verify your email to take this quiz</p>
            </div>

            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-8 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] placeholder-[#64748B] focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]"
                  disabled={loading}
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>

              <p className="text-xs text-[#64748B] text-center">
                We'll send a 6-digit code to your email
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Verify Code */}
        {step === 'code-verification' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">Verify Your Email</h1>
              <p className="text-[#64748B]">
                We sent a 6-digit code to <span className="font-semibold">{email}</span>
              </p>
            </div>

            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-8 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] placeholder-[#64748B] focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2] text-center text-2xl tracking-widest"
                  disabled={loading}
                />
              </div>

              {testCode && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800">
                  <strong>Dev Mode:</strong> Test code: {testCode}
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="w-full px-4 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                onClick={() => {
                  setStep('email-input');
                  setCode('');
                  setError(null);
                }}
                className="w-full px-4 py-2 border border-[#0891B2] text-[#0891B2] rounded-lg font-semibold hover:bg-[#F0F7FA] transition-colors"
                disabled={loading}
              >
                Change Email
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Verified */}
        {step === 'verified' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#1E3A5F]">Email Verified!</h1>
            <p className="text-[#64748B]">You're all set. Starting your quiz...</p>
          </div>
        )}
      </div>
    </div>
  );
}
