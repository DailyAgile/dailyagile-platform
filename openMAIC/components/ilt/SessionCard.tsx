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
  red: '#dc2626',
};

interface Session {
  id: number;
  courseId: string;
  courseName: string;
  instructor: string;
  format: string;
  dates: string;
  startDate: Date;
  dayOfWeek: string;
  times: string;
  duration: string;
  schedule: string;
  regular: number;
  sale: number | null;
  available: number;
  waitlist: boolean;
  image: string;
}

interface SessionCardProps {
  session: Session;
  currency: any;
  conversionRate: number;
}

export default function SessionCard({ session, currency, conversionRate }: SessionCardProps) {
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

  // Determine status pill color and text
  const getStatusPill = () => {
    if (session.available === 0 && session.waitlist) {
      return { text: 'Waiting List Open', bg: '#fef3c7', color: '#92400e' };
    }
    if (session.available === 0) {
      return { text: 'Sold Out', bg: '#fee2e2', color: '#7f1d1d' };
    }
    if (session.available <= 3) {
      return { text: `Only ${session.available} left!`, bg: '#fed7aa', color: '#92400e' };
    }
    return { text: `${session.available} spots available`, bg: '#dcfce7', color: '#166534' };
  };

  // Determine CTA button
  const getCTAButton = () => {
    if (session.available === 0) {
      if (session.waitlist) {
        return { text: 'Join Waiting List', color: BRAND_COLORS.orange, href: `/auth/login?redirect=/ilt/courses/${session.courseId}/waitlist/${session.id}` };
      }
      return { text: 'Sold Out', color: BRAND_COLORS.gray, disabled: true };
    }
    return { text: 'Enroll Now', color: BRAND_COLORS.teal, href: `/auth/login?redirect=/ilt/courses/${session.courseId}/enroll/${session.id}` };
  };

  const status = getStatusPill();
  const cta = getCTAButton();
  const price = session.sale || session.regular;
  const discount = session.sale ? Math.round(((session.regular - session.sale) / session.regular) * 100) : 0;

  return (
    <div
      style={{
        background: BRAND_COLORS.white,
        borderRadius: '12px',
        border: `2px solid ${BRAND_COLORS.border}`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = BRAND_COLORS.teal;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = BRAND_COLORS.border;
      }}
    >
      {/* Top: Date and Schedule Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
            Start Date
          </p>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
            {session.dates}
          </p>
          <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: '2px 0 0 0' }}>
            {session.dayOfWeek}
          </p>
        </div>
        <div style={{ fontSize: '32px' }}>{session.image}</div>
      </div>

      {/* Time & Duration */}
      <div style={{ padding: '12px 0', borderTop: `1px solid ${BRAND_COLORS.border}`, borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
        <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
          Time & Duration
        </p>
        <p style={{ fontSize: '13px', color: BRAND_COLORS.darkGray, margin: '4px 0 0 0' }}>
          {session.times}
        </p>
        <p style={{ fontSize: '13px', color: BRAND_COLORS.darkGray, margin: '2px 0 0 0' }}>
          {session.format} ({session.schedule})
        </p>
      </div>

      {/* Course & Instructor */}
      <div>
        <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
          Course
        </p>
        <p style={{ fontSize: '13px', fontWeight: '600', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
          {session.courseName}
        </p>
        <p style={{ fontSize: '12px', color: BRAND_COLORS.teal, margin: '4px 0 0 0' }}>
          Led by <strong>{session.instructor}</strong>
        </p>
      </div>

      {/* Price & Discount */}
      <div style={{ paddingTop: '8px' }}>
        {session.sale ? (
          <>
            <p style={{ fontSize: '20px', fontWeight: '700', color: BRAND_COLORS.orange, margin: 0 }}>
              {formatPrice(session.sale)}
            </p>
            <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: '2px 0 0 0', textDecoration: 'line-through' }}>
              Regular: {formatPrice(session.regular)}
            </p>
            <p style={{ fontSize: '11px', fontWeight: '600', color: BRAND_COLORS.green, margin: '2px 0 0 0' }}>
              💰 Save {discount}%
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: '20px', fontWeight: '700', color: BRAND_COLORS.teal, margin: 0 }}>
              {formatPrice(session.regular)}
            </p>
            <p style={{ fontSize: '11px', color: BRAND_COLORS.gray, margin: '2px 0 0 0' }}>
              No discount available
            </p>
          </>
        )}
      </div>

      {/* Status Pill */}
      <div
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          background: status.bg,
          color: status.color,
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {status.text}
      </div>

      {/* CTA Button */}
      {cta.disabled ? (
        <button
          disabled
          style={{
            background: cta.color,
            color: BRAND_COLORS.white,
            border: 'none',
            padding: '12px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          {cta.text}
        </button>
      ) : (
        <Link
          href={cta.href || '#'}
          style={{
            background: cta.color,
            color: BRAND_COLORS.white,
            border: 'none',
            padding: '12px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'none',
            textAlign: 'center',
            display: 'block',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
          onMouseLeave={(e) => (e.currentTarget.style.background = cta.color)}
        >
          {cta.text}
        </Link>
      )}
    </div>
  );
}
