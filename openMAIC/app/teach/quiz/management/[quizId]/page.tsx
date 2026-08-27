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

interface QuestionAnalytics {
  question_id: string;
  question_text: string;
  question_number: number;
  total_attempts: number;
  correct_count: number;
  correct_percentage: number;
  average_time_seconds: number;
}

interface QuizInstructor {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  assigned_at: string;
}

type TabType = 'assignments' | 'results' | 'team';

export default function QuizDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [teamInstructors, setTeamInstructors] = useState<QuizInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('assignments');
  const [stats, setStats] = useState<any>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [avgTimePerQuestion, setAvgTimePerQuestion] = useState<number>(0);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'viewer'>('admin');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      } else if (activeTab === 'results') {
        const response = await fetch(`/api/instructor/quiz/${quizId}/results`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load results');
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to load results');
        setQuiz(data.data.quiz);
        setResults(data.data.results || []);
        setStats(data.data.stats);

        // Fetch question-level analytics
        try {
          const analyticsResponse = await fetch(`/api/instructor/quiz/${quizId}/question-analytics`, {
            credentials: 'include',
          });
          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            if (analyticsData.success && analyticsData.data) {
              setQuestionAnalytics(analyticsData.data.question_analytics || []);
              setAvgTimePerQuestion(analyticsData.data.avg_time_per_question || 0);
            }
          }
        } catch (err) {
          log.warn('Failed to load question analytics:', err);
          // This is non-critical, so we don't throw
        }
      } else if (activeTab === 'team') {
        // Team tab - in future will load team instructors from API
        // For now, showing placeholder UI
        setTeamInstructors([]);
      }
    } catch (err) {
      log.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      setError('Please enter an instructor email');
      return;
    }

    try {
      setAddingAdmin(true);
      setError(null);

      const response = await fetch(`/api/instructor/quiz/${quizId}/add-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          instructor_email: newAdminEmail.trim(),
          role: adminRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to add admin');
      }

      log.info(`✅ Admin added: ${newAdminEmail}`);
      setSuccessMessage(`${newAdminEmail} added as ${adminRole}`);
      setNewAdminEmail('');
      setAdminRole('admin');

      // Reload team data
      await loadData();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      log.error('Error adding admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (instructorId: string) => {
    if (!confirm('Are you sure you want to remove this instructor?')) {
      return;
    }

    try {
      setRemovingAdminId(instructorId);
      setError(null);

      const response = await fetch(
        `/api/instructor/quiz/${quizId}/remove-admin?instructor_id=${instructorId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove admin');
      }

      log.info(`✅ Admin removed: ${instructorId}`);
      setSuccessMessage('Instructor removed from quiz');

      // Reload team data
      await loadData();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      log.error('Error removing admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove admin');
    } finally {
      setRemovingAdminId(null);
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

        {successMessage && (
          <div
            style={{
              backgroundColor: '#DCFCE7',
              border: '1px solid #86EFAC',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#16A34A',
              fontSize: '14px',
            }}
          >
            ✓ {successMessage}
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

        {activeTab === 'results' && questionAnalytics.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  color: BRAND_COLORS.navy,
                  fontSize: '18px',
                  fontWeight: '700',
                  margin: '0 0 16px 0',
                }}
              >
                {'📊'} Question-Level Analytics
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                {/* Easiest Question */}
                {(() => {
                  const easiest = questionAnalytics.reduce((a, b) =>
                    a.correct_percentage > b.correct_percentage ? a : b
                  );
                  return (
                    <div
                      style={{
                        backgroundColor: BRAND_COLORS.white,
                        borderRadius: '8px',
                        padding: '16px',
                        border: `2px solid ${BRAND_COLORS.teal}`,
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          color: BRAND_COLORS.teal,
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}
                      >
                        🎯 Easiest Question
                      </p>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          color: BRAND_COLORS.navy,
                          fontSize: '14px',
                          fontWeight: '600',
                          lineHeight: '1.4',
                        }}
                      >
                        Q{easiest.question_number}: {easiest.question_text.substring(0, 50)}...
                      </p>
                      <p
                        style={{
                          margin: '0',
                          color: BRAND_COLORS.gray,
                          fontSize: '13px',
                        }}
                      >
                        {easiest.correct_percentage}% correct ({easiest.correct_count}/{easiest.total_attempts})
                      </p>
                    </div>
                  );
                })()}

                {/* Hardest Question */}
                {(() => {
                  const hardest = questionAnalytics.reduce((a, b) =>
                    a.correct_percentage < b.correct_percentage ? a : b
                  );
                  return (
                    <div
                      style={{
                        backgroundColor: BRAND_COLORS.white,
                        borderRadius: '8px',
                        padding: '16px',
                        border: `2px solid ${BRAND_COLORS.orange}`,
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          color: BRAND_COLORS.orange,
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}
                      >
                        ⚠️ Hardest Question
                      </p>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          color: BRAND_COLORS.navy,
                          fontSize: '14px',
                          fontWeight: '600',
                          lineHeight: '1.4',
                        }}
                      >
                        Q{hardest.question_number}: {hardest.question_text.substring(0, 50)}...
                      </p>
                      <p
                        style={{
                          margin: '0',
                          color: BRAND_COLORS.gray,
                          fontSize: '13px',
                        }}
                      >
                        {hardest.correct_percentage}% correct ({hardest.correct_count}/{hardest.total_attempts})
                      </p>
                    </div>
                  );
                })()}

                {/* Avg Time Per Question */}
                <div
                  style={{
                    backgroundColor: BRAND_COLORS.white,
                    borderRadius: '8px',
                    padding: '16px',
                    border: `2px solid ${BRAND_COLORS.navy}`,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 8px 0',
                      color: BRAND_COLORS.navy,
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    ⏱️ Average Time Per Question
                  </p>
                  <p
                    style={{
                      margin: '0',
                      color: BRAND_COLORS.navy,
                      fontSize: '24px',
                      fontWeight: '700',
                    }}
                  >
                    {Math.round(avgTimePerQuestion)}s
                  </p>
                </div>
              </div>

              {/* Question Breakdown Table */}
              <div
                style={{
                  backgroundColor: BRAND_COLORS.white,
                  borderRadius: '8px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  overflow: 'hidden',
                }}
              >
                <h3
                  style={{
                    color: BRAND_COLORS.navy,
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '16px',
                    margin: '0',
                    borderBottom: `1px solid ${BRAND_COLORS.border}`,
                    backgroundColor: BRAND_COLORS.light,
                  }}
                >
                  All Questions Breakdown
                </h3>
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
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: BRAND_COLORS.navy,
                          textTransform: 'uppercase',
                        }}
                      >
                        Question
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: BRAND_COLORS.navy,
                          textTransform: 'uppercase',
                        }}
                      >
                        Correct %
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
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
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: BRAND_COLORS.navy,
                          textTransform: 'uppercase',
                        }}
                      >
                        Avg Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionAnalytics.map((q, idx) => (
                      <tr
                        key={q.question_id}
                        style={{
                          borderBottom: `1px solid ${BRAND_COLORS.border}`,
                          backgroundColor: idx % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light,
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '13px',
                            color: BRAND_COLORS.navy,
                            fontWeight: '500',
                          }}
                        >
                          Q{q.question_number}: {q.question_text.substring(0, 40)}...
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: q.correct_percentage >= 70 ? BRAND_COLORS.teal : q.correct_percentage >= 40 ? BRAND_COLORS.orange : '#DC2626',
                          }}
                        >
                          {q.correct_percentage}%
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '13px',
                            color: BRAND_COLORS.gray,
                          }}
                        >
                          {q.correct_count}/{q.total_attempts}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '13px',
                            color: BRAND_COLORS.gray,
                          }}
                        >
                          {Math.round(q.average_time_seconds)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          {(['assignments', 'results', 'team'] as const).map((tab) => (
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
              {tab === 'team' ? '👥 Team' : tab}
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
        ) : activeTab === 'team' ? (
          <div>
            {/* Add Admin Form */}
            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                borderRadius: '8px',
                border: `1px solid ${BRAND_COLORS.border}`,
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <h3
                style={{
                  color: BRAND_COLORS.navy,
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0 0 16px 0',
                }}
              >
                👥 Add Instructor to Team
              </h3>

              <form onSubmit={handleAddAdmin} style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label
                    style={{
                      color: BRAND_COLORS.navy,
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    Instructor Email
                  </label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="instructor@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${BRAND_COLORS.border}`,
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      color: BRAND_COLORS.navy,
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    Role
                  </label>
                  <select
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value as 'admin' | 'viewer')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${BRAND_COLORS.border}`,
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      backgroundColor: BRAND_COLORS.white,
                      color: BRAND_COLORS.navy,
                    }}
                  >
                    <option value="admin">Admin (can edit quiz)</option>
                    <option value="viewer">Viewer (read-only)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingAdmin}
                  style={{
                    backgroundColor: BRAND_COLORS.teal,
                    color: BRAND_COLORS.white,
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: addingAdmin ? 'not-allowed' : 'pointer',
                    opacity: addingAdmin ? 0.6 : 1,
                  }}
                >
                  {addingAdmin ? '⏳ Adding...' : '➕ Add to Team'}
                </button>
              </form>
            </div>

            {/* Team Members List */}
            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                borderRadius: '8px',
                border: `1px solid ${BRAND_COLORS.border}`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  backgroundColor: BRAND_COLORS.light,
                  borderBottom: `1px solid ${BRAND_COLORS.border}`,
                  padding: '16px',
                }}
              >
                <h3
                  style={{
                    color: BRAND_COLORS.navy,
                    fontSize: '14px',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  Team Members
                </h3>
              </div>

              {teamInstructors.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: BRAND_COLORS.gray,
                  }}
                >
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    No additional instructors yet. Add someone to collaborate.
                  </p>
                </div>
              ) : (
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
                        Role
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
                        Added
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
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamInstructors.map((instructor) => (
                      <tr
                        key={instructor.id}
                        style={{
                          borderBottom: `1px solid ${BRAND_COLORS.border}`,
                        }}
                      >
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: BRAND_COLORS.navy,
                          }}
                        >
                          {instructor.email}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: instructor.role === 'owner' ? BRAND_COLORS.navy : BRAND_COLORS.teal,
                              color: BRAND_COLORS.white,
                              padding: '4px 8px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                            }}
                          >
                            {instructor.role}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: BRAND_COLORS.gray,
                          }}
                        >
                          {new Date(instructor.assigned_at).toLocaleDateString()}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                          }}
                        >
                          {instructor.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveAdmin(instructor.id)}
                              disabled={removingAdminId === instructor.id}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#EF4444',
                                border: `1px solid #EF4444`,
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: removingAdminId === instructor.id ? 'not-allowed' : 'pointer',
                                opacity: removingAdminId === instructor.id ? 0.6 : 1,
                              }}
                            >
                              {removingAdminId === instructor.id ? '⏳' : '✕ Remove'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
