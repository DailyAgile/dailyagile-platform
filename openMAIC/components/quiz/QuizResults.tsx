'use client';

/**
 * Quiz Results Component
 * Displays final score and detailed breakdown of all questions
 * DailyAgile brand colors with light theme
 * WCAG AA compliant with ARIA labels and RTL support
 */

import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useIsRTL } from '@/lib/hooks/use-is-rtl';
import { formatPercent, formatNumber } from '@/lib/i18n/format';
import { createLogger } from '@/lib/logger';
import { sanitizeQuestionText, sanitizeOptionText, sanitizeExplanation } from '@/lib/security/xss-sanitizer';

const log = createLogger('QuizResults');

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

interface QuizResultsProps {
  score: number;
  percentage: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  results: QuestionResult[];
  passingScore: number;
  allowRetakes: number;
  retriedCount?: number;
  onRetry?: () => Promise<void>;
  onDownloadCertificate?: () => Promise<void>;
}

export function QuizResults({
  score,
  percentage,
  totalPoints,
  correctCount,
  totalQuestions,
  results,
  passingScore,
  allowRetakes,
  retriedCount = 0,
  onRetry,
  onDownloadCertificate,
}: QuizResultsProps) {
  const { t, locale } = useI18n();
  const isRTL = useIsRTL();
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [retrying, setRetrying] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPassed = percentage >= passingScore;
  const canRetry = retriedCount < allowRetakes;
  const remainingRetries = allowRetakes - retriedCount;

  const toggleQuestion = (questionNumber: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionNumber)) {
        next.delete(questionNumber);
      } else {
        next.add(questionNumber);
      }
      return next;
    });
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    try {
      setRetrying(true);
      setError(null);
      await onRetry();
    } catch (err) {
      log.error('Failed to retry quiz:', err);
      setError(err instanceof Error ? err.message : t('quiz.error.retryFailed'));
    } finally {
      setRetrying(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!onDownloadCertificate) return;
    try {
      setDownloadingCert(true);
      setError(null);
      await onDownloadCertificate();
    } catch (err) {
      log.error('Failed to download certificate:', err);
      setError(err instanceof Error ? err.message : t('quiz.error.certificateFailed'));
    } finally {
      setDownloadingCert(false);
    }
  };

  return (
    <div
      role="region"
      aria-label={t('quiz.results')}
      aria-live="polite"
      aria-atomic="false"
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full max-w-4xl mx-auto space-y-8"
    >
      {/* Results Header */}
      <div className="space-y-6">
        {/* Score Card */}
        <div
          role="status"
          aria-label={`Quiz Score: ${Math.round(percentage)}%. ${isPassed ? 'Passed' : 'Failed'}.`}
          aria-live="assertive"
          className={`p-8 rounded-lg border-2 ${
            isPassed
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-4">
            {isPassed ? (
              <CheckCircle className="h-12 w-12 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <XCircle className="h-12 w-12 text-amber-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">
                {isPassed ? t('quiz.congratulations') : t('quiz.quizCompleted')}
              </h1>
              <p className={`text-lg mb-4 ${
                isPassed ? 'text-green-700' : 'text-amber-700'
              }`}>
                {isPassed
                  ? t('quiz.scoredPercentage', { percentage: formatPercent(percentage / 100, locale, 0), passingScore })
                  : `${t('quiz.scoredBelowPassing', {
                      percentage: formatPercent(percentage / 100, locale, 0),
                      passingScore,
                      retryInfo: canRetry
                        ? t('quiz.attemptsRemaining' + (remainingRetries !== 1 ? 'Plural' : ''), { count: remainingRetries })
                        : t('quiz.noAttemptsLeft')
                    })}`}
              </p>

              {/* Score Breakdown */}
              <div className="grid grid-cols-4 gap-4 score-breakdown">
                <div className="p-3 bg-white rounded border border-[#E2E8F0]">
                  <p className="text-2xl font-bold text-[#1E3A5F]" aria-label={`${formatNumber(score, locale)} points earned`}>{formatNumber(score, locale)}</p>
                  <p className="text-xs text-[#64748B] mt-1">{t('quiz.pointsEarned')}</p>
                </div>
                <div className="p-3 bg-white rounded border border-[#E2E8F0]">
                  <p className="text-2xl font-bold text-[#0891B2]" aria-label={`${formatPercent(percentage / 100, locale, 0)} percentage score`}>{formatPercent(percentage / 100, locale, 0)}</p>
                  <p className="text-xs text-[#64748B] mt-1">{t('quiz.percentage')}</p>
                </div>
                <div className="p-3 bg-white rounded border border-[#E2E8F0]">
                  <p className="text-2xl font-bold text-green-600" aria-label={`${formatNumber(correctCount, locale)} correct answers`}>{formatNumber(correctCount, locale)}</p>
                  <p className="text-xs text-[#64748B] mt-1">{t('quiz.correctAnswers')}</p>
                </div>
                <div className="p-3 bg-white rounded border border-[#E2E8F0]">
                  <p className="text-2xl font-bold text-[#1E3A5F]" aria-label={`${formatNumber(totalQuestions, locale)} total questions`}>{formatNumber(totalQuestions, locale)}</p>
                  <p className="text-xs text-[#64748B] mt-1">{t('quiz.totalQuestions')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {isPassed && onDownloadCertificate && (
            <button
              onClick={handleDownloadCertificate}
              disabled={downloadingCert || retrying}
              aria-label={t('quiz.downloadCertificate')}
              className="px-6 py-3 bg-[#EA580C] text-white rounded-lg font-semibold hover:bg-[#d14500] disabled:opacity-50 transition-colors"
            >
              {downloadingCert ? t('quiz.generatingCertificate') : t('quiz.downloadCertificate')}
            </button>
          )}
          {canRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying || downloadingCert}
              aria-label={t('quiz.retryQuiz', { count: remainingRetries })}
              className="px-6 py-3 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] disabled:opacity-50 transition-colors"
            >
              {retrying ? t('quiz.startingNewAttempt') : t('quiz.retryQuiz', { count: remainingRetries })}
            </button>
          )}
          <button
            onClick={() => window.location.href = '/classroom'}
            aria-label={t('quiz.backToClassroom')}
            className="px-6 py-3 border border-[#0891B2] text-[#0891B2] rounded-lg font-semibold hover:bg-[#F0F7FA] transition-colors"
          >
            {t('quiz.backToClassroom')}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            aria-label="Error message"
            className="p-4 bg-red-50 rounded-lg border border-red-200"
          >
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Results Breakdown */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-[#1E3A5F]">{t('quiz.questionBreakdown')}</h2>
        <p className="text-sm text-[#64748B]">{t('quiz.reviewAnswers')}</p>

        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.question_number}
              className={`border rounded-lg overflow-hidden transition-colors question-review ${
                result.is_correct
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              {/* Question Header */}
              <button
                onClick={() => toggleQuestion(result.question_number)}
                aria-expanded={expandedQuestions.has(result.question_number)}
                aria-label={`Question ${result.question_number}. ${result.is_correct ? 'Correct' : 'Incorrect'}. ${expandedQuestions.has(result.question_number) ? 'Hide' : 'Show'} details. Your answer: ${result.your_answer || 'Not answered'}.`}
                className="w-full p-4 flex items-start justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex items-start gap-4 flex-1 text-left">
                  <div className="flex-shrink-0 mt-0.5">
                    {result.is_correct ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1E3A5F] mb-1">
                      {t('quiz.question', { current: formatNumber(result.question_number, locale), total: formatNumber(results.length, locale) })}: {sanitizeQuestionText(result.question)}
                    </p>
                    <div className="text-sm text-[#64748B] flex gap-4">
                      <span>{t('quiz.yourAnswer')} <span className="font-medium text-[#1E293B]">{result.your_answer || t('quiz.notAnswered')}</span></span>
                      {!result.is_correct && (
                        <span>{t('quiz.correctAnswerLabel')} <span className="font-medium text-green-700">{result.correct_answer}</span></span>
                      )}
                      <span className="font-medium text-[#1E3A5F]">
                        {formatNumber(result.points_earned, locale)}/{formatNumber(result.total_points, locale)} {t('quiz.pointsSuffix')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {expandedQuestions.has(result.question_number) ? (
                    <ChevronUp className="h-5 w-5 text-[#64748B]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#64748B]" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedQuestions.has(result.question_number) && (
                <div
                  role="region"
                  aria-label={`Details for question ${result.question_number}`}
                  className="px-4 pb-4 pt-0 border-t border-inherit space-y-4"
                >
                  {/* All Options */}
                  <div>
                    <p className="text-sm font-semibold text-[#1E3A5F] mb-2">{t('quiz.answerOptions')}</p>
                    <div className="space-y-2">
                      {Object.entries(result.options).map(([key, text]) => (
                        <div
                          key={key}
                          className={`p-3 rounded text-sm ${
                            key.toUpperCase() === result.correct_answer
                              ? 'bg-green-100 border border-green-300'
                              : key.toUpperCase() === result.your_answer
                                ? 'bg-red-100 border border-red-300'
                                : 'bg-white border border-[#E2E8F0]'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-[#1E3A5F] min-w-fit">{key.toUpperCase()}.</span>
                            <span className="text-[#1E293B]">{sanitizeOptionText(text)}</span>
                            {key.toUpperCase() === result.correct_answer && (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 ml-auto" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-4 bg-[#F0F7FA] rounded-lg border border-[#0891B2]">
                    <p className="text-sm font-semibold text-[#1E3A5F] mb-2">{t('quiz.explanation')}</p>
                    <p className="text-sm text-[#1E293B] leading-relaxed">{sanitizeExplanation(result.explanation)}</p>
                  </div>

                  {/* Source Link */}
                  {result.source_link && (
                    <div>
                      <a
                        href={result.source_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Learn more about this topic, opens in new window"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#0891B2] text-[#0891B2] rounded-lg text-sm font-medium hover:bg-[#F0F7FA] transition-colors"
                      >
                        Learn More
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {/* Time Taken */}
                  <div className="text-xs text-[#64748B]">
                    {t('quiz.timeTaken')} {formatNumber(result.time_taken_seconds, locale)}{t('quiz.seconds')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#F0F7FA] rounded-lg border border-[#0891B2]">
          <p className="text-sm text-[#64748B] mb-2">{t('quiz.averageTimePerQuestion')}</p>
          <p className="text-2xl font-bold text-[#1E3A5F]" aria-label={`Average time per question: ${formatNumber(Math.round(results.reduce((sum, r) => sum + r.time_taken_seconds, 0) / totalQuestions), locale)} seconds`}>
            {formatNumber(
              Math.round(
                results.reduce((sum, r) => sum + r.time_taken_seconds, 0) / totalQuestions
              ),
              locale
            )}{t('quiz.seconds')}
          </p>
        </div>
        <div className="p-4 bg-[#F0F7FA] rounded-lg border border-[#0891B2]">
          <p className="text-sm text-[#64748B] mb-2">{t('quiz.fastestQuestion')}</p>
          <p className="text-2xl font-bold text-[#1E3A5F]" aria-label={`Fastest question: ${formatNumber(Math.min(...results.map(r => r.time_taken_seconds)), locale)} seconds`}>
            {formatNumber(Math.min(...results.map(r => r.time_taken_seconds)), locale)}{t('quiz.seconds')}
          </p>
        </div>
        <div className="p-4 bg-[#F0F7FA] rounded-lg border border-[#0891B2]">
          <p className="text-sm text-[#64748B] mb-2">{t('quiz.slowestQuestion')}</p>
          <p className="text-2xl font-bold text-[#1E3A5F]" aria-label={`Slowest question: ${formatNumber(Math.max(...results.map(r => r.time_taken_seconds)), locale)} seconds`}>
            {formatNumber(Math.max(...results.map(r => r.time_taken_seconds)), locale)}{t('quiz.seconds')}
          </p>
        </div>
      </div>
    </div>
  );
}
