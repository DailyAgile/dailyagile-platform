'use client';

/**
 * Dashboard Page - Smart routing based on authentication
 * Shows login options if not authenticated
 * Shows instructor/student dashboards if authenticated
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if instructor or student is authenticated
    const instructorToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('instructorToken') ||
          localStorage.getItem('token') ||
          localStorage.getItem('auth_token')
        : null;

    const studentToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('studentToken')
        : null;

    // If instructor is logged in, show instructor dashboard
    if (instructorToken) {
      router.push('/teach/quiz/management');
      return;
    }

    // If student is logged in, show student dashboard
    if (studentToken) {
      router.push('/learn/quizzes');
      return;
    }

    // If not logged in, redirect to home with login options
    router.push('/');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F7FA',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '3px solid #0891B2',
            borderRadius: '50%',
            borderTop: '3px solid #F0F7FA',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <h2 style={{ color: '#1E3A5F', margin: '0 0 8px 0' }}>Loading...</h2>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
