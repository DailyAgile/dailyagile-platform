'use client';

/**
 * Quiz Details Page
 * View assignments and results for a specific quiz
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizDetails');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Assignment {
  id: string;
  assignment_code: string;
  student: Student;
  expires_at: string;
  status: 'active' | 'expired' | 'archived';
  attempts: number;
  completed: boolean;
  score?: number;
  created_at: string;
}

interface Result {
  id: string;
  assignment_id: string;
  student: Student;
  status: 'pending' | 'in_progress' | 'completed';
  score?: number;
  percentage?: number;
  attempted_at: string;
  duration_seconds?: number;
}

interface Quiz {
  id: string;
  title: string;
  total_questions: number;
  total_points: number;
}

type TabType = 'assignments' | 'results';

export default function QuizDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('assignments');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [quizId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'assignments') {
        const response = await fetch(`/api/instructor/quiz/${quizId}/assignments`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load assignments');
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to load assignments');
        setAssignments(data.data.assignments || []);
      } else {
        const response = await fetch(`/api/instructor/quiz/${quizId}/results`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load results');
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to load results');
        setQuiz(data.data.quiz);
        setResults(data.data.results || []);
        setStats(data.data.stats);
      }
    } catch (err) {
      log.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const AssignmentRow = ({ assignment }: { assignment: Assignment }) => (
    <tr
      style={{
        borderBottom: `1px solid ${BRAND_COLORS.border}`,
      }}
    >
      <td
        style={{
          padding: '12px',
          fontSize: '13px',
          color: BRAND_COLORS.navy,
          fontWeight: '500',
        }}
      >
        {assignment.student.first_name} {assignment.student.last_name}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {assignment.student.email}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {assignment.assignment_code}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {new Date(assignment.expires_at).toLocaleDateString()}
      </td>
      <td
        style={{
          padding: '12px',
          fontSize: '13px',
          color:
            assignment.status === 'active'
              ? BRAND_COLORS.teal
              : assignment.status === 'expired'
                ? BRAND_COLORS.orange
                : BRAND_COLORS.gray,
        }}
      >
        {assignment.status}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {assignment.attempts} attempt{assignment.attempts !== 1 ? 's' : ''}
      </td>
      <td style={{ padding: '12px', fontSize: '13px' }}>
        {assignment.completed ? (
          <span style={{ color: BRAND_COLORS.teal }}>✓ Completed</span>
        ) : (
          <span style={{ color: BRAND_COLORS.gray }}>Pending</span>
        )}
      </td>
    </tr>
  );

  const ResultRow = ({ result }: { result: Result }) => (
    <tr
      style={{
        borderBottom: `1px solid ${BRAND_COLORS.border}`,
      }}
    >
      <td
        style={{
          padding: '12px',
          fontSize: '13px',
          color: BRAND_COLORS.navy,
          fontWeight: '500',
        }}
      >
        {result.student.first_name} {result.student.last_name}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {result.student.email}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {result.status === 'completed'
          ? `${result.score} / ${quiz?.total_points}`
          : result.status}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {result.percentage !== null ? `${result.percentage}%` : '-'}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {result.duration_seconds ? `${Math.round(result.duration_seconds / 60)} min` : '-'}
      </td>
      <td style={{ padding: '12px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        {new Date(result.attempted_at).toLocaleDateString()}
      </td>
    </tr>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND_COLORS.light,
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <button
          onClick={() => router.back()}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: BRAND_COLORS.teal,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            padding: '0',
            marginBottom: '16px',
          }}
        >
          ← Back
        </button>

        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              margin: '0 0 8px 0',
              color: BRAND_COLORS.navy,
              fontSize: '28px',
              fontWeight: '700',
            }}
          >
            Quiz Details
          </h1>
          <p
            style={{
              margin: '0',
              color: BRAND_COLORS.gray,
              fontSize: '14px',
            }}
          >
            {quiz?.title} • {quiz?.total_questions} questions • {quiz?.total_points} points
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#DC2626',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Stats */}
        {activeTab === 'results' && stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${BRAND_COLORS.border}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  color: BRAND_COLORS.gray,
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Total Assignments
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.navy,
                  fontSize: '24px',
                  fontWeight: '700',
                }}
              >
                {stats.total_attempts}
              </p>
            </div>

            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${BRAND_COLORS.border}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  color: BRAND_COLORS.gray,
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Completed
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.teal,
                  fontSize: '24px',
                  fontWeight: '700',
                }}
              >
                {stats.completed_count}
              </p>
            </div>

            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${BRAND_COLORS.border}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  color: BRAND_COLORS.gray,
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Average Score
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.navy,
                  fontSize: '24px',
                  fontWeight: '700',
                }}
              >
                {stats.average_score}%
              </p>
            </div>

            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${BRAND_COLORS.border}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  color: BRAND_COLORS.gray,
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Pass Rate
              </p>
              <p
                style={{
                  margin: '0',
                  color: stats.pass_rate >= 70 ? BRAND_COLORS.teal : BRAND_COLORS.orange,
                  fontSize: '24px',
                  fontWeight: '700',
                }}
              >
                {stats.pass_rate}%
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: `2px solid ${BRAND_COLORS.border}`,
          }}
        >
          {(['assignments', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? BRAND_COLORS.teal : 'transparent',
                color: activeTab === tab ? BRAND_COLORS.white : BRAND_COLORS.gray,
                border: 'none',
                borderBottom: activeTab === tab ? `3px solid ${BRAND_COLORS.teal}` : 'none',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p style={{ color: BRAND_COLORS.gray }}>Loading...</p>
        ) : activeTab === 'assignments' ? (
          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '8px',
              border: `1px solid ${BRAND_COLORS.border}`,
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: BRAND_COLORS.light,
                    borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  }}
                >
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Student
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Code
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Expires
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Attempts
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Done
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: BRAND_COLORS.gray,
                      }}
                    >
                      No assignments yet
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <AssignmentRow key={assignment.id} assignment={assignment} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '8px',
              border: `1px solid ${BRAND_COLORS.border}`,
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: BRAND_COLORS.light,
                    borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  }}
                >
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Student
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Score
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Percentage
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Duration
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                      textTransform: 'uppercase',
                    }}
                  >
                    Attempted
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: BRAND_COLORS.gray,
                      }}
                    >
                      No results yet
                    </td>
                  </tr>
                ) : (
                  results.map((result) => (
                    <ResultRow key={result.id} result={result} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
