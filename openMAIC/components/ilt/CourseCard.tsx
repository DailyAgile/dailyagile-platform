/**
 * Course Card Component
 * Displays course with badge, title, price
 * Responsive and mobile-friendly
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { Course } from '@/lib/ilt/types';

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

interface CourseCardProps {
  course: Course;
  conversionRate: number;
  currency: {
    code: string;
    symbol: string;
  };
}

export default function CourseCard({
  course,
  conversionRate,
  currency,
}: CourseCardProps) {
  // Memoize price formatting to avoid unnecessary recalculations
  const formattedPrices = useMemo(() => {
    const convertPrice = (gbpPrice: number): number => {
      return Math.round(gbpPrice * conversionRate * 100) / 100;
    };

    const formatPrice = (gbpPrice: number): string => {
      const converted = convertPrice(gbpPrice);
      if (currency.code === 'JPY' || currency.code === 'KRW') {
        return `${currency.symbol}${Math.round(converted)}`;
      }
      return `${currency.symbol}${converted.toFixed(2)}`;
    };

    return {
      regular: formatPrice(course.regularPrice),
      sale: course.salePrice ? formatPrice(course.salePrice) : null,
      savings: course.salePrice
        ? formatPrice(course.regularPrice - course.salePrice)
        : null,
    };
  }, [course.regularPrice, course.salePrice, conversionRate, currency]);

  return (
    <Link href={`/ilt/courses/${course.id}`}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          background: BRAND_COLORS.white,
          border: `1px solid ${BRAND_COLORS.border}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          height: '100%',
          minHeight: '300px',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
          el.style.borderColor = BRAND_COLORS.teal;
          el.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = 'none';
          el.style.borderColor = BRAND_COLORS.border;
          el.style.transform = 'translateY(0)';
        }}
      >
        {/* Badge */}
        {(course.badge || course.emoji) && (
          <div
            style={{
              fontSize: '28px',
              marginBottom: '12px',
              lineHeight: '1',
            }}
          >
            {course.emoji || course.badge}
          </div>
        )}

        {/* Title */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: BRAND_COLORS.navy,
            margin: '0 0 12px 0',
            lineHeight: '1.4',
            flex: 1,
          }}
        >
          {course.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13px',
            color: BRAND_COLORS.gray,
            margin: '0 0 16px 0',
            lineHeight: '1.5',
            flex: 1,
          }}
        >
          {course.description}
        </p>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: BRAND_COLORS.border,
            margin: '16px 0',
          }}
        />

        {/* Pricing */}
        <div style={{ marginBottom: '16px' }}>
          {formattedPrices.sale ? (
            <>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: BRAND_COLORS.orange,
                  margin: '0 0 4px 0',
                }}
              >
                {formattedPrices.sale}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: BRAND_COLORS.gray,
                  textDecoration: 'line-through',
                  margin: '0',
                }}
              >
                Regular: {formattedPrices.regular}
              </div>
              {formattedPrices.savings && (
                <div
                  style={{
                    fontSize: '12px',
                    color: BRAND_COLORS.green,
                    fontWeight: '600',
                    margin: '4px 0 0 0',
                  }}
                >
                  💰 Save {formattedPrices.savings}
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: BRAND_COLORS.teal,
                margin: 0,
              }}
            >
              {formattedPrices.regular}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div
          style={{
            background: BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            width: '100%',
            marginTop: 'auto',
            textAlign: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = BRAND_COLORS.orange;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = BRAND_COLORS.teal;
          }}
        >
          View Course
        </div>
      </div>
    </Link>
  );
}
