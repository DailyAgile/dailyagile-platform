'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ResultsDisplay } from '@/components/student/quiz/ResultsDisplay';

interface QuizResult {
  id: string;
  title: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  timeTaken: number;
  badgesEarned: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
  streak: {
    current: number;
    longest: number;
  };
  pointsEarned: number;
  nextRecommendation?: {
    id: string;
    title: string;
    estimatedMinutes: number;
  };
  questionReview?: Array<{
    questionNumber: number;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();

  const quizId = params.quizId as string;
  const attemptId = params.attemptId as string;

  const [result, setResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load results
  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(
          `/api/student/quiz/${quizId}/attempts/${attemptId}`
        );
        if (!response.ok) {
          throw new Error('Failed to load results');
        }
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load results'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId && attemptId) {
      loadResults();
    }
  }, [quizId, attemptId]);

  const handleRetake = () => {
    router.push(`/student/quiz/${quizId}`);
  };

  const handleNextQuiz = () => {
    if (result?.nextRecommendation) {
      router.push(
        `/student/quiz/${result.nextRecommendation.id}`
      );
    }
  };

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

  if (error || !result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-gray-900 mb-4">
            {error || t('errors.resultsNotFound')}
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/student/quizzes')}
              className="text-gray-600 hover:text-gray-900 text-xl"
              aria-label={t('common.back')}
            >
              ←
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-navy-900">
                {t('quiz.quizResults')}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ResultsDisplay
          result={result}
          onRetake={handleRetake}
          onNextQuiz={result.nextRecommendation ? handleNextQuiz : undefined}
        />
      </main>
    </div>
  );
}
