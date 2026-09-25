/**
 * Category Card Component (Option B Design)
 * Displays category with icon + name + hover effect
 * Responsive and accessibility-compliant
 */

import Link from 'next/link';
import { Category } from '@/lib/ilt/types';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/ilt/${category.id}`}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          background: BRAND_COLORS.white,
          border: `2px solid ${BRAND_COLORS.border}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          textAlign: 'center',
          minHeight: '200px',
          gap: '16px',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(-8px)';
          el.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
          el.style.borderColor = BRAND_COLORS.teal;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = 'none';
          el.style.borderColor = BRAND_COLORS.border;
        }}
      >
        {/* Icon */}
        <div
          role="img"
          aria-label={category.name}
          style={{
            fontSize: '48px',
            lineHeight: '1',
          }}
        >
          {category.icon}
        </div>

        {/* Category Name */}
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: BRAND_COLORS.navy,
            margin: 0,
            lineHeight: '1.3',
          }}
        >
          {category.name}
        </h2>

        {/* Course Count */}
        <p
          style={{
            fontSize: '13px',
            color: BRAND_COLORS.gray,
            margin: 0,
            fontWeight: '500',
          }}
        >
          {category.courseCount} {category.courseCount === 1 ? 'course' : 'courses'}
        </p>
      </div>
    </Link>
  );
}
