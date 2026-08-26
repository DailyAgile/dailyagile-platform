'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';

const log = createLogger('ResultsPage');

export default function ResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const quizId = params.quizId as string;
  const attemptId = params.attemptId as string;

  // Parse results from query params (sent from quiz player)
  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '100', 10);
  const percentage = parseInt(searchParams.get('percentage') || '0', 10);
  const passed = searchParams.get('passed') === 'true';
  const timeTaken = parseInt(searchParams.get('time') || '0', 10);

  const BRAND_COLORS = {
    navy: '#1E3A5F',
    teal: '#0891B2',
    orange: '#EA580C',
    light: '#F0F7FA',
    gray: '#64748B',
    white: '#FFFFFF',
    success: '#059669',
    danger: '#dc2626',
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  log.info(`Results page: ${score}/${total} (${percentage}%), passed: ${passed}`);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BRAND_COLORS.light }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: BRAND_COLORS.white,
          borderBottom: `1px solid #e5e7eb`,
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '48px', width: 'auto' }} />
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/quizzes" style={{ color: BRAND_COLORS.teal, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              Back to Quizzes
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Results Card */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          {/* Status Icon */}
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            {passed ? '🎉' : '📝'}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 8px 0',
            }}
          >
            {passed ? 'Excellent!' : 'Quiz Complete'}
          </h1>

          {/* Status */}
          <p
            style={{
              fontSize: '16px',
              color: passed ? BRAND_COLORS.success : BRAND_COLORS.danger,
              fontWeight: '600',
              margin: '0 0 32px 0',
            }}
          >
            {passed ? '✓ Passed' : '✗ Did Not Pass'}
          </p>

          {/* Score Breakdown */}
          <div
            style={{
              backgroundColor: BRAND_COLORS.light,
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '32px',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>
                Score
              </p>
              <p
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: BRAND_COLORS.navy,
                  margin: '0',
                }}
              >
                {percentage}%
              </p>
              <p style={{ fontSize: '14px', color: BRAND_COLORS.gray, margin: '8px 0 0 0' }}>
                {score} out of {total} points
              </p>
            </div>

            <div
              style={{
                borderTop: `1px solid #d1d5db`,
                paddingTop: '16px',
                marginTop: '16px',
              }}
            >
              <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>
                Time Taken
              </p>
              <p
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: BRAND_COLORS.teal,
                  margin: '0',
                }}
              >
                {formatTime(timeTaken)}
              </p>
            </div>
          </div>

          {/* Passing Score Info */}
          <div
            style={{
              backgroundColor: passed ? '#d1fae5' : '#fee2e2',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '32px',
              border: `1px solid ${passed ? '#a7f3d0' : '#fecaca'}`,
            }}
          >
            <p
              style={{
                fontSize: '14px',
                color: passed ? '#065f46' : '#7f1d1d',
                margin: '0',
                lineHeight: '1.6',
              }}
            >
              {passed
                ? '🎯 You passed! Your hard work paid off. You\'ve demonstrated a solid understanding of the material.'
                : '📚 Keep practicing! Review the material and try again to improve your score.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              onClick={() => router.push('/quizzes')}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.opacity = '1';
              }}
            >
              Back to Quiz Hub
            </button>

            <Link href="/" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: BRAND_COLORS.white,
                  color: BRAND_COLORS.navy,
                  border: `2px solid ${BRAND_COLORS.navy}`,
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = BRAND_COLORS.light;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = BRAND_COLORS.white;
                }}
              >
                Go Home
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
