'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  green: '#10B981',
};

const cohorts = [
  { id: 1, title: 'AI for Business Professionals', instructor: 'Sarah Chen', startDate: 'Sep 15, 2026', price: '£349' },
  { id: 2, title: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', startDate: 'Oct 1, 2026', price: '£699' },
  { id: 3, title: 'Prompt Engineering Masterclass', instructor: 'Jennifer Park', startDate: 'Sep 22, 2026', price: '£199' },
];

export default function EnrollCohortPage({ params }: { params: { id: string } }) {
  const cohortId = parseInt(params.id);
  const cohort = cohorts.find((c) => c.id === cohortId);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const stored = localStorage.getItem('studentId');
    if (!stored) {
      window.location.href = `/auth/login?redirect=/cohorts/${cohortId}`;
      return;
    }
    setStudentId(stored);
  }, [cohortId]);

  const handleEnroll = async () => {
    if (!studentId || !cohort) return;

    setEnrolling(true);
    setError(null);

    try {
      // Save enrollment to database via API
      const response = await fetch('/api/student/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          cohortId,
          cohortTitle: cohort.title,
          type: 'live',
          instructor: cohort.instructor,
          startDate: cohort.startDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Enrollment failed');
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/student/dashboard';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll');
      setEnrolling(false);
    }
  };

  if (!cohort) {
    return (
      <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px', textAlign: 'center' }}>
        <h1 style={{ color: BRAND_COLORS.navy }}>Cohort not found</h1>
        <Link href="/cohorts" style={{ color: BRAND_COLORS.teal }}>
          ← Back to Cohorts
        </Link>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: BRAND_COLORS.gray }}>Checking authentication...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: BRAND_COLORS.white, padding: '40px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 12px 0' }}>
            Enrollment Successful!
          </h1>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 8px 0' }}>
            Welcome to {cohort.title}
          </p>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
            Starts {cohort.startDate}
          </p>
          <Link
            href="/student/dashboard"
            style={{
              display: 'inline-block',
              background: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link href={`/cohorts/${cohortId}`} style={{ color: BRAND_COLORS.teal, textDecoration: 'none', fontWeight: '600' }}>
            ← Back to Cohort
          </Link>
        </div>

        <div style={{ background: BRAND_COLORS.white, padding: '40px', borderRadius: '12px', border: `1px solid ${BRAND_COLORS.border}` }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 12px 0' }}>
            Complete Your Enrollment
          </h1>
          <p style={{ color: BRAND_COLORS.gray, margin: '0 0 32px 0' }}>
            You're about to join <strong>{cohort.title}</strong>
          </p>

          {/* Cohort Summary */}
          <div style={{ background: BRAND_COLORS.light, padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                Cohort
              </p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                {cohort.title}
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                Led by
              </p>
              <p style={{ fontSize: '14px', color: BRAND_COLORS.darkGray, margin: '4px 0 0 0' }}>
                {cohort.instructor}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                  Starts
                </p>
                <p style={{ fontSize: '14px', color: BRAND_COLORS.darkGray, margin: '4px 0 0 0' }}>
                  {cohort.startDate}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                  Price
                </p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: BRAND_COLORS.teal, margin: '4px 0 0 0' }}>
                  {cohort.price}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f0fdf4', borderLeft: `4px solid ${BRAND_COLORS.green}` }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#065f46' }}>
              ✅ <strong>Live instruction</strong> from industry expert
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#065f46' }}>
              ✅ <strong>Peer learning</strong> with cohort members
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: '24px', padding: '16px', background: '#fee2e2', borderLeft: '4px solid #dc2626' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#7f1d1d' }}>
                ❌ {error}
              </p>
            </div>
          )}

          {/* Enroll Button */}
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            style={{
              width: '100%',
              background: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: enrolling ? 'not-allowed' : 'pointer',
              opacity: enrolling ? 0.6 : 1,
              marginBottom: '12px',
            }}
          >
            {enrolling ? 'Processing...' : 'Confirm Enrollment'}
          </button>

          <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, textAlign: 'center', margin: 0 }}>
            By enrolling, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
