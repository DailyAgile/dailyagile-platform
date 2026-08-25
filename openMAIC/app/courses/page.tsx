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
};

export default function CoursesPage() {
  const courses = [
    {
      id: 1,
      title: 'AI for Business Professionals',
      description: 'Learn AI fundamentals without coding. Perfect for product managers, scrum masters, and leaders.',
      modules: 6,
      duration: '4-6 weeks',
      price: '£299',
      image: '📚',
    },
    {
      id: 2,
      title: 'AI Engineer Bootcamp',
      description: 'Production-ready AI engineering with Python, RAG, and MLOps. For developers moving into AI.',
      modules: 8,
      duration: '8-10 weeks',
      price: '£599',
      image: '🔧',
    },
    {
      id: 3,
      title: 'AI DevOps & MLOps',
      description: 'Deploy and operate AI/ML systems in production. Docker, Kubernetes, monitoring, and scaling.',
      modules: 6,
      duration: '6-8 weeks',
      price: '£499',
      image: '⚙️',
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
              fontSize: '18px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
            title="Back to DailyAgile home"
          >
            📚 DailyAgile
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: BRAND_COLORS.gray' }}>
            <Link href="/" style={{ textDecoration: 'none', color: BRAND_COLORS.teal }}>Home</Link>
            <span>/</span>
            <span style={{ color: BRAND_COLORS.navy, fontWeight: '600' }}>Self-Paced Courses</span>
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
          Sign In / Start Learning
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
            Learn AI + Agile at Your Own Pace
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              margin: 0,
              maxWidth: '600px',
            }}
          >
            Three comprehensive learning tracks designed for different roles. Start free, learn anytime, get certified.
          </p>
        </div>

        {/* Courses Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginTop: '32px',
          }}
        >
          {courses.map((course) => (
            <div
              key={course.id}
              style={{
                background: BRAND_COLORS.white,
                borderRadius: '12px',
                border: `1px solid ${BRAND_COLORS.border}`,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
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
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{course.image}</div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: BRAND_COLORS.navy,
                  margin: '0 0 8px 0',
                }}
              >
                {course.title}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: BRAND_COLORS.gray,
                  margin: '0 0 16px 0',
                  flex: 1,
                }}
              >
                {course.description}
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
                  <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0 }}>Modules</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                    {course.modules}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0 }}>Duration</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                    {course.duration}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: BRAND_COLORS.orange, margin: 0 }}>
                  {course.price}
                </p>
                <a
                  href={`/courses/${course.id}`}
                  style={{
                    background: BRAND_COLORS.orange,
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
                >
                  Explore
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div
          style={{
            marginTop: '60px',
            padding: '40px 24px',
            background: `linear-gradient(135deg, ${BRAND_COLORS.light}, #ecfdf5)`,
            borderRadius: '12px',
            border: `2px solid ${BRAND_COLORS.teal}`,
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 8px 0',
            }}
          >
            Try Before You Buy
          </h3>
          <p
            style={{
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              margin: '0 0 20px 0',
            }}
          >
            Preview the first 15 minutes of any course free. No credit card required.
          </p>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-block',
              background: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              padding: '12px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
            }}
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  );
}
