'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
};

export default function TestLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleTestLogin = async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await fetch('/api/test/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('✅ Test instructor session created! Redirecting...');
        setTimeout(() => {
          router.push('/teach/quiz/management');
        }, 1500);
      } else {
        setMessage('❌ Login failed');
      }
    } catch (error) {
      setMessage('❌ Error creating test session');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND_COLORS.light,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧪</div>

        <h1 style={{ color: BRAND_COLORS.navy, margin: '0 0 10px 0', fontSize: '24px' }}>
          Test Instructor Login
        </h1>

        <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
          Create a temporary instructor session to test delete, publish, and unpublish operations
        </p>

        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: `1px solid #F59E0B`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '12px',
            color: '#92400E',
            lineHeight: '1.5',
          }}
        >
          ⚠️ <strong>Development Only</strong> - This test login endpoint is for development/testing purposes only. Remove in production.
        </div>

        <button
          onClick={handleTestLogin}
          disabled={loading}
          style={{
            backgroundColor: loading ? BRAND_COLORS.gray : BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            width: '100%',
            transition: 'all 0.3s ease',
          }}
        >
          {loading ? 'Creating session...' : '🔓 Create Test Instructor Session'}
        </button>

        {message && (
          <p
            style={{
              marginTop: '16px',
              fontSize: '14px',
              color: message.includes('✅') ? BRAND_COLORS.success : BRAND_COLORS.error,
              fontWeight: '600',
            }}
          >
            {message}
          </p>
        )}

        <p style={{ color: BRAND_COLORS.gray, margin: '24px 0 0 0', fontSize: '12px' }}>
          After login, you'll be able to test delete, publish, and unpublish operations in Quiz Management.
        </p>
      </div>
    </div>
  );
}
