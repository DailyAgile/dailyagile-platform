'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CategoryCard from '@/components/ilt/CategoryCard';
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

// Mock categories data - 6 categories for the hub
const MOCK_CATEGORIES: Category[] = [
  {
    id: 'ai-business',
    name: 'AI for Business',
    icon: '👥',
    description: 'Master AI for business professionals without coding',
    courseCount: 6,
  },
  {
    id: 'ai-engineer',
    name: 'AI Engineering',
    icon: '🚀',
    description: 'Production-ready AI engineering with Python',
    courseCount: 8,
  },
  {
    id: 'prompt-engineering',
    name: 'Prompt Engineering',
    icon: '⚡',
    description: 'Master advanced prompting techniques',
    courseCount: 4,
  },
  {
    id: 'ai-devops',
    name: 'AI/MLOps',
    icon: '⚙️',
    description: 'Deploy and operate AI systems in production',
    courseCount: 6,
  },
  {
    id: 'ai-ethics',
    name: 'AI Ethics & Governance',
    icon: '⚖️',
    description: 'Responsible AI implementation and compliance',
    courseCount: 3,
  },
  {
    id: 'ai-agents',
    name: 'AI Agents & Automation',
    icon: '🤖',
    description: 'Build autonomous AI agents and workflows',
    courseCount: 5,
  },
];

export default function ILTHubPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading - in production, fetch categories from API
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light }}>
      {/* Sticky Header */}
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
            <img
              src="/assets/dailyagile_logo.png"
              alt="DailyAgile"
              style={{ height: '55px', width: 'auto' }}
            />
          </Link>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: BRAND_COLORS.gray,
            }}
          >
            <Link
              href="/"
              style={{ textDecoration: 'none', color: BRAND_COLORS.teal }}
            >
              Home
            </Link>
            <span>/</span>
            <span style={{ color: BRAND_COLORS.navy, fontWeight: '600' }}>
              Live Courses
            </span>
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
            whiteSpace: 'nowrap',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = BRAND_COLORS.orange)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = BRAND_COLORS.teal)
          }
        >
          Sign In / Enroll
        </Link>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '40px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: BRAND_COLORS.navy,
              margin: '0 0 12px 0',
            }}
          >
            Explore Our Learning Paths
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              margin: 0,
              maxWidth: '600px',
              lineHeight: '1.6',
            }}
          >
            Choose your learning path and join live training sessions with expert
            instructors. Limited seats available for interactive learning.
          </p>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <LoadingState />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginTop: '32px',
            }}
          >
            {MOCK_CATEGORIES.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}

        {/* Benefits Section */}
        <div
          style={{
            marginTop: '60px',
            padding: '40px 24px',
            background: BRAND_COLORS.white,
            borderRadius: '12px',
            border: `1px solid ${BRAND_COLORS.border}`,
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: BRAND_COLORS.navy,
              margin: '0 0 24px 0',
            }}
          >
            Why Choose DailyAgile Live Training?
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                icon: '👥',
                title: 'Expert Instructors',
                desc: 'Learn from industry professionals with real-world experience',
              },
              {
                icon: '💬',
                title: 'Live Q&A',
                desc: 'Ask questions and get immediate answers during sessions',
              },
              {
                icon: '🎯',
                title: 'Structured Learning',
                desc: 'Follow a clear path from fundamentals to advanced topics',
              },
              {
                icon: '🏆',
                title: 'Certifications',
                desc: 'Earn recognized certificates to boost your career',
              },
              {
                icon: '👫',
                title: 'Peer Community',
                desc: 'Network with professionals from diverse backgrounds',
              },
              {
                icon: '🔄',
                title: 'Flexible Schedules',
                desc: 'Choose weekday or weekend sessions that work for you',
              },
            ].map((benefit, i) => (
              <div key={i}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                  {benefit.icon}
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                    margin: '0 0 8px 0',
                  }}
                >
                  {benefit.title}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: BRAND_COLORS.gray,
                    margin: 0,
                    lineHeight: '1.5',
                  }}
                >
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div
          style={{
            marginTop: '40px',
            padding: '32px 24px',
            background: BRAND_COLORS.navy,
            borderRadius: '12px',
            textAlign: 'center',
            color: BRAND_COLORS.white,
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              margin: '0 0 12px 0',
            }}
          >
            Ready to Accelerate Your AI Skills?
          </h2>
          <p
            style={{
              fontSize: '16px',
              margin: '0 0 24px 0',
              opacity: 0.9,
            }}
          >
            Explore a learning path above and register for your first session today.
          </p>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-block',
              background: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              padding: '12px 28px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = BRAND_COLORS.orange)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = BRAND_COLORS.teal)
            }
          >
            Explore Courses
          </Link>
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginTop: '32px',
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '200px',
            background: BRAND_COLORS.light,
            borderRadius: '12px',
            border: `1px solid ${BRAND_COLORS.border}`,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      ))}
    </div>
  );
}
