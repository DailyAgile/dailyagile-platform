'use client';

/**
 * Student Progress Dashboard
 * Displays learning progress, streaks, stats, and recommendations
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';
import { getCurrentStudent, isStudentAuthenticated } from '@/lib/auth/student-auth';

const log = createLogger('StudentProgress');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  orange: '#EA580C',
};

interface Progress {
  totalQuizzesTaken: number;
  totalQuizzesAvailable: number;
  completionPercentage: number;
  averageScore: number;
  streakDays: number;
  lastAttemptAt?: string;
  recentAttempts: Array<{
    id: string;
    quizId: string;
    quizTitle: string;
    quizCode: string;
    score: number;
    percentage: number;
    timeTakenSeconds: number;
    attemptedAt: string;
    passed: boolean;
  }>;
}

interface Recommendation {
  id: string;
  title: string;
  quizCode: string;
  totalQuestions: number;
  totalPoints: number;
}

export default function ProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const student = getCurrentStudent();

  useEffect(() => {
    if (!isStudentAuthenticated()) {
      router.push('/auth/student-login');
      return;
    }

    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = student?.token;
      if (!token) throw new Error('No authentication token');

      // Fetch progress
      const progressResponse = await fetch('/api/student/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!progressResponse.ok) {
        throw new Error('Failed to load progress');
      }

      const progressData = await progressResponse.json();
      setProgress(progressData.data);

      // Fetch recommendations
      const recResponse = await fetch('/api/student/recommended-quizzes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (recResponse.ok) {
        const recData = await recResponse.json();
        setRecommendations(recData.data?.quizzes || []);
      }

      log.info('Progress loaded successfully');
    } catch (err) {
      log.error('Failed to load progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderBottomColor: BRAND_COLORS.teal }}
          />
          <p style={{ color: BRAND_COLORS.gray }}>Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
          <h1 className="text-3xl font-bold">My Progress</h1>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }} className="border rounded-lg p-6">
            <p style={{ color: '#991b1b' }} className="text-lg font-semibold">
              ⚠️ Error Loading Progress
            </p>
            <p style={{ color: '#7f1d1d' }} className="mt-2">
              {error}
            </p>
            <button
              onClick={loadProgress}
              style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
              className="mt-4 px-6 py-2 rounded-lg font-semibold hover:opacity-90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Your Learning Progress</h1>
          <p style={{ color: BRAND_COLORS.gray }}>
            Track your quiz attempts, streaks, and recommendations
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Completion */}
          <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white">
            <p style={{ color: BRAND_COLORS.gray }} className="text-sm font-semibold mb-2">
              Completion
            </p>
            <p style={{ color: BRAND_COLORS.navy }} className="text-3xl font-bold mb-2">
              {progress.completionPercentage}%
            </p>
            <div style={{ backgroundColor: BRAND_COLORS.light }} className="w-full h-2 rounded-full overflow-hidden">
              <div
                style={{
                  backgroundColor: BRAND_COLORS.teal,
                  width: `${progress.completionPercentage}%`,
                }}
                className="h-full transition-all"
              />
            </div>
            <p style={{ color: BRAND_COLORS.gray }} className="text-xs mt-2">
              {progress.totalQuizzesTaken} of {progress.totalQuizzesAvailable} quizzes
            </p>
          </div>

          {/* Average Score */}
          <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white">
            <p style={{ color: BRAND_COLORS.gray }} className="text-sm font-semibold mb-2">
              Average Score
            </p>
            <p style={{ color: BRAND_COLORS.navy }} className="text-3xl font-bold">
              {Math.round(progress.averageScore)}%
            </p>
            <p style={{ color: BRAND_COLORS.gray }} className="text-xs mt-2">
              {progress.averageScore >= 80
                ? '🌟 Excellent'
                : progress.averageScore >= 70
                  ? '✓ Good'
                  : 'Keep improving!'}
            </p>
          </div>

          {/* Study Streak */}
          <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white">
            <p style={{ color: BRAND_COLORS.gray }} className="text-sm font-semibold mb-2">
              Study Streak
            </p>
            <p style={{ color: BRAND_COLORS.navy }} className="text-3xl font-bold">
              {progress.streakDays}
            </p>
            <p style={{ color: BRAND_COLORS.gray }} className="text-xs mt-2">
              {progress.streakDays === 0
                ? 'Start today!'
                : progress.streakDays === 1
                  ? 'Day'
                  : 'Days'} {progress.streakDays > 1 ? 'consecutive' : ''}
            </p>
          </div>

          {/* Last Attempt */}
          <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white">
            <p style={{ color: BRAND_COLORS.gray }} className="text-sm font-semibold mb-2">
              Last Attempt
            </p>
            {progress.lastAttemptAt ? (
              <>
                <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold">
                  {new Date(progress.lastAttemptAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p style={{ color: BRAND_COLORS.gray }} className="text-xs mt-2">
                  {new Date(progress.lastAttemptAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </>
            ) : (
              <p style={{ color: BRAND_COLORS.gray }} className="text-xs">
                No attempts yet
              </p>
            )}
          </div>
        </div>

        {/* Recent Attempts */}
        <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white mb-8">
          <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-4">
            Recent Attempts
          </h2>

          {progress.recentAttempts.length === 0 ? (
            <p style={{ color: BRAND_COLORS.gray }} className="text-center py-8">
              No quiz attempts yet. Start taking quizzes to build your history!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottomColor: BRAND_COLORS.border }} className="border-b">
                    <th style={{ color: BRAND_COLORS.navy }} className="px-4 py-2 text-left font-semibold">
                      Quiz
                    </th>
                    <th style={{ color: BRAND_COLORS.navy }} className="px-4 py-2 text-left font-semibold">
                      Score
                    </th>
                    <th style={{ color: BRAND_COLORS.navy }} className="px-4 py-2 text-left font-semibold">
                      Percentage
                    </th>
                    <th style={{ color: BRAND_COLORS.navy }} className="px-4 py-2 text-left font-semibold">
                      Time
                    </th>
                    <th style={{ color: BRAND_COLORS.navy }} className="px-4 py-2 text-left font-semibold">
                      Date
                    </th>
                    <th style={{ color: BRAND_COLORS.navy }} className="px-4 py-2 text-left font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {progress.recentAttempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      style={{ borderBottomColor: BRAND_COLORS.border }}
                      className="border-b hover:bg-opacity-50 transition-colors"
                    >
                      <td style={{ color: BRAND_COLORS.navy }} className="px-4 py-3 font-semibold">
                        {attempt.quizTitle}
                        <br />
                        <span style={{ color: BRAND_COLORS.gray }} className="text-xs font-mono">
                          {attempt.quizCode}
                        </span>
                      </td>
                      <td style={{ color: BRAND_COLORS.navy }} className="px-4 py-3 font-bold">
                        {attempt.score}
                      </td>
                      <td style={{ color: BRAND_COLORS.navy }} className="px-4 py-3 font-bold">
                        {Math.round(attempt.percentage)}%
                      </td>
                      <td style={{ color: BRAND_COLORS.gray }} className="px-4 py-3">
                        {formatTime(attempt.timeTakenSeconds)}
                      </td>
                      <td style={{ color: BRAND_COLORS.gray }} className="px-4 py-3">
                        {formatDate(attempt.attemptedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          style={{
                            backgroundColor: attempt.passed ? '#d1fae5' : '#fee2e2',
                            color: attempt.passed ? '#065f46' : '#991b1b',
                          }}
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                        >
                          {attempt.passed ? '✓ Passed' : '✗ Needs Work'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-4">
              🎯 Recommended for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((quiz) => (
                <div
                  key={quiz.id}
                  style={{ borderColor: BRAND_COLORS.border }}
                  className="border rounded-lg p-4 bg-white hover:shadow-lg transition-shadow"
                >
                  <h3 style={{ color: BRAND_COLORS.navy }} className="font-bold mb-2 line-clamp-2">
                    {quiz.title}
                  </h3>
                  <p style={{ color: BRAND_COLORS.gray }} className="text-xs mb-3">
                    {quiz.totalQuestions} questions • {quiz.totalPoints} points
                  </p>
                  <button
                    onClick={() => router.push(`/learn/quizzes`)}
                    style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
                    className="w-full px-4 py-2 rounded-lg font-semibold hover:opacity-90 text-sm"
                  >
                    Take Quiz
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
