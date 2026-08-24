'use client';

/**
 * Student Login Page
 * Email/password login with spam prevention
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentLogin');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Login failed');
      }

      log.info(`Student logged in: ${email}`);

      // Store token and redirect to quizzes
      localStorage.setItem('student_token', result.data?.token);
      localStorage.setItem('student_email', email);
      localStorage.setItem('student_id', result.data?.student_id);

      router.push('/learn/quizzes');
    } catch (err) {
      log.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media (max-width: 640px) {
          [data-login-header] {
            padding-top: 24px !important;
            padding-bottom: 24px !important;
          }
          [data-login-header] h1 {
            font-size: 28px !important;
          }
          [data-login-form] {
            padding: 24px !important;
            border-radius: 12px;
          }
          [data-form-field] input {
            padding: 12px 16px !important;
            height: 44px !important;
            font-size: 16px;
          }
          [data-password-toggle] {
            width: 44px !important;
            height: 44px !important;
            padding: 8px !important;
            font-size: 20px;
          }
        }
        @media (min-width: 641px) {
          [data-login-form] {
            padding: 32px;
          }
          [data-form-field] input {
            padding: 10px 16px;
            height: 40px;
            font-size: 14px;
          }
          [data-password-toggle] {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }
        }
      `}</style>
      {/* Header */}
      <div data-login-header style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-6 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold">Student Login</h1>
          <p style={{ color: BRAND_COLORS.gray }}>Access your quizzes and track progress</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-12">
        <div data-login-form style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-8 w-full max-w-md bg-white shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div data-form-field>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2 focus:ring-offset-0"
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div data-form-field>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ borderColor: BRAND_COLORS.border }}
                  className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2 focus:ring-offset-0"
                  onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-password-toggle
                  className="absolute right-3 top-2 text-sm"
                  style={{
                    color: BRAND_COLORS.teal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    transition: 'all 0.2s ease',
                  }}
                  onTouchStart={(e) => e.currentTarget.style.opacity = '0.7'}
                  onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }} className="border rounded-lg p-3">
                <p style={{ color: '#991b1b' }} className="text-sm">
                  ⚠️ {error}
                </p>
              </div>
            )}

            {/* Login Button - Responsive height */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                backgroundColor: BRAND_COLORS.teal,
                color: 'white',
                height: 'auto',
                minHeight: '44px',
                marginTop: '24px',
              }}
              className="w-full px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              onTouchStart={(e) => !loading && (e.currentTarget.style.opacity = '0.7')}
              onTouchEnd={(e) => !loading && (e.currentTarget.style.opacity = '1')}
            >
              {loading ? '⏳ Logging in...' : '🔓 Login'}
            </button>

            {/* Sign Up Link */}
            <div style={{ backgroundColor: BRAND_COLORS.light }} className="p-4 rounded-lg text-center">
              <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
                Don't have an account?{' '}
                <Link href="/auth/student-signup" style={{ color: BRAND_COLORS.teal }} className="font-semibold hover:underline">
                  Sign up here
                </Link>
              </p>
            </div>
          </form>

          {/* Info Box */}
          <div style={{ backgroundColor: BRAND_COLORS.light }} className="mt-6 p-4 rounded-lg">
            <p style={{ color: BRAND_COLORS.navy }} className="font-semibold text-sm mb-2">
              Why login?
            </p>
            <ul style={{ color: BRAND_COLORS.gray }} className="text-sm space-y-1">
              <li>✓ Track your quiz progress</li>
              <li>✓ Save your scores and certificates</li>
              <li>✓ Get personalized recommendations</li>
              <li>✓ Prevent spam and unauthorized access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
