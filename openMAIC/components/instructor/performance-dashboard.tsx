'use client';

import { formatDistanceToNow, format } from '@/lib/client/date-utils';

interface QuizResult {
  quiz_id: string;
  quiz_title: string;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  attempted_at: string | null;
  duration_seconds: number | null;
  status: 'pending' | 'in_progress' | 'completed';
}

interface StudentStats {
  total_quizzes_assigned: number;
  total_quizzes_completed: number;
  completion_percentage: number;
  average_score: number;
  last_activity: string | null;
}

interface PerformanceDashboardProps {
  studentName: string;
  studentEmail: string;
  stats: StudentStats;
  quizzes: QuizResult[];
  isLoading?: boolean;
}

export function PerformanceDashboard({
  studentName,
  studentEmail,
  stats,
  quizzes,
  isLoading = false,
}: PerformanceDashboardProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getStatusBadge = (status: string, percentage: number | null) => {
    if (status === 'pending' || status === 'in_progress') {
      return (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending
        </span>
      );
    }

    if (percentage === null) {
      return (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
          Not Started
        </span>
      );
    }

    if (percentage >= 60) {
      return (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Passed ({percentage}%)
        </span>
      );
    }

    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Failed ({percentage}%)
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-teal-500"></div>
        </div>
        <p className="mt-2 text-gray-600">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Student Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-gray-900">{studentName || 'Unknown'}</h2>
        <p className="text-gray-600">{studentEmail}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Quizzes Assigned */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Quizzes Assigned</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.total_quizzes_assigned}
              </p>
            </div>
            <div className="text-4xl opacity-20">📋</div>
          </div>
        </div>

        {/* Quizzes Completed */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.total_quizzes_completed}
              </p>
            </div>
            <div className="text-4xl opacity-20">✓</div>
          </div>
        </div>

        {/* Completion % */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Completion Rate</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">
                {stats.completion_percentage}%
              </p>
            </div>
            <div className="text-4xl opacity-20">📊</div>
          </div>
        </div>

        {/* Average Score */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Average Score</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {stats.average_score}%
              </p>
            </div>
            <div className="text-4xl opacity-20">⭐</div>
          </div>
        </div>

        {/* Last Activity */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Last Activity</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {stats.last_activity
                  ? formatDistanceToNow(new Date(stats.last_activity))
                  : 'Never'}
              </p>
            </div>
            <div className="text-4xl opacity-20">🕐</div>
          </div>
        </div>
      </div>

      {/* Quiz Results Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Quiz Results</h3>
        </div>

        {quizzes.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>No quizzes assigned yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quiz Name</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Score</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Percentage</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Attempted</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quizzes.map((quiz) => (
                  <tr key={quiz.quiz_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{quiz.quiz_title}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {quiz.score !== null ? quiz.score : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      {quiz.percentage !== null ? (
                        <span
                          className={`font-semibold ${
                            quiz.percentage >= 60 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {quiz.percentage}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(quiz.status, quiz.percentage)}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {quiz.attempted_at ? (
                        <span title={format(new Date(quiz.attempted_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(quiz.attempted_at))}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {formatDuration(quiz.duration_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      {stats.total_quizzes_completed > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Performance Insights</h3>

          <div className="space-y-3">
            {stats.completion_percentage === 100 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-medium text-green-900">All quizzes completed!</p>
                  <p className="text-sm text-green-700">{stats.total_quizzes_completed} out of {stats.total_quizzes_assigned} quizzes completed</p>
                </div>
              </div>
            )}

            {stats.average_score >= 80 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-xl">⭐</span>
                <div>
                  <p className="font-medium text-blue-900">Excellent performance!</p>
                  <p className="text-sm text-blue-700">Average score of {stats.average_score}% is outstanding</p>
                </div>
              </div>
            )}

            {stats.average_score >= 60 && stats.average_score < 80 && (
              <div className="flex items-start gap-3 p-3 bg-teal-50 rounded-lg">
                <span className="text-xl">👍</span>
                <div>
                  <p className="font-medium text-teal-900">Good performance</p>
                  <p className="text-sm text-teal-700">Average score of {stats.average_score}% shows good understanding</p>
                </div>
              </div>
            )}

            {stats.completion_percentage > 0 && stats.completion_percentage < 100 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <span className="text-xl">📌</span>
                <div>
                  <p className="font-medium text-yellow-900">Work in progress</p>
                  <p className="text-sm text-yellow-700">
                    {stats.total_quizzes_assigned - stats.total_quizzes_completed} quiz{stats.total_quizzes_assigned - stats.total_quizzes_completed !== 1 ? 'zes' : ''} remaining
                  </p>
                </div>
              </div>
            )}

            {stats.completion_percentage === 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-xl">❌</span>
                <div>
                  <p className="font-medium text-red-900">No quizzes started</p>
                  <p className="text-sm text-red-700">{stats.total_quizzes_assigned} quizzes assigned but none started yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
