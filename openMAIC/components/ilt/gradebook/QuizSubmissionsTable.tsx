'use client';

/**
 * Quiz Submissions Table
 * Shows individual quiz submissions with AI grades and override options
 */

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Loader2, Edit2 } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import type { QuizSubmission, QuizAnswer } from '@/lib/ilt/types/models';

const log = createLogger('QuizSubmissionsTable');

interface QuizSubmissionsTableProps {
  classroomId: string;
  onOverrideClick: (submission: QuizSubmission, answer: QuizAnswer) => void;
}

export function QuizSubmissionsTable({ classroomId, onOverrideClick }: QuizSubmissionsTableProps) {
  const [submissions, setSubmissions] = useState<(QuizSubmission & { answers: QuizAnswer[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/classrooms/${classroomId}/quiz-submissions`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load submissions');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      log.error('Failed to fetch submissions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const getScoreColor = (score?: number): string => {
    if (!score) return 'text-zinc-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score?: number): string => {
    if (!score) return 'bg-zinc-50';
    if (score >= 80) return 'bg-green-50';
    if (score >= 70) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Error loading submissions</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="ml-auto rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-zinc-400 mb-4" />
          <h3 className="text-lg font-medium text-zinc-900">No submissions yet</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Quiz submissions will appear here as students complete quizzes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-teal-300 transition-colors"
            >
              {/* Submission Header */}
              <div className="mb-4 flex items-center justify-between pb-4 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {submission.student_id ? `Student: ${submission.student_id}` : 'Unknown Student'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center rounded px-3 py-1 text-sm font-semibold ${getScoreBg(submission.score ?? undefined)} ${getScoreColor(submission.score ?? undefined)}`}>
                    {submission.score ?? 0}%
                  </div>
                </div>
              </div>

              {/* Answers List */}
              <div className="space-y-3">
                {submission.answers?.map((answer) => (
                  <div
                    key={answer.id}
                    className={`rounded border ${getScoreBg(answer.ai_score ?? undefined)} p-3`}
                  >
                    {/* Question & Score */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-zinc-600 uppercase">
                          Question {answer.question_id}
                        </p>
                        <p className="text-sm text-zinc-700 mt-1">
                          Type: <span className="font-medium">{answer.question_type || 'unknown'}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${getScoreColor(answer.ai_score ?? undefined)}`}>
                          {answer.ai_score ?? '-'}/{answer.max_points}
                        </div>
                        {answer.is_instructor_graded && (
                          <p className="text-xs text-teal-600 font-medium">
                            Instructor Reviewed
                          </p>
                        )}
                      </div>
                    </div>

                    {/* AI Feedback */}
                    {answer.ai_feedback && (
                      <div className="mb-3 rounded bg-white p-2">
                        <p className="text-xs font-semibold text-zinc-600 mb-1">AI Feedback:</p>
                        <p className="text-xs text-zinc-700">{answer.ai_feedback}</p>
                      </div>
                    )}

                    {/* Instructor Feedback (if overridden) */}
                    {answer.instructor_feedback && (
                      <div className="mb-3 rounded bg-teal-50 p-2 border border-teal-200">
                        <p className="text-xs font-semibold text-teal-700 mb-1">Instructor Feedback:</p>
                        <p className="text-xs text-teal-700">{answer.instructor_feedback}</p>
                      </div>
                    )}

                    {/* Override Button */}
                    {!answer.is_instructor_graded && answer.question_type !== 'single' && answer.question_type !== 'multiple' && (
                      <button
                        onClick={() => onOverrideClick(submission, answer)}
                        className="inline-flex items-center gap-2 mt-2 rounded bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 border border-teal-200"
                      >
                        <Edit2 className="h-3 w-3" />
                        Override Grade
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
