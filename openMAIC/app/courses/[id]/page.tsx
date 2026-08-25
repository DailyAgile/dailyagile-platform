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
};

const courses = [
  {
    id: 1,
    title: 'AI for Business Professionals',
    description: 'Learn AI fundamentals without coding. Perfect for product managers, scrum masters, and leaders.',
    longDescription: 'This comprehensive course teaches AI concepts in plain business language. No coding required. You\'ll learn how AI works, how to evaluate AI tools for your business, and how to lead AI initiatives in your organization.',
    modules: 6,
    duration: '4-6 weeks',
    price: '£299',
    lessons: 24,
    students: 340,
    rating: 4.8,
  },
  {
    id: 2,
    title: 'AI Engineer Bootcamp',
    description: 'Production-ready AI engineering with Python, RAG, and MLOps. For developers moving into AI.',
    longDescription: 'Hands-on bootcamp covering modern AI engineering. Build RAG pipelines, deploy models, and understand MLOps. Includes labs and real-world projects.',
    modules: 8,
    duration: '8-10 weeks',
    price: '£599',
    lessons: 52,
    students: 180,
    rating: 4.9,
  },
  {
    id: 3,
    title: 'AI DevOps & MLOps',
    description: 'Deploy and operate AI/ML systems in production. Docker, Kubernetes, monitoring, and scaling.',
    longDescription: 'Master the operational side of AI. Learn containerization, orchestration, CI/CD for ML, monitoring, and scaling ML systems in production.',
    modules: 6,
    duration: '6-8 weeks',
    price: '£499',
    lessons: 40,
    students: 210,
    rating: 4.7,
  },
];

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const courseId = parseInt(params.id);
  const course = courses.find((c) => c.id === courseId);
  const [enrolling, setEnrolling] = useState(false);

  if (!course) {
    return (
      <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px', textAlign: 'center' }}>
        <h1 style={{ color: BRAND_COLORS.navy }}>Course not found</h1>
        <Link href="/courses" style={{ color: BRAND_COLORS.teal }}>
          ← Back to Courses
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
            href="/courses"
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: BRAND_COLORS.teal,
              textDecoration: 'none',
            }}
          >
            ← Back to Courses
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
          {/* Left: Course Details */}
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 16px 0' }}>
              {course.title}
            </h1>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                  Rating
                </p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                  ⭐ {course.rating}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                  Students
                </p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                  {course.students}+
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                  Modules
                </p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '4px 0 0 0' }}>
                  {course.modules}
                </p>
              </div>
            </div>

            <div style={{ background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', marginBottom: '24px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 12px 0' }}>
                About This Course
              </h2>
              <p style={{ color: BRAND_COLORS.darkGray, lineHeight: '1.6', margin: 0 }}>
                {course.longDescription}
              </p>
            </div>

            <div style={{ background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 16px 0' }}>
                What You'll Learn
              </h2>
              <ul style={{ margin: 0, paddingLeft: '20px', color: BRAND_COLORS.darkGray }}>
                <li style={{ marginBottom: '8px' }}>Core concepts and practical applications</li>
                <li style={{ marginBottom: '8px' }}>Real-world case studies and examples</li>
                <li style={{ marginBottom: '8px' }}>Hands-on exercises and projects</li>
                <li style={{ marginBottom: '8px' }}>Industry best practices</li>
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
                border: `2px solid ${BRAND_COLORS.orange}`,
                position: 'sticky',
                top: '100px',
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: BRAND_COLORS.gray, margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                  Price
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: BRAND_COLORS.orange, margin: '8px 0 0 0' }}>
                  {course.price}
                </p>
              </div>

              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', color: BRAND_COLORS.gray, margin: 0 }}>Duration: {course.duration}</p>
                </div>
                <div>
                  <p style={{ fontSize: '13px', color: BRAND_COLORS.gray, margin: 0 }}>
                    {course.lessons} lessons across {course.modules} modules
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEnrolling(true);
                  // Navigate to enrollment
                  window.location.href = `/auth/login?redirect=/courses/${courseId}/enroll`;
                }}
                disabled={enrolling}
                style={{
                  width: '100%',
                  background: BRAND_COLORS.orange,
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
                🎓 Lifetime access after enrollment
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
