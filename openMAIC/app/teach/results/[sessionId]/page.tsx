'use client';

/**
 * Quiz Session Details Page
 * View individual student quiz attempt with all answers and feedback
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('SessionDetails');

interface SessionInfo {
  id: string;
  student_email: string;
  quiz_title: string;
  quiz_code: string;
  score: number;
  total_points: number;
  percentage: number;
  taken_at: string;
}

interface Question {
  id: string;
  question_number: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
  source_link?: string;
  points: number;
}

interface SessionDetailsData {
  session: SessionInfo;
  questions: Question[];
  total_questions: number;
}

export default function SessionDetailsPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SessionDetailsData | null>(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/instructor/quiz/session-details?session_id=${sessionId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to fetch session details');
        }

        // API returns data at root level, not wrapped in .data
        setData({
          session: result.session,
          questions: result.questions || [],
          total_questions: result.total_questions || 0,
        });
      } catch (err) {
        log.error('Failed to fetch session details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session details');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0891B2] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
            <p className="text-red-700">{error || 'Failed to load session details'}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { session, questions } = data;
  const passed = session.percentage >= 70;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#1E3A5F] text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-[#0891B2] hover:text-white mb-4 transition-colors"
          >
            ← Back to Results
          </button>
          <h1 className="text-3xl font-bold mb-2">Quiz Attempt Details</h1>
          <p className="text-[#64748B]">Review student answers and performance</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Student & Quiz Info Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 mb-8">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm text-[#64748B] mb-1">Student Email</p>
              <p className="text-lg font-semibold text-[#1E3A5F]">{session.student_email}</p>
            </div>
            <div>
              <p className="text-sm text-[#64748B] mb-1">Quiz</p>
              <p className="text-lg font-semibold text-[#1E3A5F]">{session.quiz_title}</p>
            </div>
            <div>
              <p className="text-sm text-[#64748B] mb-1">Date Taken</p>
              <p className="text-lg font-semibold text-[#1E3A5F]">
                {new Date(session.taken_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#64748B] mb-1">Quiz Code</p>
              <p className="text-lg font-semibold text-[#1E3A5F]">{session.quiz_code}</p>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="border-t border-[#E2E8F0] pt-8">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-sm text-[#64748B] mb-2">Overall Score</p>
                <p className="text-4xl font-bold text-[#0891B2]">{session.percentage}%</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B] mb-2">Points Earned</p>
                <p className="text-3xl font-bold text-[#1E3A5F]">
                  {session.score}/{session.total_points}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#64748B] mb-2">Status</p>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    passed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {passed ? '✓ Passed' : '! Needs Review'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1E3A5F]">Question Breakdown</h2>

          {questions.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-blue-900 font-semibold">ℹ️ Quiz Questions Not Available</p>
              <p className="text-sm text-blue-700 mt-2">
                The detailed question breakdown will be available once quiz questions are added to the database.
              </p>
              <p className="text-sm text-blue-600 mt-3">
                The student's score and overall performance are shown above. Individual question details will appear here once questions are configured.
              </p>
            </div>
          ) : (
            questions.map((question, idx) => (
              <div key={question.id} className="bg-white border border-[#E2E8F0] rounded-lg p-6">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[#1E3A5F]">
                      Q{question.question_number}: {question.question}
                    </h3>
                    <span className="text-sm font-semibold text-[#0891B2]">{question.points} pts</span>
                  </div>
                </div>

                {/* Answer Options */}
                <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-[#1E3A5F] mb-3">Options:</p>
                  <div className="space-y-2">
                    {Object.entries(question.options).map(([key, value]) => (
                      <div
                        key={key}
                        className={`p-3 rounded border-l-4 ${
                          key.toUpperCase() === question.correct_answer
                            ? 'border-l-green-500 bg-green-50'
                            : 'border-l-[#E2E8F0] bg-white'
                        }`}
                      >
                        <p className="text-sm">
                          <span className="font-semibold text-[#1E3A5F]">{key.toUpperCase()}.</span>{' '}
                          {value}
                          {key.toUpperCase() === question.correct_answer && (
                            <span className="ml-2 text-green-600 font-semibold">✓ Correct Answer</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation & Source */}
                {question.explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-[#1E3A5F] mb-2">Explanation:</p>
                    <p className="text-sm text-[#64748B]">{question.explanation}</p>
                    {question.source_link && (
                      <a
                        href={question.source_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#0891B2] hover:underline mt-2 block"
                      >
                        📖 Learn more →
                      </a>
                    )}
                  </div>
                )}

                {/* Instructor Notes Section */}
                <div className="bg-[#F0F7FA] rounded-lg p-4 border border-[#E2E8F0]">
                  <p className="text-sm font-semibold text-[#1E3A5F] mb-2">Instructor Notes:</p>
                  <textarea
                    placeholder="Add feedback or notes about this answer..."
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] bg-white text-sm focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]"
                    rows={2}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] transition-colors"
          >
            Back to Results
          </button>
          <button className="px-6 py-2 border border-[#0891B2] text-[#0891B2] rounded-lg font-semibold hover:bg-[#F0F7FA] transition-colors">
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
