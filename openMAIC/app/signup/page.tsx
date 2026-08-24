'use client';

/**
 * Student Signup Page
 * Email/password registration with email verification
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentSignup');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function StudentSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreed) {
      setError('Please agree to the terms and conditions');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/auth/student/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error?.message || result.message || JSON.stringify(result);
        log.error(`API Error (${response.status}):`, errorMsg);
        throw new Error(errorMsg);
      }

      log.info(`Student signed up: ${formData.email}`);

      // Store data and redirect to login
      localStorage.setItem('student_email', formData.email);
      router.push('/auth/verify-email?email=' + encodeURIComponent(formData.email));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error('Signup failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-6 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold">Student Registration</h1>
          <p style={{ color: BRAND_COLORS.gray }}>Join DailyAgile and start learning</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-12">
        <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-8 w-full max-w-md bg-white shadow-sm">
          <form onSubmit={handleSignup} className="space-y-4">
            {/* First Name */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={loading}
              />
            </div>

            {/* Last Name */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{ borderColor: BRAND_COLORS.border }}
                  className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                  onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-sm"
                  style={{ color: BRAND_COLORS.teal }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p style={{ color: BRAND_COLORS.gray }} className="text-xs mt-1">
                Minimum 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={loading}
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
                style={{ accentColor: BRAND_COLORS.teal }}
                className="mt-1"
              />
              <label htmlFor="agree" style={{ color: BRAND_COLORS.gray }} className="text-sm">
                I agree to the{' '}
                <span style={{ color: BRAND_COLORS.teal }} className="font-semibold">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span style={{ color: BRAND_COLORS.teal }} className="font-semibold">
                  Privacy Policy
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }} className="border rounded-lg p-3">
                <p style={{ color: '#991b1b' }} className="text-sm">
                  ⚠️ {error}
                </p>
              </div>
            )}

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
              className="w-full px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all mt-6"
            >
              {loading ? '⏳ Creating account...' : '✓ Create Account'}
            </button>

            {/* Login Link */}
            <div style={{ backgroundColor: BRAND_COLORS.light }} className="p-4 rounded-lg text-center">
              <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
                Already have an account?{' '}
                <Link href="/auth/student-login" style={{ color: BRAND_COLORS.teal }} className="font-semibold hover:underline">
                  Log in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
