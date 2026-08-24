'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  light: '#F0F7FA',
};

export default function QuizAcademyPage() {
  const router = useRouter();

  useEffect(() => {
    // Check user role and redirect to appropriate quiz page
    const instructorToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('instructorToken') ||
          localStorage.getItem('token') ||
          localStorage.getItem('auth_token')
        : null;

    if (instructorToken) {
      // Instructor: go to quiz management
      router.push('/teach/quiz/management');
    } else {
      // Student: go to student quiz page (to be created)
      router.push('/learn/quizzes');
    }
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Link
          href="/academy"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: BRAND_COLORS.teal,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          ← Back to Academy
        </Link>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            marginBottom: '12px',
          }}
        >
          🎯 Quiz Tool
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: BRAND_COLORS.gray,
            marginBottom: '40px',
          }}
        >
          Redirecting to your quiz dashboard...
        </p>

        <div
          style={{
            background: BRAND_COLORS.white,
            borderRadius: '12px',
            border: `1px solid ${BRAND_COLORS.border}`,
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
              fontSize: '40px',
              marginBottom: '20px',
            }}
          >
            ⏳
          </div>
          <p
            style={{
              fontSize: '14px',
              color: BRAND_COLORS.gray,
            }}
          >
            Loading your quiz dashboard...
          </p>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
