'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useQuizPlayer } from '@/lib/hooks/useQuizPlayer';
import { useQuizTimer } from '@/lib/hooks/useQuizTimer';
import { QuestionDisplay } from '@/components/student/quiz/QuestionDisplay';
import { QuestionMap } from '@/components/student/quiz/QuestionMap';
import { SubmitButton } from '@/components/student/quiz/SubmitButton';
import { SettingsPanel } from '@/components/student/SettingsPanel';

interface Question {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  text: string;
  description?: string;
  options?: {
    id: string;
    label: string;
    text: string;
  }[];
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  timeLimit?: number; // seconds
  questions: Question[];
  passingScore: number; // percentage
}

export default function QuizPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const quizId = params.quizId as string;

  // Quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Quiz player
  const quiz = useQuizPlayer({
    totalQuestions: quizData?.questions.length || 0,
    onAutoSave: async answers => {
      // Call API to save answers
      try {
        await fetch(`/api/student/quiz/${quizId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });
      } catch (error) {
        console.error('Failed to auto-save answers:', error);
      }
    },
  });

  // Timer
  const totalSeconds = quizData?.timeLimit || 3600; // 1 hour default
  const timer = useQuizTimer({
    totalSeconds,
    enabled: !!quizData,
    onTimeUp: handleTimeUp,
  });

  // Load quiz
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const response = await fetch(`/api/student/quiz/${quizId}`);
        if (!response.ok) {
          throw new Error('Failed to load quiz');
        }
        const data = await response.json();
        setQuizData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load quiz'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  async function handleTimeUp() {
    // Auto-submit quiz when time is up
    try {
      await submitQuiz();
    } catch (error) {
      setError('Failed to submit quiz');
    }
  }

  async function submitQuiz() {
    if (!quizData) return;

    try {
      const response = await fetch(`/api/student/quiz/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: quiz.answers,
          timeTaken: totalSeconds - timer.timeLeft,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const result = await response.json();
      router.push(`/student/quiz/${quizId}/results/${result.attemptId}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to submit quiz'
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-lg text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-gray-900 mb-4">
            {error || t('errors.quizNotFound')}
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[quiz.currentQuestionIndex];
  const unansweredCount =
    quizData.questions.length - quiz.getAnswerProgress().answered;
  const answeredQuestions = new Set(
    Object.keys(quiz.answers)
      .map(k => parseInt(k))
      .filter(i => quiz.isQuestionAnswered(i))
  );

  // Convert flaggedQuestions from Set<string> to Set<number>
  const flaggedQuestionsAsNumbers = new Set(
    Array.from(quiz.flaggedQuestions).map(q => parseInt(q))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title and Progress */}
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="text-gray-600 hover:text-gray-900 text-xl"
                  aria-label={t('common.back')}
                >
                  ←
                </button>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-navy-900">
                    {quizData.title}
                  </h1>
                  <p className="text-sm text-gray-600 md:hidden">
                    {quiz.currentQuestionIndex + 1}/{quizData.questions.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Timer and Settings */}
            <div className="flex items-center gap-4 ml-4">
              {quizData.timeLimit && (
                <div
                  className={`px-4 py-2 rounded-lg font-semibold text-white text-sm md:text-base ${
                    timer.timeStatus() === 'critical'
                      ? 'bg-red-600 animate-pulse'
                      : timer.timeStatus() === 'warning'
                      ? 'bg-orange-600'
                      : 'bg-teal-600'
                  }`}
                >
                  ⏱️ {timer.formattedTime()}
                </div>
              )}
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="text-gray-600 hover:text-gray-900 text-xl"
                aria-label={t('settings.title')}
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Desktop Progress Bar */}
          <div className="hidden md:block mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((quiz.currentQuestionIndex + 1) /
                      quizData.questions.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Display - Full width on mobile, 2/3 on desktop */}
          <div className="lg:col-span-2">
            <QuestionDisplay
              question={currentQuestion}
              questionNumber={quiz.currentQuestionIndex + 1}
              totalQuestions={quizData.questions.length}
              selectedAnswers={quiz.answers[quiz.currentQuestionIndex] || ''}
              onAnswerChange={answer =>
                quiz.setAnswer(quiz.currentQuestionIndex, answer)
              }
            />

            {/* Navigation Buttons */}
            <div className="mt-8 space-y-4">
              {/* Desktop Navigation */}
              <div className="hidden md:flex gap-4">
                <button
                  onClick={() => quiz.previousQuestion()}
                  disabled={quiz.currentQuestionIndex === 0}
                  className="px-6 py-3 rounded-lg font-semibold border-2 border-teal-600 text-teal-600 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ← {t('common.previous')}
                </button>
                <button
                  onClick={() => quiz.toggleFlag(quiz.currentQuestionIndex)}
                  className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                    quiz.isQuestionFlagged(quiz.currentQuestionIndex)
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  🚩 {t('quiz.flag')}
                </button>
                <button
                  onClick={() => quiz.nextQuestion()}
                  disabled={
                    quiz.currentQuestionIndex ===
                    quizData.questions.length - 1
                  }
                  className="ml-auto px-6 py-3 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('common.next')} →
                </button>
              </div>

              {/* Mobile Navigation */}
              <div className="md:hidden space-y-3">
                <button
                  onClick={() => quiz.toggleFlag(quiz.currentQuestionIndex)}
                  className={`w-full px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                    quiz.isQuestionFlagged(quiz.currentQuestionIndex)
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  🚩 {t('quiz.flag')}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => quiz.previousQuestion()}
                    disabled={quiz.currentQuestionIndex === 0}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold border-2 border-teal-600 text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => quiz.nextQuestion()}
                    disabled={
                      quiz.currentQuestionIndex ===
                      quizData.questions.length - 1
                    }
                    className="flex-1 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Question Map */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <QuestionMap
                totalQuestions={quizData.questions.length}
                currentQuestionIndex={quiz.currentQuestionIndex}
                answeredQuestions={answeredQuestions}
                flaggedQuestions={flaggedQuestionsAsNumbers}
                onSelectQuestion={quiz.goToQuestion}
              />
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="mt-12 max-w-2xl">
          {unansweredCount > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                ⚠️ {unansweredCount} {t('quiz.unansweredQuestions')}
              </p>
            </div>
          )}
          <SubmitButton
            onSubmit={submitQuiz}
            unansweredCount={unansweredCount}
          />
        </div>
      </main>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialSettings={{
          timezone: 'UTC',
          language: 'en',
          currency: 'USD',
          readAloud: false,
          fontSize: 'medium',
          highContrast: false,
          reducedMotion: false,
          extraTimePercentage: 0,
        }}
        onSave={async settings => {
          try {
            await fetch('/api/student/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings),
            });
          } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
          }
        }}
      />
    </div>
  );
}
