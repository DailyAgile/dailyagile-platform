'use client';

/**
 * Quiz Performance Summary Report
 * Shows per-quiz metrics: attempts, avg score, pass rate, completion, question difficulty
 */

import React, { useState, useEffect } from 'react';
import { QuizPerformanceMetrics } from '@/lib/analytics/quiz-reports';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizPerformanceReport');

interface Props {
  quizzes: Array<{ id: string; title: string; quiz_code: string }>;
}

export function QuizPerformanceReport({ quizzes }: Props) {
  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizzes[0]?.id || '');
  const [metrics, setMetrics] = useState<QuizPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedQuizId) {
      loadMetrics();
    }
  }, [selectedQuizId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics/quiz-performance?quizId=${selectedQuizId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      log.error('Failed to load quiz performance:', err);
      setError('Failed to load quiz performance data');
    } finally {
      setLoading(false);
    }
  };

  if (!quizzes.length) {
    return (
      <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-6">
        <p className="text-[#64748B]">No quizzes available for analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#1E3A5F] mb-2">Select Quiz</label>
        <select
          value={selectedQuizId}
          onChange={(e) => setSelectedQuizId(e.target.value)}
          className="w-full border border-[#E2E8F0] rounded-lg p-2 text-[#1E3A5F] bg-white"
        >
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.title} ({quiz.quiz_code})
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="text-[#64748B]">Loading metrics...</div>}

      {error && <div className="text-red-600">{error}</div>}

      {metrics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-[#64748B] text-xs font-medium">Total Attempts</p>
              <p className="text-2xl font-bold text-[#1E3A5F] mt-1">{metrics.totalAttempts}</p>
            </div>
            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-[#64748B] text-xs font-medium">Avg Score</p>
              <p className="text-2xl font-bold text-[#1E3A5F] mt-1">{metrics.averageScore}%</p>
            </div>
            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-[#64748B] text-xs font-medium">Pass Rate</p>
              <p className="text-2xl font-bold text-[#1E3A5F] mt-1">{metrics.passRate}%</p>
            </div>
            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-[#64748B] text-xs font-medium">Completion</p>
              <p className="text-2xl font-bold text-[#1E3A5F] mt-1">{metrics.completionRate}%</p>
            </div>
          </div>

          {/* Question Difficulty Analysis */}
          {metrics.questionDifficulty.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
              <h4 className="text-lg font-semibold text-[#1E3A5F] mb-4">Question Difficulty Analysis</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {metrics.questionDifficulty.map((q, idx) => {
                  const diffColor =
                    q.difficulty === 'too_easy'
                      ? 'text-green-600'
                      : q.difficulty === 'hard'
                        ? 'text-orange-600'
                        : 'text-blue-600';
                  return (
                    <div key={q.questionId} className="border border-[#E2E8F0] rounded p-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#1E3A5F]">
                            Q{idx + 1}: {q.questionText.substring(0, 60)}...
                          </p>
                          <p className="text-xs text-[#64748B] mt-1">
                            {q.correctCount} of {q.totalCount} correct
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${diffColor}`}>{q.difficultyPercent}%</p>
                          <p className={`text-xs ${diffColor} capitalize`}>{q.difficulty.replace('_', ' ')}</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 bg-[#E2E8F0] rounded-full h-2">
                        <div
                          className="bg-[#0891B2] h-2 rounded-full"
                          style={{ width: `${q.difficultyPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
