/**
 * Instructor Dashboard Component
 * Shows instructor their quizzes, analytics, and sharing options
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User } from '@/lib/quiz-navigation/types';
import QuizCard from './QuizCard';
import { createLogger } from '@/lib/logger';

const log = createLogger('InstructorDashboard');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface InstructorDashboardProps {
  user: User;
}

export default function InstructorDashboard({ user }: InstructorDashboardProps) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    // Load quizzes on component mount
    const initializeQuizzes = async () => {
      await loadQuizzes();
    };
    initializeQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/instructor/quiz/list');

      if (!response.ok) {
        throw new Error('Failed to load quizzes');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load quizzes');
      }

      // Transform API response to Quiz type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedQuizzes: Quiz[] = (data.data.quizzes || []).map((q: any) => ({
        id: q.id,
        code: q.quiz_code,
        title: q.title,
        description: q.description,
        questionCount: q.total_questions || 0,
        createdBy: user.email,
        isPublished: q.is_published,
        status: q.is_published ? 'published' : 'draft',
        createdAt: q.created_at,
        analytics: {
          enrollmentCount: q.assignment_count || 0,
          avgScore: q.avg_score || 0,
          completionRate: q.completed_count && q.assignment_count ?
            (q.completed_count / q.assignment_count) * 100 : 0,
        },
      }));

      setQuizzes(formattedQuizzes);
      log.info(`Loaded ${formattedQuizzes.length} quizzes`);
    } catch (err) {
      log.error('Error loading quizzes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (filter === 'published') return q.status === 'published';
    if (filter === 'draft') return q.status === 'draft';
    return true;
  });

  return (
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
          My Quizzes
        </h1>
        <p
          style={{
            margin: '0',
            fontSize: '16px',
            color: BRAND_COLORS.gray,
            fontFamily: 'Calibri, sans-serif',
          }}
        >
          Create, manage, and share quizzes with your students
        </p>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => router.push('/teach/quiz/create')}
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
          + Create New Quiz
        </button>
        <button
          onClick={() => router.push('/teach/quiz/management')}
          style={{
            backgroundColor: BRAND_COLORS.teal,
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
          Manage Quizzes
        </button>
      </div>

      {/* Filter buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              backgroundColor: filter === f ? BRAND_COLORS.navy : BRAND_COLORS.light,
              color: filter === f ? BRAND_COLORS.white : BRAND_COLORS.navy,
              border: `1px solid ${BRAND_COLORS.border}`,
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'Calibri, sans-serif',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
            }}
          >
            {f === 'all' ? 'All Quizzes' : `${f.charAt(0).toUpperCase() + f.slice(1)}`} (
            {quizzes.filter((q) => (f === 'all' ? true : q.status === f)).length})
          </button>
        ))}
      </div>

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
          <div style={{ marginBottom: '16px' }}>Loading quizzes...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredQuizzes.length === 0 && (
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
            No {filter === 'all' ? '' : filter} quizzes yet
          </h3>
          <p style={{ margin: '0 0 16px 0' }}>
            {filter === 'all'
              ? 'Create your first quiz to get started'
              : `You don't have any ${filter} quizzes`}
          </p>
          <button
            onClick={() => router.push('/teach/quiz/create')}
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
            Create First Quiz
          </button>
        </div>
      )}

      {/* Quiz grid */}
      {!loading && filteredQuizzes.length > 0 && (
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
              variant="instructor"
              actions={[
                {
                  label: 'Edit',
                  onClick: () => router.push(`/teach/quiz/${quiz.id}/edit`),
                  variant: 'secondary',
                },
                {
                  label: 'Share',
                  onClick: () => router.push(`/teach/quiz/${quiz.id}/share`),
                  variant: 'primary',
                },
                {
                  label: 'Analytics',
                  onClick: () => router.push(`/teach/quiz/${quiz.id}/analytics`),
                  variant: 'secondary',
                },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
