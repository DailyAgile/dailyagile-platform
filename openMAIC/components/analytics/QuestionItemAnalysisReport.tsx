'use client';

/**
 * Question Item Analysis Report
 * Per-question difficulty, discrimination, answer distribution
 */

import React, { useState, useEffect } from 'react';
import { QuestionAnalysis } from '@/lib/analytics/quiz-reports';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuestionItemAnalysisReport');

interface Props {
  quizzes: Array<{ id: string; title: string; quiz_code: string }>;
}

export function QuestionItemAnalysisReport({ quizzes }: Props) {
  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizzes[0]?.id || '');
  const [questions, setQuestions] = useState<QuestionAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedQuizId) {
      loadAnalysis();
    }
  }, [selectedQuizId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics/question-analysis?quizId=${selectedQuizId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      log.error('Failed to load question analysis:', err);
      setError('Failed to load question analysis data');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (
    recommendation: 'well_designed' | 'needs_revision' | 'ambiguous' | 'too_easy' | 'too_hard'
  ) => {
    const colors: Record<string, string> = {
      well_designed: 'bg-green-100 text-green-800 border-green-300',
      needs_revision: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      ambiguous: 'bg-orange-100 text-orange-800 border-orange-300',
      too_easy: 'bg-blue-100 text-blue-800 border-blue-300',
      too_hard: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[recommendation] || colors.needs_revision;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty >= 75) return 'text-blue-600'; // Too easy
    if (difficulty >= 40 && difficulty < 75) return 'text-green-600'; // Good
    return 'text-orange-600'; // Hard
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

      {loading && <div className="text-[#64748B]">Loading question analysis...</div>}

      {error && <div className="text-red-600">{error}</div>}

      {questions.length > 0 ? (
        <div className="space-y-4 max-h-[800px] overflow-y-auto">
          {questions.map((question, idx) => (
            <div
              key={question.questionId}
              className="bg-white border border-[#E2E8F0] rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              {/* Question Header */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[#1E3A5F] mb-2">
                  Question {idx + 1}: {question.questionText.substring(0, 100)}
                  {question.questionText.length > 100 ? '...' : ''}
                </h4>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-[#64748B] font-medium">Difficulty Index</p>
                    <p className={`text-xl font-bold mt-1 ${getDifficultyColor(question.difficultyIndex)}`}>
                      {question.difficultyIndex}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] font-medium">Discrimination</p>
                    <p className="text-xl font-bold text-[#0891B2] mt-1">
                      {question.discriminationIndex.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded text-xs font-medium border ${getRecommendationColor(
                        question.recommendation
                      )}`}
                    >
                      {question.recommendation.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answer Distribution */}
              <div className="border-t border-[#E2E8F0] pt-4">
                <p className="text-xs font-semibold text-[#1E3A5F] mb-3">Answer Distribution</p>
                <div className="space-y-2">
                  {question.answerDistribution.map((answer) => (
                    <div key={answer.option} className="flex items-center gap-3">
                      <div className="w-8">
                        <span className="font-bold text-[#1E3A5F]">{answer.option}:</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-[#E2E8F0] rounded-full h-6 flex items-center">
                          <div
                            className={`h-6 rounded-full flex items-center justify-end px-2 ${
                              answer.isCorrect ? 'bg-green-500' : 'bg-[#0891B2]'
                            }`}
                            style={{ width: `${Math.max(answer.percentage, 5)}%` }}
                          >
                            {answer.percentage > 10 && (
                              <span className="text-white text-xs font-bold">{answer.percentage}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-xs font-medium text-[#64748B]">
                          {answer.percentage}% ({answer.count})
                        </span>
                        {answer.isCorrect && <span className="ml-1 text-green-600 font-bold">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Badge */}
              {question.recommendation !== 'well_designed' && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B] font-medium mb-2">Feedback</p>
                  <p className="text-sm text-[#1E3A5F]">
                    {question.recommendation === 'too_easy' &&
                      'This question is too easy. Consider increasing difficulty or removing it.'}
                    {question.recommendation === 'too_hard' &&
                      'This question is very difficult. Consider rewording or providing hints.'}
                    {question.recommendation === 'ambiguous' &&
                      'This question has low discrimination. Multiple answers may be unclear.'}
                    {question.recommendation === 'needs_revision' &&
                      'Multiple distractor choices are popular. Consider clarifying the question.'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-6">
            <p className="text-[#64748B]">No question data available for this quiz</p>
          </div>
        )
      )}
    </div>
  );
}
