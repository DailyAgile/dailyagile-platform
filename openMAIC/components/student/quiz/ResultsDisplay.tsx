'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { BRAND_COLORS } from '@/lib/design/brand-colors';

interface QuizResult {
  id: string;
  title: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  timeTaken: number; // seconds
  badgesEarned: Badge[];
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
  questionReview?: QuestionReview[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface QuestionReview {
  questionNumber: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

interface ResultsDisplayProps {
  result: QuizResult;
  onRetake?: () => void;
  onNextQuiz?: () => void;
  onReviewAnswers?: () => void;
}

export function ResultsDisplay({
  result,
  onRetake,
  onNextQuiz,
  onReviewAnswers,
}: ResultsDisplayProps) {
  const { t } = useI18n();
  const [showDetailedReview, setShowDetailedReview] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50';
    if (percentage >= 60) return 'bg-blue-50';
    return 'bg-red-50';
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">
          {result.passed ? '🎉' : '📋'}
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND_COLORS.navy }}>
          {result.passed ? t('quiz.greatJob') : t('quiz.quizComplete')}
        </h1>
        <p className="text-lg" style={{ color: BRAND_COLORS.gray }}>{result.title}</p>
      </div>

      {/* Score Card */}
      <div
        className={`rounded-lg border-2 p-8 mb-8 text-center ${
          result.passed
            ? 'bg-green-50 border-green-300'
            : 'bg-gray-50 border-gray-300'
        }`}
      >
        <p className="text-sm mb-2" style={{ color: BRAND_COLORS.gray }}>{t('quiz.yourScore')}</p>
        <div className={`text-5xl font-bold mb-2 ${getScoreColor(result.percentage)}`}>
          {result.score}/{result.totalPoints}
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(result.percentage)}`}>
          {result.percentage.toFixed(1)}%
        </div>
        {result.passed && (
          <p className="text-green-700 font-semibold mt-4">
            ✓ {t('quiz.passedTest')}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border p-4" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
          <p className="text-xs mb-2" style={{ color: BRAND_COLORS.gray }}>{t('quiz.timeTaken')}</p>
          <p className="text-xl font-bold" style={{ color: BRAND_COLORS.navy }}>
            {formatTime(result.timeTaken)}
          </p>
        </div>
        <div className="rounded-lg border p-4" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
          <p className="text-xs mb-2" style={{ color: BRAND_COLORS.gray }}>{t('quiz.streak')}</p>
          <p className="text-xl font-bold" style={{ color: BRAND_COLORS.orange }}>
            {result.streak.current}🔥
          </p>
        </div>
        <div className="rounded-lg border p-4" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
          <p className="text-xs mb-2" style={{ color: BRAND_COLORS.gray }}>{t('quiz.pointsEarned')}</p>
          <p className="text-xl font-bold" style={{ color: BRAND_COLORS.teal }}>+{result.pointsEarned}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
          <p className="text-xs mb-2" style={{ color: BRAND_COLORS.gray }}>{t('quiz.longestStreak')}</p>
          <p className="text-xl font-bold text-purple-600">
            {result.streak.longest}
          </p>
        </div>
      </div>

      {/* Badges */}
      {result.badgesEarned.length > 0 && (
        <div className="rounded-lg border p-6 mb-8" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: BRAND_COLORS.navy }}>
            🏅 {t('quiz.badgesEarned')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {result.badgesEarned.map(badge => (
              <div
                key={badge.id}
                className="text-center p-4 rounded-lg"
                style={{ backgroundColor: BRAND_COLORS.light }}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className="font-semibold text-sm" style={{ color: BRAND_COLORS.navy }}>
                  {badge.name}
                </p>
                <p className="text-xs mt-1" style={{ color: BRAND_COLORS.gray }}>
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Recommendation */}
      {result.nextRecommendation && (
        <div className="rounded-lg border p-6 mb-8" style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <h3 className="font-semibold mb-3" style={{ color: BRAND_COLORS.navy }}>
            📚 {t('quiz.recommendedNext')}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: BRAND_COLORS.navy }}>
                {result.nextRecommendation.title}
              </p>
              <p className="text-sm mt-1" style={{ color: BRAND_COLORS.gray }}>
                {t('quiz.estimatedTime')}: {result.nextRecommendation.estimatedMinutes} {t('quiz.minutes')}
              </p>
            </div>
            {onNextQuiz && (
              <button
                onClick={onNextQuiz}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all whitespace-nowrap hover:opacity-90 focus-visible:outline-none"
                style={{ backgroundColor: BRAND_COLORS.teal }}
              >
                {t('quiz.takeNext')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detailed Review Section */}
      {result.questionReview && result.questionReview.length > 0 && (
        <div className="rounded-lg border p-6 mb-8" style={{ backgroundColor: BRAND_COLORS.white, borderColor: BRAND_COLORS.gray }}>
          <button
            onClick={() => setShowDetailedReview(!showDetailedReview)}
            className="flex items-center justify-between w-full font-semibold focus-visible:outline-none"
            style={{ color: BRAND_COLORS.navy }}
            onMouseEnter={(e) => e.currentTarget.style.color = BRAND_COLORS.teal}
            onMouseLeave={(e) => e.currentTarget.style.color = BRAND_COLORS.navy}
          >
            <span>📋 {t('quiz.detailedReview')}</span>
            <span>{showDetailedReview ? '▼' : '▶'}</span>
          </button>

          {showDetailedReview && (
            <div className="mt-6 space-y-4">
              {result.questionReview.map(review => (
                <div
                  key={review.questionNumber}
                  className={`p-4 rounded-lg border-l-4 ${
                    review.isCorrect
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl">
                      {review.isCorrect ? '✓' : '✗'}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold mb-2" style={{ color: BRAND_COLORS.navy }}>
                        {t('quiz.question')} {review.questionNumber}:{' '}
                        {review.question}
                      </p>
                      <p className="text-sm mb-2" style={{ color: '#374151' }}>
                        <span className="font-medium">{t('quiz.yourAnswer')}:</span>{' '}
                        {review.userAnswer}
                      </p>
                      {!review.isCorrect && (
                        <p className="text-sm mb-2" style={{ color: '#374151' }}>
                          <span className="font-medium">
                            {t('quiz.correctAnswer')}:
                          </span>{' '}
                          {review.correctAnswer}
                        </p>
                      )}
                      <p className="text-sm p-2 rounded mt-2" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        💡 {review.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-3">
        {onRetake && (
          <button
            onClick={onRetake}
            className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 focus-visible:outline-none"
            style={{ backgroundColor: BRAND_COLORS.gray }}
          >
            {t('quiz.retakeQuiz')}
          </button>
        )}
        <button
          onClick={() => setShowDetailedReview(!showDetailedReview)}
          className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 focus-visible:outline-none"
          style={{ backgroundColor: BRAND_COLORS.light, color: BRAND_COLORS.navy }}
        >
          {t('quiz.reviewAnswers')}
        </button>
        <button
          onClick={() => window.history.back()}
          className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 focus-visible:outline-none"
          style={{ backgroundColor: BRAND_COLORS.teal }}
        >
          {t('common.goBack')}
        </button>
      </div>
    </div>
  );
}
