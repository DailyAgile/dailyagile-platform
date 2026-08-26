/**
 * Public Dashboard Component
 * Shows public quizzes and instructor code entry
 * Accessible without authentication
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Quiz } from '@/lib/quiz-navigation/types';
import QuizCard from './QuizCard';
import InstructorCodeModal from './InstructorCodeModal';
import {
  saveInstructorCodeToStorage,
  clearInstructorCodeFromStorage,
  getQuizzesByInstructorCode,
  getPublicQuizzes,
} from '@/lib/quiz-navigation/user-type-detector';
import { createLogger } from '@/lib/logger';

const log = createLogger('PublicDashboard');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface PublicDashboardProps {
  initialInstructorCode?: string;
}

export default function PublicDashboard({ initialInstructorCode }: PublicDashboardProps) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(!initialInstructorCode);
  const [instructorCode, setInstructorCode] = useState<string | null>(initialInstructorCode || null);
  const [instructorName, setInstructorName] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load quizzes when instructor code changes
    const initializeQuizzes = async () => {
      await loadQuizzes();
    };
    initializeQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructorCode]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      let quizzesData: Quiz[] = [];

      if (instructorCode) {
        // Load quizzes from instructor code
        const result = await getQuizzesByInstructorCode(instructorCode);
        if (!result.success) {
          setError(result.error || 'Failed to load quizzes');
          setInstructorCode(null);
          setCodeModalOpen(true);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quizzesData = (result.quizzes || []).map((q: any) => ({
          id: q.id,
          code: q.quiz_code,
          title: q.title,
          description: q.description,
          questionCount: q.total_questions || 0,
          createdBy: q.created_by || 'Unknown',
          isPublished: q.is_published,
          status: 'published',
          createdAt: q.created_at,
        }));
        setInstructorName(result.instructorName || null);
      } else {
        // Load public quizzes
        quizzesData = await getPublicQuizzes();
      }

      setQuizzes(quizzesData);
      log.info(`Loaded ${quizzesData.length} quizzes`);
    } catch (err) {
      log.error('Error loading quizzes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (code: string) => {
    try {
      const result = await getQuizzesByInstructorCode(code);
      if (!result.success) {
        throw new Error(result.error || 'Invalid code');
      }

      saveInstructorCodeToStorage(code);
      setInstructorCode(code);
      setCodeModalOpen(false);
      log.info(`Loaded quizzes with instructor code: ${code}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load quizzes';
      throw new Error(errorMsg);
    }
  };

  const handleClearCode = () => {
    clearInstructorCodeFromStorage();
    setInstructorCode(null);
    setInstructorName(null);
    setFilterDifficulty('all');
    setSearchQuery('');
    setCodeModalOpen(true);
  };

  const filteredQuizzes = quizzes.filter((q) => {
    // Filter by difficulty
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) {
      return false;
    }

    // Filter by search query (safely handle potential undefined values)
    const safeQuery = (searchQuery || '').trim();
    if (safeQuery) {
      const query = safeQuery.toLowerCase();
      return (
        (q.title || '').toLowerCase().includes(query) ||
        (q.description && q.description.toLowerCase().includes(query)) ||
        (q.topic && q.topic.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <>
      {/* Top Navigation */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.white,
          borderBottom: `1px solid ${BRAND_COLORS.light}`,
          padding: '16px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '40px', width: 'auto', cursor: 'pointer' }} />
          </Link>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/quizzes" style={{ color: BRAND_COLORS.teal, fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
              ← Back to Quiz Hub
            </Link>
            <Link href="/" style={{ color: BRAND_COLORS.teal, fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
              Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            margin: '0 0 8px 0',
            fontSize: '32px',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            fontFamily: 'Cambria, serif',
          }}
        >
          {instructorCode ? `Quizzes from ${instructorName || 'Your Instructor'}` : 'Browse Quizzes'}
        </h1>
        <p
          style={{
            margin: '0',
            fontSize: '16px',
            color: BRAND_COLORS.gray,
            fontFamily: 'Calibri, sans-serif',
          }}
        >
          {instructorCode
            ? 'Take quizzes from your instructor'
            : 'Explore public quizzes or enter an instructor code'}
        </p>
      </div>

      {/* Instructor code section */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          border: `2px solid ${BRAND_COLORS.teal}`,
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h3
              style={{
                margin: '0 0 4px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: BRAND_COLORS.navy,
                fontFamily: 'Cambria, serif',
              }}
            >
              {instructorCode ? `Code: ${instructorCode}` : 'Have an Instructor Code?'}
            </h3>
            <p
              style={{
                margin: '0',
                fontSize: '14px',
                color: BRAND_COLORS.gray,
                fontFamily: 'Calibri, sans-serif',
              }}
            >
              {instructorCode
                ? 'Click below to change or enter a different code'
                : 'Ask your instructor for their 8-digit code to access their quizzes'}
            </p>
          </div>
          <button
            onClick={() => setCodeModalOpen(true)}
            style={{
              backgroundColor: BRAND_COLORS.orange,
              color: BRAND_COLORS.white,
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'Calibri, sans-serif',
              transition: 'all 0.2s ease',
              minHeight: '44px',
              minWidth: '44px',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as HTMLButtonElement;
              target.style.opacity = '0.9';
              target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as HTMLButtonElement;
              target.style.opacity = '1';
              target.style.transform = 'scale(1)';
            }}
          >
            {instructorCode ? 'Change Code' : 'Enter Code'}
          </button>
          {instructorCode && (
            <button
              onClick={handleClearCode}
              style={{
                backgroundColor: BRAND_COLORS.white,
                color: BRAND_COLORS.navy,
                border: `1px solid ${BRAND_COLORS.border}`,
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'Calibri, sans-serif',
                transition: 'all 0.2s ease',
                minHeight: '44px',
                minWidth: '44px',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.backgroundColor = BRAND_COLORS.light;
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.backgroundColor = BRAND_COLORS.white;
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Code modal */}
      <InstructorCodeModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        onSubmit={handleCodeSubmit}
      />

      {/* Search and filters */}
      {quizzes.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px 16px',
              fontSize: '14px',
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '4px',
              fontFamily: 'Calibri, sans-serif',
            }}
          />
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '4px',
              fontFamily: 'Calibri, sans-serif',
              minHeight: '44px',
              minWidth: '120px',
            }}
          >
            <option value="all">All Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '24px',
            color: '#dc2626',
            fontFamily: 'Calibri, sans-serif',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: BRAND_COLORS.gray,
          }}
        >
          Loading quizzes...
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredQuizzes.length === 0 && !error && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: BRAND_COLORS.light,
            borderRadius: '8px',
            color: BRAND_COLORS.gray,
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: BRAND_COLORS.navy }}>
            {searchQuery ? 'No quizzes found' : 'No public quizzes available'}
          </h3>
          <p style={{ margin: '0' }}>
            {searchQuery
              ? 'Try a different search term'
              : 'Enter an instructor code to access quizzes from your instructor'}
          </p>
        </div>
      )}

      {/* Quiz grid */}
      {!loading && filteredQuizzes.length > 0 && (
        <>
          <div
            style={{
              marginBottom: '16px',
              fontSize: '14px',
              color: BRAND_COLORS.gray,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Showing {filteredQuizzes.length} of {quizzes.length} quizzes
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                variant="public"
                actions={[
                  {
                    label: 'Take Quiz',
                    onClick: () => {
                      const quizRoute = `/student/quiz/${quiz.id}/practice`;
                      try {
                        router.push(quizRoute);
                      } catch (err) {
                        log.error(`Failed to navigate to quiz: ${quizRoute}`, err);
                      }
                    },
                    variant: 'primary',
                  },
                  {
                    label: 'Preview',
                    onClick: () => {
                      const previewRoute = `/student/quiz/${quiz.id}/preview`;
                      try {
                        router.push(previewRoute);
                      } catch (err) {
                        log.error(`Failed to navigate to preview: ${previewRoute}`, err);
                      }
                    },
                    variant: 'secondary',
                  },
                ]}
              />
            ))}
          </div>
        </>
      )}
      </div>
    </>
  );
}
