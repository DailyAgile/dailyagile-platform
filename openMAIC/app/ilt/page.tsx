'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

// Responsive styles
const styles = `
  @media (max-width: 768px) {
    .ilt-header { padding: 12px 16px !important; }
    .ilt-logo { height: 45px !important; }
    .ilt-breadcrumb { font-size: 12px !important; }
    .ilt-sign-in { padding: 8px 12px !important; font-size: 12px !important; }
    .ilt-main-title { font-size: 24px !important; }
    .ilt-main-description { font-size: 14px !important; }
    .ilt-card { padding: 20px !important; }
    .ilt-card-title { font-size: 18px !important; }
    .ilt-card-instructor { font-size: 13px !important; }
    .ilt-card-label { font-size: 10px !important; }
    .ilt-card-value { font-size: 13px !important; }
    .ilt-card-price { font-size: 18px !important; }
    .ilt-card-regular { font-size: 11px !important; }
    .ilt-card-button { padding: 8px 14px !important; font-size: 13px !important; }
    .ilt-grid { gap: 16px !important; grid-template-columns: 1fr !important; }
    .ilt-section-title { font-size: 20px !important; }
    .ilt-benefit-title { font-size: 14px !important; }
    .ilt-benefit-desc { font-size: 12px !important; }
  }

  @media (max-width: 480px) {
    .ilt-header { padding: 10px 12px !important; }
    .ilt-logo { height: 40px !important; }
    .ilt-main-title { font-size: 20px !important; }
    .ilt-main-description { font-size: 13px !important; }
    .ilt-card { padding: 16px !important; }
    .ilt-card-button { padding: 8px 12px !important; font-size: 12px !important; }
  }
`;

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
  const [currency, setCurrency] = useState<any>({ code: 'GBP', symbol: '£', name: 'British Pound' });
  const [conversionRate, setConversionRate] = useState(1.0);

  // Fetch currency on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const res = await fetch('/api/geo/currency');
        const data = await res.json();
        setCurrency(data.currency);
        setConversionRate(data.conversionRate);
      } catch (error) {
        console.error('Failed to fetch currency:', error);
      }
    };
    fetchCurrency();
  }, []);

  // Helper to convert GBP prices
  const convertPrice = (gbpPrice: number): number => {
    return Math.round(gbpPrice * conversionRate * 100) / 100;
  };

  // Helper to format price with currency
  const formatPrice = (gbpPrice: number | string): string => {
    const numPrice = typeof gbpPrice === 'string' ? parseFloat(gbpPrice.replace(/[^0-9.-]/g, '')) : gbpPrice;
    const converted = convertPrice(numPrice);
    if (currency.code === 'JPY' || currency.code === 'KRW') {
      return `${currency.symbol}${Math.round(converted)}`;
    }
    return `${currency.symbol}${converted.toFixed(2)}`;
  };

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
      <style>{styles}</style>
      {/* Header */}
      <header
        className="ilt-header"
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
            <img className="ilt-logo" src="/assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '55px', width: 'auto' }} />
          </Link>
          <div className="ilt-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: BRAND_COLORS.gray }}>
            <Link href="/" style={{ textDecoration: 'none', color: BRAND_COLORS.teal }}>Home</Link>
            <span>/</span>
            <span style={{ color: BRAND_COLORS.navy, fontWeight: '600' }}>Live Courses</span>
          </div>
        </div>

        <Link
          className="ilt-sign-in"
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
            whiteSpace: 'nowrap',
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
            className="ilt-main-title"
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
            className="ilt-main-description"
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
          className="ilt-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginTop: '32px',
          }}
        >
          {sessions.map((session) => (
            <div
              className="ilt-card"
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
                className="ilt-card-title"
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
                className="ilt-card-instructor"
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
                  <p className="ilt-card-label" style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Start Date
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                    {session.startDate}
                  </p>
                </div>
                <div>
                  <p className="ilt-card-label" style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
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
                  <p className="ilt-card-label" style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Pace
                  </p>
                  <p style={{ fontSize: '13px', color: BRAND_COLORS.darkGray, margin: '4px 0 0 0' }}>
                    {session.pace}
                  </p>
                </div>
                <div>
                  <p className="ilt-card-label" style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                    Class Size
                  </p>
                  <p style={{ fontSize: '13px', color: BRAND_COLORS.darkGray, margin: '4px 0 0 0' }}>
                    {session.capacity}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {session.salePrice ? (
                    <>
                      <p className="ilt-card-price" style={{ fontSize: '20px', fontWeight: '700', color: BRAND_COLORS.orange, margin: 0 }}>
                        {formatPrice(session.salePrice)}
                      </p>
                      <p className="ilt-card-regular" style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: '4px 0 0 0', textDecoration: 'line-through' }}>
                        Regular: {formatPrice(session.price)}
                      </p>
                    </>
                  ) : (
                    <p className="ilt-card-price" style={{ fontSize: '20px', fontWeight: '700', color: BRAND_COLORS.teal, margin: 0 }}>
                      {formatPrice(session.price)}
                    </p>
                  )}
                </div>
                <Link
                  className="ilt-card-button"
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
                    whiteSpace: 'nowrap',
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
            className="ilt-section-title"
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
                <h4 className="ilt-benefit-title" style={{ fontSize: '16px', fontWeight: '600', color: BRAND_COLORS.navy, margin: '0 0 4px 0' }}>
                  {item.title}
                </h4>
                <p className="ilt-benefit-desc" style={{ fontSize: '14px', color: BRAND_COLORS.gray, margin: 0 }}>
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
