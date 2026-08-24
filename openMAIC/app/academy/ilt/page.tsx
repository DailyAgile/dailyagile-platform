'use client';

import Link from 'next/link';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  light: '#F0F7FA',
  green: '#16a34a',
};

// Sample ILT courses (will be replaced with dynamic data from API)
const ILT_COURSES = [
  {
    id: 'agile-fundamentals',
    name: 'Agile Fundamentals',
    description: 'Learn core Agile principles and practices for effective team collaboration.',
    instructor: 'Sarah Chen',
    price: 299,
    duration: '4 weeks',
    nextCohorts: [
      { startDate: 'Sep 15, 2026', seats: 8 },
      { startDate: 'Oct 6, 2026', seats: 15 },
      { startDate: 'Oct 27, 2026', seats: 12 },
    ],
  },
  {
    id: 'scrum-master-essentials',
    name: 'Scrum Master Essentials',
    description: 'Master the Scrum framework and lead high-performing teams.',
    instructor: 'James Wilson',
    price: 399,
    duration: '6 weeks',
    nextCohorts: [
      { startDate: 'Sep 22, 2026', seats: 10 },
      { startDate: 'Oct 13, 2026', seats: 9 },
      { startDate: 'Nov 3, 2026', seats: 14 },
    ],
  },
  {
    id: 'ai-strategy-executives',
    name: 'AI Strategy for Executives',
    description: 'Strategic insights on AI adoption, implementation, and organizational impact.',
    instructor: 'Dr. Michael Kumar',
    price: 499,
    duration: '3 weeks',
    nextCohorts: [
      { startDate: 'Sep 29, 2026', seats: 12 },
      { startDate: 'Oct 20, 2026', seats: 7 },
      { startDate: 'Nov 10, 2026', seats: 11 },
    ],
  },
  {
    id: 'advanced-machine-learning',
    name: 'Advanced Machine Learning',
    description: 'Deep dive into ML algorithms, model optimization, and production deployment.',
    instructor: 'Dr. Priya Sharma',
    price: 599,
    duration: '8 weeks',
    nextCohorts: [
      { startDate: 'Oct 1, 2026', seats: 6 },
      { startDate: 'Nov 1, 2026', seats: 8 },
    ],
  },
];

export default function ILTPage() {
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

        <div style={{ marginBottom: '40px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              marginBottom: '12px',
            }}
          >
            👥 Instructor-Led Training (ILT)
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              marginBottom: '8px',
            }}
          >
            Live courses with professional instructors. Premium learning experience with interactive sessions.
          </p>
          <p
            style={{
              fontSize: '14px',
              color: BRAND_COLORS.gray,
            }}
          >
            60+ courses scheduled throughout the year. Browse courses below and enroll in your next cohort.
          </p>
        </div>

        {/* Courses Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {ILT_COURSES.map((course) => (
            <ILTCourseCard
              key={course.id}
              course={course}
            />
          ))}
        </div>

        {/* Call-to-action */}
        <div
          style={{
            background: BRAND_COLORS.white,
            borderRadius: '12px',
            border: `1px solid ${BRAND_COLORS.border}`,
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              color: BRAND_COLORS.navy,
              marginBottom: '16px',
            }}
          >
            Looking for something specific?
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: BRAND_COLORS.gray,
              marginBottom: '24px',
            }}
          >
            We offer 60+ courses. Contact us if you would like a custom cohort for your team.
          </p>
          <a
            href="mailto:support@dailyagile.com?subject=Custom%20ILT%20Cohort%20Inquiry"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.teal)}
          >
            Contact Sales
          </a>
        </div>
      </div>
    </div>
  );
}

interface Course {
  id: string;
  name: string;
  description: string;
  instructor: string;
  price: number;
  duration: string;
  nextCohorts: Array<{ startDate: string; seats: number }>;
}

interface ILTCourseCardProps {
  course: Course;
}

function ILTCourseCard({ course }: ILTCourseCardProps) {
  return (
    <div
      style={{
        background: BRAND_COLORS.white,
        borderRadius: '12px',
        border: `1px solid ${BRAND_COLORS.border}`,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = BRAND_COLORS.teal;
        e.currentTarget.style.boxShadow = `0 12px 24px rgba(8, 145, 178, 0.1)`;
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BRAND_COLORS.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: BRAND_COLORS.navy,
          margin: '0 0 8px 0',
        }}
      >
        {course.name}
      </h3>

      <p
        style={{
          fontSize: '12px',
          color: BRAND_COLORS.gray,
          margin: '0 0 16px 0',
        }}
      >
        Instructor: <strong>{course.instructor}</strong>
      </p>

      <p
        style={{
          fontSize: '14px',
          color: BRAND_COLORS.gray,
          margin: '0 0 16px 0',
          flex: 1,
          lineHeight: '1.6',
        }}
      >
        {course.description}
      </p>

      <div
        style={{
          borderTop: `1px solid ${BRAND_COLORS.border}`,
          paddingTop: '16px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: BRAND_COLORS.gray,
            marginBottom: '12px',
          }}
        >
          <strong>Next Cohorts:</strong>
        </div>
        {course.nextCohorts.slice(0, 2).map((cohort, idx) => (
          <div
            key={idx}
            style={{
              fontSize: '12px',
              color: BRAND_COLORS.navy,
              marginBottom: '6px',
            }}
          >
            • {cohort.startDate} ({cohort.seats} seats available)
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: `1px solid ${BRAND_COLORS.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: BRAND_COLORS.teal,
            }}
          >
            £{course.price}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: BRAND_COLORS.gray,
            }}
          >
            {course.duration}
          </div>
        </div>
        <button
          onClick={() => {
            // TODO: Wire Stripe checkout in Phase 2
            console.log('Enroll button clicked for:', course.name);
          }}
          style={{
            padding: '10px 16px',
            background: BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
          onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.teal)}
        >
          Enroll Now
        </button>
      </div>
    </div>
  );
}
