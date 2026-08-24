'use client';

/**
 * Enhanced Quiz Card Component
 * Displays quiz with statistics, difficulty badge, and interactive controls
 */

import { useState, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizCard');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  orange: '#EA580C',
};

interface QuizCardProps {
  id: string;
  title: string;
  quizCode: string;
  totalQuestions: number;
  totalPoints: number;
  createdAt?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  stats?: {
    totalAttempts?: number;
    passRate?: number;
    averageScore?: number;
  };
}

export default function QuizCard({
  id,
  title,
  quizCode,
  totalQuestions,
  totalPoints,
  createdAt,
  difficulty = 'Medium',
  onEdit,
  onShare,
  onDelete,
  stats,
}: QuizCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [quizStats, setQuizStats] = useState(stats);

  // Fetch stats if not provided
  useEffect(() => {
    if (!stats && id) {
      fetchStats();
    }
  }, [id, stats]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quiz/${id}/stats`);
      const result = await response.json();

      if (response.ok) {
        setQuizStats(result.data?.statistics);
      }
    } catch (err) {
      log.error('Failed to fetch quiz stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Easy':
        return '#10b981'; // green
      case 'Medium':
        return '#f59e0b'; // amber
      case 'Hard':
        return '#ef4444'; // red
      default:
        return BRAND_COLORS.gray;
    }
  };

  const estimatedMinutes = Math.ceil((totalQuestions * 2) / 1); // ~2 min per question

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      style={{ borderColor: BRAND_COLORS.border }}
      className="border rounded-lg p-6 bg-white hover:shadow-lg transition-shadow"
    >
      {/* Header with Title and Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 style={{ color: BRAND_COLORS.navy }} className="text-lg font-bold mb-2 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Difficulty Badge */}
            <span
              style={{
                backgroundColor: getDifficultyColor(difficulty),
                color: 'white',
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold"
            >
              {difficulty}
            </span>

            {/* Quiz Code */}
            <span style={{ color: BRAND_COLORS.gray, borderColor: BRAND_COLORS.border }} className="px-3 py-1 border rounded-full text-xs font-mono">
              {quizCode}
            </span>

            {/* Date */}
            {createdAt && (
              <span style={{ color: BRAND_COLORS.gray }} className="text-xs">
                {formatDate(createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: BRAND_COLORS.light }}>
        {/* Questions */}
        <div>
          <p style={{ color: BRAND_COLORS.gray }} className="text-xs font-semibold mb-1">
            Questions
          </p>
          <p style={{ color: BRAND_COLORS.navy }} className="text-lg font-bold">
            {totalQuestions}
          </p>
        </div>

        {/* Points */}
        <div>
          <p style={{ color: BRAND_COLORS.gray }} className="text-xs font-semibold mb-1">
            Points
          </p>
          <p style={{ color: BRAND_COLORS.navy }} className="text-lg font-bold">
            {totalPoints}
          </p>
        </div>

        {/* Estimated Time */}
        <div>
          <p style={{ color: BRAND_COLORS.gray }} className="text-xs font-semibold mb-1">
            Est. Time
          </p>
          <p style={{ color: BRAND_COLORS.navy }} className="text-lg font-bold">
            ~{estimatedMinutes} min
          </p>
        </div>

        {/* Pass Rate (if available) */}
        {quizStats?.passRate !== undefined && (
          <div>
            <p style={{ color: BRAND_COLORS.gray }} className="text-xs font-semibold mb-1">
              Pass Rate
            </p>
            <p style={{ color: BRAND_COLORS.navy }} className="text-lg font-bold">
              {quizStats.passRate}%
            </p>
          </div>
        )}
      </div>

      {/* Statistics (if available) */}
      {quizStats && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
          <p style={{ color: BRAND_COLORS.gray }} className="text-xs font-semibold mb-2">
            Student Performance
          </p>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: BRAND_COLORS.gray }}>
              {quizStats.totalAttempts || 0} attempts
            </span>
            {quizStats.averageScore !== undefined && (
              <span style={{ color: BRAND_COLORS.navy }} className="font-bold">
                Avg: {Math.round(quizStats.averageScore)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={onEdit}
            style={{ borderColor: BRAND_COLORS.teal, color: BRAND_COLORS.teal }}
            className="flex-1 px-3 py-2 text-sm border rounded hover:bg-opacity-10 font-semibold transition-colors"
          >
            ✏️ Edit
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            style={{ borderColor: BRAND_COLORS.teal, color: BRAND_COLORS.teal }}
            className="flex-1 px-3 py-2 text-sm border rounded hover:bg-opacity-10 font-semibold transition-colors"
          >
            🔗 Share
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            style={{ borderColor: '#fca5a5', color: '#dc2626' }}
            className="flex-1 px-3 py-2 text-sm border rounded hover:bg-red-50 font-semibold transition-colors"
          >
            🗑️ Delete
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 rounded-lg flex items-center justify-center">
          <div style={{ borderBottomColor: BRAND_COLORS.teal }} className="animate-spin rounded-full h-6 w-6 border-b-2" />
        </div>
      )}
    </div>
  );
}
