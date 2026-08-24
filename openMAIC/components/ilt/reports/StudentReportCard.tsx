'use client';

/**
 * Student Report Card Component
 * Individual student performance report with stats and trend visualization
 *
 * Features:
 * - Student profile info (name, email, enrollment date)
 * - Summary stats (avg score, quizzes taken, completion rate)
 * - Score trend chart (simple line visualization)
 * - Quiz submission list with scores and dates
 * - Color-coded performance indicators
 * - Responsive design
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import type { StudentReportResponse, StudentRosterWithDetails } from '@/lib/ilt/types/models';
import { toast } from '@/components/ilt/ui/Toast';

interface StudentReportCardProps {
  student_id: string;
  student?: StudentRosterWithDetails;
  classroom_id: string;
}

export function StudentReportCard({
  student_id,
  student,
  classroom_id,
}: StudentReportCardProps) {
  const [report, setReport] = useState<StudentReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch student report
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/classrooms/${classroom_id}/students/${student_id}/report`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to load report');
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        console.error('Failed to fetch report:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [student_id, classroom_id]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-500">Loading report...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Error loading report</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const trendDirection =
    report.quizzes.length > 1
      ? report.quizzes[report.quizzes.length - 1].percentage! >
        report.quizzes[0].percentage!
        ? 'up'
        : 'down'
      : null;

  const passPercentage =
    report.quizzes.length > 0
      ? Math.round(
          (report.quizzes.filter((q) => (q.percentage ?? 0) >= 70).length /
            report.quizzes.length) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">{report.student_name}</h2>
            <p className="text-sm text-zinc-600">{report.email}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Enrolled {new Date(report.enrollment_date).toLocaleDateString()}
              </div>
              <div
                className={`px-2.5 py-0.5 rounded-full font-medium ${
                  report.status === 'active'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-zinc-100 text-zinc-800'
                }`}
              >
                {report.status === 'active' ? '🟢' : '🔴'} {report.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-teal-600">
            {report.summary.average_score.toFixed(1)}%
          </div>
          <p className="text-xs font-medium text-zinc-600 mt-1">Average Score</p>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-zinc-900">
            {report.summary.quizzes_completed}
          </div>
          <p className="text-xs font-medium text-zinc-600 mt-1">Quizzes Completed</p>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-teal-600">
            {report.summary.completion_rate.toFixed(0)}%
          </div>
          <p className="text-xs font-medium text-zinc-600 mt-1">Completion Rate</p>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{passPercentage}%</div>
          <p className="text-xs font-medium text-zinc-600 mt-1">Passing Rate</p>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-gradient-to-br from-green-50 to-teal-50 border border-teal-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-teal-900">Highest Score</h3>
          </div>
          <p className="text-3xl font-bold text-teal-700">
            {report.summary.highest_score.toFixed(1)}%
          </p>
          <p className="text-xs text-teal-700 mt-2">Keep up the excellent work!</p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Lowest Score</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-700">
            {report.summary.lowest_score.toFixed(1)}%
          </p>
          <p className="text-xs text-yellow-700 mt-2">Review this topic to improve</p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Total Time Spent</h3>
          </div>
          <p className="text-3xl font-bold text-blue-700">
            {Math.round(report.summary.total_time_spent / 60)}h
          </p>
          <p className="text-xs text-blue-700 mt-2">
            {report.summary.last_activity
              ? `Last active ${new Date(report.summary.last_activity).toLocaleDateString()}`
              : 'No recent activity'}
          </p>
        </div>
      </div>

      {/* Simple Trend Chart */}
      {report.quizzes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Score Trend
          </h3>
          <div className="rounded-lg border border-zinc-200 p-4">
            <ScoreTrendChart quizzes={report.quizzes} />
          </div>
        </div>
      )}

      {/* Strengths and Improvements */}
      <div className="grid gap-4 sm:grid-cols-2">
        {report.strengths.length > 0 && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {report.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.improvements.length > 0 && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {report.improvements.map((improvement, i) => (
                <li key={i} className="text-sm text-yellow-800 flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Quiz Submissions Table */}
      {report.quizzes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">Quiz Submissions</h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-900">
                    Quiz
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-900">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-900">
                    Percentage
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-900">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.quizzes.map((quiz, i) => (
                  <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {quiz.title}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-600">
                      {quiz.score !== null && quiz.max_score !== null
                        ? `${quiz.score}/${quiz.max_score}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {quiz.percentage !== null ? (
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                            quiz.percentage >= 85
                              ? 'bg-green-100 text-green-800'
                              : quiz.percentage >= 70
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {quiz.percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {quiz.completed_at
                        ? new Date(quiz.completed_at).toLocaleDateString()
                        : quiz.submitted_at
                          ? `${new Date(quiz.submitted_at).toLocaleDateString()} (Pending)`
                          : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple SVG-based score trend chart
 */
function ScoreTrendChart({
  quizzes,
}: {
  quizzes: StudentReportResponse['quizzes'];
}) {
  const width = 400;
  const height = 200;
  const padding = 40;

  // Filter quizzes with scores
  const scoredQuizzes = quizzes.filter((q) => q.percentage !== null);

  if (scoredQuizzes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-zinc-500">No scored quizzes yet</p>
      </div>
    );
  }

  const scores = scoredQuizzes.map((q) => q.percentage ?? 0);
  const maxScore = Math.max(...scores, 100);
  const minScore = Math.min(...scores, 0);
  const range = maxScore - minScore || 100;

  // Calculate points
  const points = scores.map((score, i) => {
    const x = padding + ((i / (scores.length - 1 || 1)) * (width - padding * 2));
    const y = height - padding - ((score - minScore) / range) * (height - padding * 2);
    return { x, y, score };
  });

  // Create path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="min-h-48"
    >
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((percent) => {
        const y = height - padding - ((percent - minScore) / range) * (height - padding * 2);
        return (
          <g key={`grid-${percent}`}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e4e4e7"
              strokeWidth="1"
              strokeDasharray="4"
            />
            <text
              x={padding - 10}
              y={y + 4}
              fontSize="12"
              fill="#9ca3af"
              textAnchor="end"
            >
              {percent}%
            </text>
          </g>
        );
      })}

      {/* Path */}
      <path d={pathD} stroke="#14b8a6" strokeWidth="3" fill="none" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={`point-${i}`}>
          <circle cx={p.x} cy={p.y} r="4" fill="#14b8a6" />
          <text
            x={p.x}
            y={p.y - 12}
            fontSize="12"
            fontWeight="bold"
            fill="#0f766e"
            textAnchor="middle"
          >
            {p.score.toFixed(0)}%
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {scoredQuizzes.map((quiz, i) => {
        const x = padding + ((i / (scoredQuizzes.length - 1 || 1)) * (width - padding * 2));
        return (
          <text
            key={`label-${i}`}
            x={x}
            y={height - 5}
            fontSize="11"
            fill="#6b7280"
            textAnchor="middle"
          >
            Q{i + 1}
          </text>
        );
      })}
    </svg>
  );
}
