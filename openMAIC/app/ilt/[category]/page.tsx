'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/ilt/CourseCard';
import { Course, Currency } from '@/lib/ilt/types';

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

// Mock course data grouped by category
const MOCK_COURSES_BY_CATEGORY: Record<string, Course[]> = {
  'ai-business': [
    {
      id: 'ai-business-1',
      categoryId: 'ai-business',
      title: 'AI for Business Professionals',
      emoji: '👥',
      description: 'Master AI concepts for business decision-making',
      regularPrice: 349,
      salePrice: 299,
      discount: '15% off',
      instructorId: 'sarah-chen',
      objectives: ['Understand AI fundamentals', 'Learn business applications'],
      overview: 'Comprehensive introduction to AI for non-technical professionals',
      prerequisites: ['No coding required', 'Basic business knowledge'],
      certification: {
        available: true,
        name: 'Professional AI Certificate',
        format: '60 multiple-choice questions',
        duration: '90 minutes',
        passingScore: '70%',
      },
    },
    {
      id: 'ai-business-2',
      categoryId: 'ai-business',
      title: 'AI Strategy & Implementation',
      emoji: '📊',
      description: 'Develop AI strategies for organizational transformation',
      regularPrice: 399,
      salePrice: 349,
      discount: '12% off',
      instructorId: 'sarah-chen',
      objectives: ['Build AI strategy', 'Manage implementation'],
      overview: 'Advanced strategy workshop for business leaders',
      prerequisites: ['Completed AI Basics or equivalent experience'],
      certification: {
        available: true,
        name: 'AI Strategy Certification',
      },
    },
    {
      id: 'ai-business-3',
      categoryId: 'ai-business',
      title: 'Generative AI in the Workplace',
      emoji: '✨',
      description: 'Practical applications of ChatGPT and modern AI tools',
      regularPrice: 279,
      instructorId: 'maria-garcia',
      objectives: ['Use generative AI tools', 'Solve business problems'],
      overview: 'Hands-on workshop with real-world business tools',
      prerequisites: ['No prerequisites'],
      certification: {
        available: false,
      },
    },
    {
      id: 'ai-business-4',
      categoryId: 'ai-business',
      title: 'Prompt Engineering for Business',
      emoji: '⚡',
      description: 'Master prompting techniques for business applications',
      regularPrice: 199,
      instructorId: 'david-lee',
      objectives: ['Write effective prompts', 'Maximize AI tool utility'],
      overview: 'Intensive 2-day workshop on advanced prompting',
      prerequisites: ['Familiarity with ChatGPT or Claude'],
      certification: {
        available: true,
        name: 'Prompt Engineering Certificate',
      },
    },
    {
      id: 'ai-business-5',
      categoryId: 'ai-business',
      title: 'AI Ethics & Responsible Use',
      emoji: '⚖️',
      description: 'Navigate ethical challenges in AI implementation',
      regularPrice: 249,
      salePrice: 199,
      discount: '20% off',
      instructorId: 'elena-sanchez',
      objectives: ['Understand AI ethics', 'Mitigate risks'],
      overview: 'Executive overview of responsible AI governance',
      prerequisites: ['No prerequisites'],
      certification: {
        available: true,
        name: 'AI Ethics Certificate',
      },
    },
    {
      id: 'ai-business-6',
      categoryId: 'ai-business',
      title: 'Building Your AI Team',
      emoji: '👫',
      description: 'Hire, train, and lead AI-skilled teams',
      regularPrice: 449,
      instructorId: 'robert-wilson',
      objectives: ['Build high-performing AI teams', 'Develop talent'],
      overview: 'Leadership guide for AI adoption in organizations',
      prerequisites: ['Leadership experience preferred'],
      certification: {
        available: true,
        name: 'AI Team Leadership Certificate',
      },
    },
  ],
  'ai-engineer': [
    {
      id: 'ai-engineer-1',
      categoryId: 'ai-engineer',
      title: 'AI & ML Foundations',
      emoji: '🚀',
      description: 'Comprehensive ML fundamentals with Python',
      regularPrice: 499,
      instructorId: 'marcus-johnson',
      objectives: ['Master ML basics', 'Python for ML'],
      overview: 'Deep dive into machine learning foundations',
      prerequisites: ['Python experience', 'Math fundamentals'],
      certification: {
        available: true,
        name: 'ML Foundations Certificate',
      },
    },
    {
      id: 'ai-engineer-2',
      categoryId: 'ai-engineer',
      title: 'Neural Networks & Deep Learning',
      emoji: '🧠',
      description: 'Build neural networks from scratch',
      regularPrice: 599,
      salePrice: 499,
      discount: '17% off',
      instructorId: 'marcus-johnson',
      objectives: ['Build neural networks', 'Deep learning architectures'],
      overview: 'Hands-on neural networks and deep learning course',
      prerequisites: ['Completed ML Foundations'],
      certification: {
        available: true,
        name: 'Deep Learning Certificate',
      },
    },
  ],
  'prompt-engineering': [
    {
      id: 'prompt-eng-1',
      categoryId: 'prompt-engineering',
      title: 'Advanced Prompt Engineering',
      emoji: '⚡',
      description: 'Master advanced prompting techniques',
      regularPrice: 299,
      instructorId: 'jennifer-park',
      objectives: ['Advanced prompting', 'Few-shot learning'],
      overview: 'Advanced techniques for maximum AI tool utility',
      prerequisites: ['Basic familiarity with LLMs'],
      certification: {
        available: true,
        name: 'Advanced Prompt Engineering Certificate',
      },
    },
  ],
  'ai-devops': [
    {
      id: 'ai-devops-1',
      categoryId: 'ai-devops',
      title: 'Containerizing AI Models',
      emoji: '⚙️',
      description: 'Deploy AI models with Docker and Kubernetes',
      regularPrice: 449,
      instructorId: 'thomas-kim',
      objectives: ['Docker for ML', 'Model deployment'],
      overview: 'Production ML deployment strategies',
      prerequisites: ['Docker experience', 'ML fundamentals'],
      certification: {
        available: true,
        name: 'ML Deployment Certificate',
      },
    },
  ],
  'ai-ethics': [
    {
      id: 'ai-ethics-1',
      categoryId: 'ai-ethics',
      title: 'Responsible AI Implementation',
      emoji: '⚖️',
      description: 'Ethical AI practices and governance',
      regularPrice: 279,
      instructorId: 'elena-sanchez',
      objectives: ['AI ethics', 'Governance frameworks'],
      overview: 'Comprehensive guide to responsible AI',
      prerequisites: ['No prerequisites'],
      certification: {
        available: true,
        name: 'Responsible AI Certificate',
      },
    },
  ],
  'ai-agents': [
    {
      id: 'ai-agents-1',
      categoryId: 'ai-agents',
      title: 'Building AI Agents',
      emoji: '🤖',
      description: 'Create autonomous AI agents and workflows',
      regularPrice: 599,
      salePrice: 499,
      discount: '17% off',
      instructorId: 'marcus-johnson',
      objectives: ['Agent architecture', 'Multi-step workflows'],
      overview: 'Build sophisticated AI agents with tool calling',
      prerequisites: ['Python experience', 'LLM fundamentals'],
      certification: {
        available: true,
        name: 'AI Agent Development Certificate',
      },
    },
  ],
};

