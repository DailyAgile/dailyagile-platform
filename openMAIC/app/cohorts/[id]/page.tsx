'use client';

import Link from 'next/link';
import { useState } from 'react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  green: '#16a34a',
};

const cohorts = [
  {
    id: 1,
    title: 'AI for Business Professionals',
    instructor: 'Sarah Chen',
    instructorBio: 'AI strategist with 10+ years in enterprise AI implementation',
    startDate: 'Sep 15, 2026',
    duration: '6 weeks',
    pace: 'Live, 2 sessions/week',
    capacity: '25 seats',
    availability: 3,
    price: '£349',
    schedule: [
      { day: 'Mondays', time: '6:00 PM - 7:30 PM UTC' },
      { day: 'Thursdays', time: '6:00 PM - 7:30 PM UTC' },
    ],
  },
  {
    id: 2,
    title: 'AI Engineer Bootcamp',
    instructor: 'Marcus Johnson',
    instructorBio: 'ML engineer at leading AI company, author of MLOps guide',
    startDate: 'Oct 1, 2026',
    duration: '10 weeks',
    pace: 'Live, 3 sessions/week',
    capacity: '20 seats',
    availability: 8,
    price: '£699',
    schedule: [
      { day: 'Mondays', time: '7:00 PM - 8:30 PM UTC' },
      { day: 'Wednesdays', time: '7:00 PM - 8:30 PM UTC' },
      { day: 'Fridays', time: '7:00 PM - 8:30 PM UTC' },
    ],
  },
  {
    id: 3,
    title: 'Prompt Engineering Masterclass',
    instructor: 'Jennifer Park',
    instructorBio: 'Prompt engineering expert, worked with OpenAI and Anthropic',
    startDate: 'Sep 22, 2026',
    duration: '4 weeks',
    pace: 'Live, 1 session/week',
    capacity: '30 seats',
    availability: 12,
    price: '£199',
    schedule: [
      { day: 'Saturdays', time: '3:00 PM - 5:00 PM UTC' },
    ],
  },
];

export default function CohortDetailPage({ params }: { params: { id: string } }) {
  const cohortId = parseInt(params.id);
  const cohort = cohorts.find((c) => c.id === cohortId);
  const [enrolling, setEnrolling] = useState(false);

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

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light }}>
      {/* Header */}
      <header
        style={{
          background: BRAND_COLORS.white,
          borderBottom: `1px solid ${BRAND_COLORS.border}`,
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/cohorts"
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: BRAND_COLORS.teal,
              textDecoration: 'none',
            }}
          >
            ← Back to Cohorts
          </Link>
          <Link
            href="/auth/login"
            style={{
              background: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              padding: '10px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
          {/* Left: Cohort Details */}
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 8px 0' }}>
              {cohort.title}
            </h1>
            <p style={{ fontSize: '16px', color: BRAND_COLORS.gray, margin: '0 0 24px 0' }}>
              Led by <strong>{cohort.instructor}</strong>
            </p>

            {/* Instructor Bio */}
            <div style={{ background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', marginBottom: '24px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 8px 0' }}>
                About Your Instructor
              </h2>
              <p style={{ color: BRAND_COLORS.darkGray, margin: 0 }}>
                {cohort.instructorBio}
              </p>
            </div>

            {/* Schedule */}
            <div style={{ background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', marginBottom: '24px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 16px 0' }}>
                Weekly Schedule
              </h2>
              {cohort.schedule.map((slot, i) => (
                <div key={i} style={{ marginBottom: i < cohort.schedule.length - 1 ? '12px' : 0 }}>
                  <p style={{ margin: 0, color: BRAND_COLORS.darkGray }}>
                    <strong>{slot.day}</strong>: {slot.time}
                  </p>
                </div>
              ))}
            </div>

            {/* Learning Outcomes */}
            <div style={{ background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 16px 0' }}>
                What to Expect
              </h2>
              <ul style={{ margin: 0, paddingLeft: '20px', color: BRAND_COLORS.darkGray' }}>
                <li style={{ marginBottom: '8px' }}>Live instruction from industry expert</li>
                <li style={{ marginBottom: '8px' }}>Interactive Q&A sessions</li>
                <li style={{ marginBottom: '8px' }}>Peer learning with cohort members</li>
                <li style={{ marginBottom: '8px' }}>Access to recordings for future review</li>
                <li>Credly certificate upon completion</li>
              </ul>
            </div>
          </div>

          {/* Right: Enrollment Card */}
          <div>
            <div
              style={{
                background: BRAND_COLORS.white,
                padding: '24px',
                borderRadius: '12px',
                border: `2px solid ${BRAND_COLORS.teal}`,
                position: 'sticky',
                top: '100px',
              }}
            >
              {/* Availability Badge */}
              <div
                style={{
                  background: cohort.availability > 0 ? '#ecfdf5' : '#fee2e2',
                  border: `1px solid ${cohort.availability > 0 ? BRAND_COLORS.green : '#fca5a5'}`,
                  color: cohort.availability > 0 ? '#065f46' : '#7f1d1d',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                {cohort.availability > 0 ? `${cohort.availability} seats available` : 'Waitlist only'}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                  Price
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: BRAND_COLORS.teal, margin: '8px 0 0 0' }}>
                  {cohort.price}
                </p>
              </div>

              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Starts
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                    {cohort.startDate}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Duration
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                    {cohort.duration}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEnrolling(true);
                  window.location.href = `/auth/login?redirect=/cohorts/${cohortId}/enroll`;
                }}
                disabled={enrolling}
                style={{
                  width: '100%',
                  background: BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: enrolling ? 'not-allowed' : 'pointer',
                  opacity: enrolling ? 0.6 : 1,
                  marginBottom: '12px',
                }}
              >
                {enrolling ? 'Redirecting...' : 'Enroll Now'}
              </button>

              <p
                style={{
                  fontSize: '12px',
                  color: BRAND_COLORS.gray,
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                💬 Live support included
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
