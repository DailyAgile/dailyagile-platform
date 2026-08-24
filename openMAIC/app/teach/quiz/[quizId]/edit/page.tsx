'use client';

/**
 * Quiz Editor Page
 * Edit quiz details and all questions
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizEditor');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  teal_dark: '#0a7e9a',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Question {
  id: string;
  question_number: number;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
  };
  correct_answer: string;
  explanation: string;
  source_link: string;
  timer_seconds: number;
  points: number;
}

interface QuizData {
  id: string;
  quiz_code: string;
  title: string;
  total_questions: number;
  total_points: number;
  questions: Question[];
}

export default function QuizEditorPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Load quiz on mount
  useEffect(() => {
    if (!quizId) return;
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/instructor/quiz/get-quiz?quiz_id=${quizId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load quiz');
      }

      setQuiz(result.data);
    } catch (err) {
      log.error('Failed to load quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (questionIndex: number, field: string, value: any) => {
    if (!quiz) return;

    const updatedQuestions = [...quiz.questions];
    const question = updatedQuestions[questionIndex];

    if (field.startsWith('option_')) {
      const letter = field.split('_')[1].toLowerCase();
      question.options[letter as keyof typeof question.options] = value;
    } else if (field === 'correct_answer') {
      question.correct_answer = value.toUpperCase();
    } else if (field === 'timer_seconds') {
      question.timer_seconds = parseInt(value) || 0;
    } else if (field === 'points') {
      question.points = parseInt(value) || 0;
    } else {
      (question as any)[field] = value;
    }

    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const handleSave = async () => {
    if (!quiz) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/instructor/quiz/update-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save quiz');
      }

      log.info('Quiz saved successfully');

      // Show success message for 2 seconds before redirecting
      alert(`✅ Quiz saved successfully!\n\nTitle: ${quiz.title}\nQuestions: ${quiz.questions.length}\n\nRedirecting to dashboard...`);

      // Redirect back to dashboard
      setTimeout(() => {
        router.push('/teach/dashboard');
      }, 500);
    } catch (err) {
      log.error('Failed to save quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: BRAND_COLORS.teal }} />
          <p style={{ color: BRAND_COLORS.gray }} className="mt-4">Loading quiz editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }} className="border rounded-lg p-6">
            <h1 style={{ color: '#991b1b' }} className="text-2xl font-bold mb-2">
              Error
            </h1>
            <p style={{ color: '#7f1d1d' }}>{error}</p>
            <button
              onClick={() => router.back()}
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              className="mt-4 px-4 py-2 rounded-lg font-semibold hover:opacity-90"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p style={{ color: BRAND_COLORS.gray }}>Quiz not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => router.back()} className="text-sm text-blue-300 hover:text-white mb-4">
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold mb-2">Edit Quiz</h1>
          <p style={{ color: BRAND_COLORS.gray }}>
            {quiz.quiz_code} • {quiz.total_questions} questions • {quiz.total_points} points
          </p>
        </div>
      </div>

      {/* QUIZ DETAILS */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }} className="mb-6 p-4 border rounded-lg">
            <p style={{ color: '#991b1b' }}>{error}</p>
          </div>
        )}

        {/* Quiz Metadata Section */}
        <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 mb-8 bg-white">
          <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-4">
            Quiz Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Quiz Title
              </label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
              />
            </div>
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Quiz Code (Read-only)
              </label>
              <input
                type="text"
                value={quiz.quiz_code}
                disabled
                className="w-full px-4 py-2 rounded-lg border bg-gray-100 text-gray-600"
                style={{ borderColor: BRAND_COLORS.border }}
              />
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div>
          <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-4">
            Questions ({quiz.questions.length})
          </h2>

          <div className="space-y-4">
            {quiz.questions.map((question, idx) => (
              <div
                key={question.id}
                style={{ borderColor: BRAND_COLORS.border }}
                className="border rounded-lg overflow-hidden bg-white"
              >
                {/* Question Header */}
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-50 transition-all"
                  style={{ backgroundColor: expandedQuestion === idx ? BRAND_COLORS.light : 'white' }}
                >
                  <div className="text-left">
                    <p style={{ color: BRAND_COLORS.navy }} className="font-semibold">
                      Q{question.question_number}: {question.question.substring(0, 60)}
                      {question.question.length > 60 ? '...' : ''}
                    </p>
                    <p style={{ color: BRAND_COLORS.gray }} className="text-sm mt-1">
                      Timer: {question.timer_seconds}s • Points: {question.points}
                    </p>
                  </div>
                  <span style={{ color: BRAND_COLORS.teal }}>
                    {expandedQuestion === idx ? '▼' : '▶'}
                  </span>
                </button>

                {/* Expanded Question Editor */}
                {expandedQuestion === idx && (
                  <div style={{ backgroundColor: BRAND_COLORS.light, borderTopColor: BRAND_COLORS.border }} className="border-t p-6 space-y-4">
                    {/* Question Text */}
                    <div>
                      <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                        Question
                      </label>
                      <textarea
                        value={question.question}
                        onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                        rows={2}
                        style={{ borderColor: BRAND_COLORS.border }}
                        className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                        onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                      />
                    </div>

                    {/* Timer and Points */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                          Timer (seconds)
                        </label>
                        <input
                          type="number"
                          value={question.timer_seconds}
                          onChange={(e) => handleQuestionChange(idx, 'timer_seconds', e.target.value)}
                          style={{ borderColor: BRAND_COLORS.border }}
                          className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                          onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                        />
                      </div>
                      <div>
                        <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                          Points
                        </label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => handleQuestionChange(idx, 'points', e.target.value)}
                          style={{ borderColor: BRAND_COLORS.border }}
                          className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                          onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                        />
                      </div>
                    </div>

                    {/* Answer Options */}
                    <div>
                      <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-3">
                        Answer Options
                      </label>
                      <div className="space-y-2">
                        {['a', 'b', 'c', 'd', 'e'].map((letter) => (
                          <div key={letter} className="flex items-center gap-2">
                            <label style={{ color: BRAND_COLORS.navy }} className="w-8 font-semibold">
                              {letter.toUpperCase()}.
                            </label>
                            <input
                              type="text"
                              value={question.options[letter as keyof typeof question.options]}
                              onChange={(e) =>
                                handleQuestionChange(idx, `option_${letter}`, e.target.value)
                              }
                              style={{ borderColor: BRAND_COLORS.border }}
                              className="flex-1 px-4 py-2 rounded-lg border bg-white focus:ring-2"
                              onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                              onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                            />
                            <input
                              type="radio"
                              name={`correct_${idx}`}
                              value={letter.toUpperCase()}
                              checked={question.correct_answer === letter.toUpperCase()}
                              onChange={(e) =>
                                handleQuestionChange(idx, 'correct_answer', e.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                        Explanation
                      </label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                        rows={2}
                        style={{ borderColor: BRAND_COLORS.border }}
                        className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                        onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                      />
                    </div>

                    {/* Source Link */}
                    <div>
                      <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                        Source Link
                      </label>
                      <input
                        type="url"
                        value={question.source_link}
                        onChange={(e) => handleQuestionChange(idx, 'source_link', e.target.value)}
                        placeholder="https://example.com"
                        style={{ borderColor: BRAND_COLORS.border }}
                        className="w-full px-4 py-2 rounded-lg border bg-white focus:ring-2"
                        onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-8">
          <button
            onClick={() => router.back()}
            style={{ borderColor: BRAND_COLORS.teal, color: BRAND_COLORS.teal }}
            className="px-6 py-2 border rounded-lg font-semibold hover:bg-opacity-10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
            className="px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