const CATEGORY_INFO: Record<string, { name: string; icon: string }> = {
  'ai-business': { name: 'AI for Business', icon: '👥' },
  'ai-engineer': { name: 'AI Engineering', icon: '🚀' },
  'prompt-engineering': { name: 'Prompt Engineering', icon: '⚡' },
  'ai-devops': { name: 'AI/MLOps', icon: '⚙️' },
  'ai-ethics': { name: 'AI Ethics & Governance', icon: '⚖️' },
  'ai-agents': { name: 'AI Agents & Automation', icon: '🤖' },
};

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default function CategoryDetailPage({ params }: CategoryPageProps) {
  const [categoryId, setCategoryId] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>({
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
  });
  const [conversionRate, setConversionRate] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Unwrap params
  useEffect(() => {
    (async () => {
      const { category } = await params;
      setCategoryId(category);
      setLoading(false);
    })();
  }, [params]);

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

  // Get courses for this category
  const allCourses = useMemo(
    () => MOCK_COURSES_BY_CATEGORY[categoryId] || [],
    [categoryId]
  );

  // Pagination
  const coursesPerPage = 9;
  const totalPages = Math.ceil(allCourses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const paginatedCourses = allCourses.slice(
    startIndex,
    startIndex + coursesPerPage
  );

  if (loading) {
    return <LoadingState />;
  }

  const categoryInfo = CATEGORY_INFO[categoryId];

  if (!categoryInfo) {
    return (
      <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px', textAlign: 'center' }}>
        <h1 style={{ color: BRAND_COLORS.navy }}>Category not found</h1>
        <Link href="/ilt" style={{ color: BRAND_COLORS.teal }}>
          ← Back to Categories
        </Link>
      </div>
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <Link
            href="/ilt"
            style={{ color: BRAND_COLORS.teal, textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}
          >
            ← Back to Categories
          </Link>
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
        {/* Category Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {categoryInfo.icon}
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: BRAND_COLORS.navy,
              margin: '0 0 12px 0',
            }}
          >
            {categoryInfo.name}
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
            Discover all available courses in this category. Choose your schedule and enroll today.
          </p>
        </div>

        {/* Courses Grid */}
        {allCourses.length === 0 ? (
          <EmptyState categoryName={categoryInfo.name} />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px',
                marginBottom: '40px',
              }}
            >
              {paginatedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  conversionRate={conversionRate}
                  currency={currency}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px',
                  background: BRAND_COLORS.white,
                  borderRadius: '12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                }}
              >
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${BRAND_COLORS.border}`,
                    background: currentPage === 1 ? BRAND_COLORS.light : BRAND_COLORS.white,
                    color: currentPage === 1 ? BRAND_COLORS.gray : BRAND_COLORS.navy,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                  }}
                >
                  ← Previous
                </button>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          border: `1px solid ${BRAND_COLORS.border}`,
                          background:
                            pageNum === currentPage
                              ? BRAND_COLORS.teal
                              : BRAND_COLORS.white,
                          color:
                            pageNum === currentPage
                              ? BRAND_COLORS.white
                              : BRAND_COLORS.navy,
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (pageNum !== currentPage) {
                            e.currentTarget.style.borderColor = BRAND_COLORS.teal;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (pageNum !== currentPage) {
                            e.currentTarget.style.borderColor = BRAND_COLORS.border;
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${BRAND_COLORS.border}`,
                    background:
                      currentPage === totalPages
                        ? BRAND_COLORS.light
                        : BRAND_COLORS.white,
                    color:
                      currentPage === totalPages
                        ? BRAND_COLORS.gray
                        : BRAND_COLORS.navy,
                    cursor:
                      currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            height: '40px',
            background: BRAND_COLORS.light,
            borderRadius: '12px',
            marginBottom: '20px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '350px',
                background: BRAND_COLORS.light,
                borderRadius: '12px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ categoryName }: { categoryName: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: BRAND_COLORS.white,
        borderRadius: '12px',
        border: `1px solid ${BRAND_COLORS.border}`,
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: '700',
          color: BRAND_COLORS.navy,
          margin: '0 0 8px 0',
        }}
      >
        No courses available
      </h2>
      <p
        style={{
          fontSize: '14px',
          color: BRAND_COLORS.gray,
          margin: '0 0 24px 0',
        }}
      >
        Courses in {categoryName} are coming soon. Check back later!
      </p>
      <Link
        href="/ilt"
        style={{
          display: 'inline-block',
          background: BRAND_COLORS.teal,
          color: BRAND_COLORS.white,
          padding: '10px 20px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        ← Back to Categories
      </Link>
    </div>
  );
}
