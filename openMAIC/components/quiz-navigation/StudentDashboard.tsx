/**
 * Student Dashboard Component
 * Shows student their purchased quizzes and progress
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, User, StudentProgress } from '@/lib/quiz-navigation/types';
import QuizCard from './QuizCard';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentDashboard');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#16a34a',
};

interface StudentDashboardProps {
  user?: User;
}

export default function StudentDashboard({ user: _user }: StudentDashboardProps) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<Map<string, StudentProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch student's quizzes
      const quizzesResponse = await fetch('/api/student/quizzes');
      if (!quizzesResponse.ok) {
        throw new Error('Failed to load quizzes');
      }

      const quizzesData = await quizzesResponse.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedQuizzes: Quiz[] = (quizzesData.data?.quizzes || []).map((q: any) => ({
        id: q.id,
        code: q.quiz_code,
        title: q.title,
        description: q.description,
        questionCount: q.total_questions || 0,
        createdBy: q.created_by || 'Unknown',
        isPublished: q.is_published,
        status: 'published',
        createdAt: q.created_at,
        courseId: q.course_id,
        courseName: q.course_name,
      }));

      setQuizzes(formattedQuizzes);

      // Fetch progress for each quiz
      const progressResponse = await fetch('/api/student/progress');
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        const progressMap = new Map<string, StudentProgress>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (progressData.data?.progress || []).forEach((p: any) => {
          progressMap.set(p.quiz_id, {
            quizId: p.quiz_id,
            completionPercent: p.completion_percent || 0,
            currentScore: p.current_score,
            bestScore: p.best_score,
            lastAttemptDate: p.last_attempt_date,
            status: p.status || 'not-started',
          });
        });

        setProgress(progressMap);
      }

      log.info(`Loaded ${formattedQuizzes.length} quizzes with progress`);
    } catch (err) {
      log.error('Error loading student data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const prog = progress.get(q.id);
    if (!prog) return filter === 'all';
    if (filter === 'completed') return prog.status === 'completed';
    if (filter === 'in-progress') return prog.status === 'in-progress';
    return true;
  });

  const completedCount = quizzes.filter((q) => progress.get(q.id)?.status === 'completed').length;
  const inProgressCount = quizzes.filter((q) => progress.get(q.id)?.status === 'in-progress')
    .length;
  const completionPercentage = quizzes.length > 0 ? (completedCount / quizzes.length) * 100 : 0;

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
          My Learning
        </h1>
        <p
          style={{
            margin: '0',
            fontSize: '16px',
            color: BRAND_COLORS.gray,
            fontFamily: 'Calibri, sans-serif',
          }}
        >
          Track your progress and continue your quizzes
        </p>
      </div>

      {/* Progress summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 8px 0',
            }}
          >
            {Math.round(completionPercentage)}%
          </div>
          <div
            style={{
              fontSize: '13px',
              color: BRAND_COLORS.gray,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Overall Completion
          </div>
        </div>

        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: BRAND_COLORS.success,
              margin: '0 0 8px 0',
            }}
          >
            {completedCount}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: BRAND_COLORS.gray,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Completed
          </div>
        </div>

        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: BRAND_COLORS.orange,
              margin: '0 0 8px 0',
            }}
          >
            {inProgressCount}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: BRAND_COLORS.gray,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            In Progress
          </div>
        </div>

        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 8px 0',
            }}
          >
            {quizzes.length}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: BRAND_COLORS.gray,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Total Quizzes
          </div>
        </div>
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
        {(['all', 'in-progress', 'completed'] as const).map((f) => {
          let count = quizzes.length;
          if (f === 'completed') count = completedCount;
          if (f === 'in-progress') count = inProgressCount;

          return (
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
              {f === 'all' ? 'All' : f.replace('-', ' ')} ({count})
            </button>
          );
        })}
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
          Loading your quizzes...
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
            No {filter === 'all' ? '' : filter} quizzes
          </h3>
          <p style={{ margin: '0' }}>
            {filter === 'all'
              ? 'You haven\'t purchased any quizzes yet'
              : `You don't have any ${filter} quizzes`}
          </p>
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
          {filteredQuizzes.map((quiz) => {
            const quizProgress = progress.get(quiz.id) || {
              quizId: quiz.id,
              completionPercent: 0,
              currentScore: undefined,
              bestScore: undefined,
              lastAttemptDate: undefined,
              status: 'not-started' as const,
            };

            return (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                variant="student"
                progress={{
                  completionPercent: quizProgress.completionPercent,
                  status: quizProgress.status,
                  currentScore: quizProgress.bestScore,
                }}
                actions={[
                  {
                    label: quizProgress.status === 'not-started' ? 'Start Quiz' : 'Resume',
                    onClick: () => router.push(`/student/quiz/${quiz.id}/practice`),
                    variant: 'primary',
                  },
                  {
                    label: 'View Results',
                    onClick: () => router.push(`/student/quiz/${quiz.id}/results`),
                    variant: 'secondary',
                    disabled: quizProgress.status === 'not-started',
                  },
                ]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
