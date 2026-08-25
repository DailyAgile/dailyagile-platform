'use client';

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
  green: '#16a34a',
};

export default function IltPage() {
  const sessions = [
    {
      id: 1,
      courseId: 'ai-business',
      title: 'AI for Business Professionals',
      instructor: 'Sarah Chen',
      startDate: 'Sep 15, 2026',
      duration: '6 weeks',
      pace: 'Live, 2 sessions/week',
      capacity: '25 seats',
      price: '£349',
      salePrice: '£299',
      image: '👥',
    },
    {
      id: 2,
      courseId: 'ai-engineer',
      title: 'AI Engineer Bootcamp',
      instructor: 'Marcus Johnson',
      startDate: 'Oct 1, 2026',
      duration: '10 weeks',
      pace: 'Live, 3 sessions/week',
      capacity: '20 seats',
      price: '£699',
      salePrice: '£599',
      image: '🚀',
    },
    {
      id: 3,
      courseId: 'prompt-engineering',
      title: 'Prompt Engineering Masterclass',
      instructor: 'Jennifer Park',
      startDate: 'Sep 22, 2026',
      duration: '4 weeks',
      pace: 'Live, 1 session/week',
      capacity: '30 seats',
      price: '£199',
      salePrice: '£149',
      image: '⚡',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light }}>
      {/* Header */}
      <header
        style={{
          background: BRAND_COLORS.white,
          borderBottom: `1px solid ${BRAND_COLORS.border}`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Back to DailyAgile home"
          >
            <img src="/assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '40px', width: 'auto' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: BRAND_COLORS.gray }}>
            <Link href="/" style={{ textDecoration: 'none', color: BRAND_COLORS.teal }}>Home</Link>
            <span>/</span>
            <span style={{ color: BRAND_COLORS.navy, fontWeight: '600' }}>Live Courses</span>
          </div>
        </div>

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
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
          onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.teal)}
        >
          Sign In / Enroll
        </Link>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 12px 0',
            }}
          >
            Learn Live with Expert Instructors
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              margin: 0,
              maxWidth: '600px',
            }}
          >
            Join live training sessions for interactive instruction, peer learning, and real-time Q&A. Limited seats available.
          </p>
        </div>

        {/* Live Sessions Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginTop: '32px',
          }}
        >
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                background: BRAND_COLORS.white,
                borderRadius: '12px',
                border: `2px solid ${BRAND_COLORS.teal}`,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{session.image}</div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: BRAND_COLORS.navy,
                  margin: '0 0 4px 0',
                }}
              >
                {session.title}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: BRAND_COLORS.gray,
                  margin: '0 0 16px 0',
                }}
              >
                Led by <strong>{session.instructor}</strong>
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: `1px solid ${BRAND_COLORS.border}`,
                }}
              >
                <div>
                  <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Start Date
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                    {session.startDate}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Duration
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                    {session.duration}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: `1px solid ${BRAND_COLORS.border}`,
                }}
              >
                <div>
                  <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Pace
                  </p>
                  <p style={{ fontSize: '13px', color: BRAND_COLORS.darkGray, margin: '4px 0 0 0' }}>
                    {session.pace}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Class Size
                  </p>
                  <p style={{ fontSize: '13px', color: BRAND_COLORS.darkGray, margin: '4px 0 0 0' }}>
                    {session.capacity}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {session.sale ? (
                    <>
                      <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textDecoration: 'line-through' }}>
                        Regular: {session.price}
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.green, margin: '4px 0 0 0' }}>
                        Sale: {session.salePrice || session.price}
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.teal, margin: 0 }}>
                      {session.price}
                    </p>
                  )}
                </div>
                <Link
                  href={`/ilt/courses/${session.courseId}`}
                  style={{
                    background: BRAND_COLORS.teal,
                    color: BRAND_COLORS.white,
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.teal)}
                >
                  View Schedule
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div
          style={{
            marginTop: '60px',
            padding: '40px 24px',
            background: BRAND_COLORS.white,
            borderRadius: '12px',
            border: `1px solid ${BRAND_COLORS.border}`,
          }}
        >
          <h3
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 20px 0',
            }}
          >
            Why Join a Live Session?
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              { icon: '👥', title: 'Peer Learning', desc: 'Learn with professionals from diverse backgrounds' },
              { icon: '💬', title: 'Live Q&A', desc: 'Ask questions and get real-time answers' },
              { icon: '🎯', title: 'Structured Path', desc: 'Guided learning with clear milestones' },
              { icon: '🏆', title: 'Community', desc: 'Network with future colleagues and mentors' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: BRAND_COLORS.navy, margin: '0 0 4px 0' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '14px', color: BRAND_COLORS.gray, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
