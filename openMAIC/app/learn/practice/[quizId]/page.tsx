'use client';

/**
 * Student Quiz Player Page
 * Allows students to take quizzes created from CSV
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';
import { EmailVerificationGate } from '@/components/quiz/EmailVerificationGate';

const log = createLogger('StudentQuizPage');

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
  timer_seconds: number;
  points: number;
}

interface QuizSession {
  session_id: string;
  quiz_id: string;
  title: string;
  total_questions: number;
  total_points: number;
}

interface QuestionResult {
  question_number: number;
  question: string;
  your_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  total_points: number;
  explanation: string;
  source_link: string;
  time_taken_seconds: number;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
  };
}

export default function StudentQuizPage() {
  const params = useParams();
  const quizId = params?.quizId as string;

  const [emailVerified, setEmailVerified] = useState(false);
  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [step, setStep] = useState<'loading' | 'quiz' | 'results' | 'error'>('loading');
  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string | null>>({});
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle email verification
  const handleEmailVerified = (email: string, token: string) => {
    setStudentEmail(email);
    setEmailVerified(true);
    // Quiz will start automatically after verification
  };

  // Start quiz session
  useEffect(() => {
    if (!emailVerified) return; // Wait for email verification

    const startQuiz = async () => {
      try {
        const studentId = studentEmail || `student-${Date.now()}`; // Use email as student ID

        // If quizId looks like a code (Q001), resolve it first
        let actualQuizId = quizId;
        if (quizId && quizId.match(/^Q\d+$/)) {
          // It's a quiz code, need to look it up
          const lookupResponse = await fetch(`/api/student/quiz/lookup?code=${quizId}`);
          const lookupData = await lookupResponse.json();
          if (!lookupResponse.ok || !lookupData.quiz_id) {
            throw new Error('Quiz not found');
          }
          actualQuizId = lookupData.quiz_id;
        }

        // Start session
        const startResponse = await fetch('/api/student/quiz/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quiz_id: actualQuizId,
            student_id: studentId,
            student_email: studentEmail,
          }),
        });

        const startData = await startResponse.json();
        if (!startResponse.ok) {
          throw new Error(startData.error?.message || 'Failed to start quiz');
        }

        setSession(startData);

        // Fetch questions
        const questionsResponse = await fetch(
          `/api/student/quiz/questions?session_id=${startData.session_id}`,
          { method: 'GET' },
        );

        const questionsData = await questionsResponse.json();
        if (!questionsResponse.ok) {
          throw new Error(questionsData.error?.message || 'Failed to load questions');
        }

        setQuestions(questionsData.questions || []);
        setStep('quiz');
      } catch (err) {
        log.error('Failed to start quiz:', err);
        setError(err instanceof Error ? err.message : 'Failed to start quiz');
        setStep('error');
      }
    };

    if (quizId && emailVerified) {
      startQuiz();
    }
  }, [quizId, emailVerified, studentEmail]);

  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answer,
    });
  };

  const handleSubmitAnswer = async () => {
    if (!session || !questions[currentQuestionIndex]) return;

    try {
      setIsSubmitting(true);
      const currentQuestion = questions[currentQuestionIndex];
      const selectedAnswer = selectedAnswers[currentQuestionIndex] || null;

      // Submit answer
      await fetch('/api/student/quiz/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          question_id: currentQuestion.id,
          selected_answer: selectedAnswer,
        }),
      });

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // Finish quiz
        const finishResponse = await fetch('/api/student/quiz/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.session_id }),
        });

        const finishData = await finishResponse.json();
        if (!finishResponse.ok) {
          throw new Error(finishData.error?.message || 'Failed to finish quiz');
        }

        setResults(finishData);
        setStep('results');
      }
    } catch (err) {
      log.error('Failed to submit answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email verification gate
  if (!emailVerified) {
    return <EmailVerificationGate quizId={quizId} onVerified={handleEmailVerified} />;
  }

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0891B2] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Starting quiz...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results state
  if (step === 'results' && results) {
    const passed = results.percentage >= 70;
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                passed ? 'bg-green-100' : 'bg-orange-100'
              }`}
            >
              <span className={`text-4xl ${passed ? 'text-green-600' : 'text-orange-600'}`}>
                {passed ? '✓' : '!'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">
              {passed ? 'Quiz Passed!' : 'Quiz Completed'}
            </h1>
            <p className="text-2xl font-bold text-[#0891B2]">{results.percentage}%</p>
            <p className="text-[#64748B]">
              {results.score} of {results.total_points} points
            </p>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Question Breakdown</h2>
            {results.results?.map((result: QuestionResult, idx: number) => (
              <div
                key={idx}
                className="border border-[#E2E8F0] rounded-lg p-4 bg-[#F0F7FA]"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      result.is_correct ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {result.is_correct ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1E3A5F]">
                      Q{result.question_number}: {result.question}
                    </p>
                    <p className="text-sm text-[#64748B] mt-1">
                      Your answer: <span className="font-mono">{result.your_answer || 'Not answered'}</span>
                      {!result.is_correct && (
                        <>
                          {' '}
                          | Correct: <span className="font-mono">{result.correct_answer}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#0891B2]">
                    {result.points_earned}/{result.total_points}
                  </span>
                </div>

                {/* Explanation */}
                {result.explanation && (
                  <div className="ml-9 mt-3 p-3 bg-white rounded border border-[#E2E8F0]">
                    <p className="text-sm text-[#64748B]">
                      <span className="font-semibold">Explanation:</span> {result.explanation}
                    </p>
                    {result.source_link && (
                      <p className="text-sm text-[#0891B2] mt-2">
                        <a
                          href={result.source_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          Learn more →
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz state
  if (step === 'quiz' && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswer = selectedAnswers[currentQuestionIndex] || null;

    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-[#64748B]">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-[#64748B]">
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0891B2] transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">{currentQuestion.question}</h2>

            {/* Options */}
            <div className="space-y-3">
              {['a', 'b', 'c', 'd', 'e'].map((letter) => (
                <label
                  key={letter}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedAnswer === letter.toUpperCase()
                      ? 'border-[#0891B2] bg-blue-50'
                      : 'border-[#E2E8F0] bg-white hover:border-[#0891B2]'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={letter.toUpperCase()}
                    checked={selectedAnswer === letter.toUpperCase()}
                    onChange={(e) => handleSelectAnswer(e.target.value)}
                    disabled={isSubmitting}
                    className="w-5 h-5 text-[#0891B2]"
                  />
                  <span className="ml-3 font-medium text-[#1E293B]">
                    {letter.toUpperCase()}. {currentQuestion.options[letter as keyof typeof currentQuestion.options]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              className="px-4 py-2 border border-[#0891B2] text-[#0891B2] rounded-lg font-semibold hover:bg-[#F0F7FA] disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null || isSubmitting}
              className="flex-1 px-4 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Submitting...' : currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
