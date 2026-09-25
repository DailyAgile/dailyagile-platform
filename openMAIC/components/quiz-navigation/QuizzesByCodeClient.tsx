'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Quiz } from '@/lib/quiz-navigation/types';
import QuizCard from './QuizCard';
import {
  getQuizzesByInstructorCode,
} from '@/lib/quiz-navigation/user-type-detector';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizzesByCodeClient');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface QuizzesByCodeClientProps {
  code: string;
}

export default function QuizzesByCodeClient({ code }: QuizzesByCodeClientProps) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => {
    log.info(`Loading quizzes for code: "${code}" (length: ${code.length}, type: ${typeof code})`);
    loadQuizzes();
  }, [code]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getQuizzesByInstructorCode(code);
      if (!result.success) {
        setError(result.error || 'Failed to load quizzes');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quizzesData = (result.quizzes || []).map((q: any) => ({
        id: q.id,
        code: q.quiz_code,
        title: q.title,
        description: q.description,
        questionCount: q.total_questions || 0,
        createdBy: q.created_by || 'Unknown',
        isPublished: q.is_published,
        status: 'published' as const,
        createdAt: q.created_at,
      }));

      setQuizzes(quizzesData);
      setInstructorName(result.instructorName || null);
      log.info(`Loaded ${quizzesData.length} quizzes for code ${code}`);
    } catch (err) {
      log.error('Error loading quizzes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCode = () => {
    setShowCodeInput(true);
    setError(null);
    setCodeError(null);
  };

  const handleSubmitNewCode = async () => {
    const trimmedCode = newCode.trim().toUpperCase();
    if (!trimmedCode) {
      setCodeError('Please enter a code');
      return;
    }

    if (!/^\d{8}$/.test(trimmedCode)) {
      setCodeError('Code must be 8 digits');
      return;
    }

    setValidatingCode(true);
    setCodeError(null);

    try {
      // Validate code exists before redirecting
      const response = await fetch(`/api/quizzes/by-code/${trimmedCode}`);
      if (response.status === 404 || !response.ok) {
        setCodeError('Instructor code not found. Please check and try again.');
        setValidatingCode(false);
        return;
      }

      // Code is valid - redirect
      window.location.href = `/quizzes/code/${trimmedCode}`;
    } catch (err) {
      setCodeError('Failed to validate code. Please try again.');
      setValidatingCode(false);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) {
      return false;
    }

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

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: BRAND_COLORS.gray }}>Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light,
          padding: '24px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: '#dc2626', marginBottom: '8px' }}>Error Loading Quizzes</h2>
          <p style={{ color: BRAND_COLORS.gray, marginBottom: '24px' }}>{error}</p>
          <button
            onClick={handleChangeCode}
            style={{
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Try Another Code
          </button>
        </div>
      </div>
    );
  }

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
            Quizzes from {instructorName || 'Your Instructor'}
          </h1>
          <p
            style={{
              margin: '0',
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Take quizzes from your instructor
          </p>
        </div>

        {/* Code Info / Change Code Form */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            border: `2px solid ${BRAND_COLORS.teal}`,
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '32px',
          }}
        >
          {!showCodeInput ? (
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
                <h3 style={{ margin: '0 0 4px 0', color: BRAND_COLORS.navy }}>Code: {code}</h3>
                <p style={{ margin: '0', fontSize: '14px', color: BRAND_COLORS.gray }}>
                  Have a different instructor code? Enter it below.
                </p>
              </div>
              <button
                onClick={handleChangeCode}
                style={{
                  backgroundColor: BRAND_COLORS.orange,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Enter Different Code
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Enter 8-digit instructor code"
                    value={newCode}
                    onChange={(e) => {
                      setNewCode(e.target.value.toUpperCase());
                      setCodeError(null);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !validatingCode) {
                        handleSubmitNewCode();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: codeError ? `2px solid #dc2626` : `1px solid ${BRAND_COLORS.teal}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                    maxLength={8}
                    disabled={validatingCode}
                  />
                  {codeError && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#dc2626', fontWeight: '500' }}>
                      {codeError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSubmitNewCode}
                  disabled={validatingCode || !newCode.trim()}
                  style={{
                    backgroundColor: validatingCode ? '#d1d5db' : BRAND_COLORS.orange,
                    color: BRAND_COLORS.white,
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: validatingCode ? 'not-allowed' : 'pointer',
                  }}
                >
                  {validatingCode ? 'Loading...' : 'Load'}
                </button>
                <button
                  onClick={() => {
                    setShowCodeInput(false);
                    setNewCode('');
                    setCodeError(null);
                  }}
                  disabled={validatingCode}
                  style={{
                    backgroundColor: BRAND_COLORS.white,
                    color: BRAND_COLORS.navy,
                    border: `1px solid ${BRAND_COLORS.navy}`,
                    padding: '12px 20px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: validatingCode ? 'not-allowed' : 'pointer',
                    opacity: validatingCode ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
            style={{
              padding: '12px 16px',
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: BRAND_COLORS.white,
            }}
          >
            <option value="all">All Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Results Count */}
        {!loading && (
          <div style={{ marginBottom: '24px', color: BRAND_COLORS.gray, fontSize: '14px' }}>
            Showing {filteredQuizzes.length} of {quizzes.length} quizzes
          </div>
        )}

        {/* Quiz Grid */}
        {filteredQuizzes.length > 0 ? (
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
                        window.location.href = quizRoute;
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
                        window.location.href = previewRoute;
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
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: BRAND_COLORS.light,
              borderRadius: '8px',
              color: BRAND_COLORS.gray,
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h3 style={{ margin: '0 0 8px 0', color: BRAND_COLORS.navy }}>No Quizzes Found</h3>
            <p style={{ margin: '0' }}>Try a different search or filter</p>
          </div>
        )}
      </div>
    </>
  );
}
