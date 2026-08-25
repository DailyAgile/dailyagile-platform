'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCSRFToken } from '@/lib/hooks/useCSRFToken';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useIsRTL } from '@/lib/hooks/use-is-rtl';
import { formatPercent } from '@/lib/i18n/format';
import { createLogger } from '@/lib/logger';
import { sanitizeText, sanitizeQuestionText, sanitizeOptionText, sanitizeExplanation } from '@/lib/security/xss-sanitizer';

const log = createLogger('QuizPlayer');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  success: '#10B981',
  error: '#EF4444',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Question {
  id?: string;
  question_number?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
  timer_seconds: number;
}

export interface QuizQuestion {
  id: string;
  question_number: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
  timer_seconds: number;
}

interface Props {
  quizCode: string;
  quizTitle: string;
  mode: 'practice' | 'game-mode' | 'mock-test';
}

export default function QuizPlayer({ quizCode, quizTitle, mode }: Props) {
  const router = useRouter();
  const { token: csrfToken } = useCSRFToken();
  const { t, locale } = useI18n();
  const isRTL = useIsRTL();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [answeredOnTime, setAnsweredOnTime] = useState<Record<number, boolean>>({});
  const timerIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPracticeMode = mode === 'practice';
  const isMockTest = mode === 'mock-test';

  useEffect(() => {
    loadQuiz();
  }, [quizCode]);

  // Mock test timer
  useEffect(() => {
    if (!isMockTest || submitted || loading) return;

    setTimeLeft(60);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          // Auto-move to next question or submit
          handleAutoAdvance();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentQuestionIdx, submitted, isMockTest, loading]);

  const handleAutoAdvance = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const loadQuiz = async () => {
    try {
      const response = await fetch(`/api/quiz/by-code/${quizCode}`);
      if (!response.ok) {
        throw new Error(t('quiz.error.notFound'));
      }

      const data = await response.json();
      const quizId = data.data.id;

      // Fetch questions for this quiz
      const questionsResponse = await fetch(`/api/quiz/${quizId}/questions`);
      if (!questionsResponse.ok) {
        throw new Error(t('quiz.error.questionsFailed'));
      }

      const questionsData = await questionsResponse.json();
      setQuestions(questionsData.data || []);
    } catch (err) {
      log.error('Error loading quiz:', err);
      setError(err instanceof Error ? err.message : t('quiz.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (letter: string) => {
    if (!submitted) {
      setAnswers({
        ...answers,
        [currentQuestionIdx]: letter,
      });
    }
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // 💾 Step 1: Save to localStorage as offline backup
      const submissionBackup = {
        quizCode,
        answers,
        questions,
        submittedAt: new Date().toISOString(),
      };
      localStorage.setItem(`quiz_submission_backup_${quizCode}`, JSON.stringify(submissionBackup));
      log.info(`Quiz submission backed up to localStorage: ${quizCode}`);

      // Step 2: Grade the quiz and persist to Supabase (await this)
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({
          quizCode,
          answers,
          questions,
          sceneId: quizCode, // Use quizCode as scene identifier
          maxScore: questions.length * 10, // Calculate max score from question count
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || 'Failed to grade quiz');
      }

      log.info(`Quiz submission successful, ID: ${data.data.submissionId}`);

      // Step 3: Store submission tracking info
      if (data.data.submissionId) {
        localStorage.setItem(`quiz_submission_id_${quizCode}`, data.data.submissionId);
      }

      // Step 4: Show results (loaded from Supabase, not localStorage)
      setResults({
        ...data.data,
        submissionId: data.data.submissionId,
      });
      setSubmitted(true);
      setError(null); // Clear any previous errors
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('quiz.error.submitFailed');
      log.error('Quiz submission error:', err);

      // Show retry UI - set submitted so error handler displays
      setSubmitted(true);
      setError(
        `${t('quiz.error.submitFailed')}: ${errorMsg}. ` +
        `Your answers were saved locally. Please check your connection and click Submit again.`
      );
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-label={t('quiz.loading')}
        aria-live="polite"
        style={{ textAlign: 'center', padding: '60px 20px', color: BRAND_COLORS.navy }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏳</div>
        <p style={{ fontSize: '18px' }}>{t('quiz.loading')}</p>
      </div>
    );
  }

  if (error && submitted) {
    // Submission error - show retry UI
    return (
      <div
        role="alert"
        aria-label="Quiz submission failed"
        aria-live="assertive"
        style={{ textAlign: 'center', padding: '60px 20px', color: BRAND_COLORS.error, maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>❌</div>
        <h2 style={{ fontSize: '20px', color: BRAND_COLORS.navy, marginBottom: '10px' }}>Submission Failed</h2>
        <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '30px', color: BRAND_COLORS.gray }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleSubmit}
            style={{
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            🔄 Try Again
          </button>
          <button
            onClick={() => router.back()}
            style={{
              backgroundColor: BRAND_COLORS.white,
              color: BRAND_COLORS.navy,
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '6px',
              padding: '12px 24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        aria-label={error}
        aria-live="assertive"
        style={{ textAlign: 'center', padding: '60px 20px', color: BRAND_COLORS.error }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>❌</div>
        <p style={{ fontSize: '18px' }}>{error}</p>
      </div>
    );
  }

  if (submitted && results) {
    return <QuizResults results={results} quizTitle={quizTitle} mode={mode} questions={questions} answers={answers} />;
  }

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: BRAND_COLORS.gray }}>
        <p>{t('quiz.noQuestions')}</p>
      </div>
    );
  }

  const current = questions[currentQuestionIdx];
  const answered = currentQuestionIdx in answers;
  const selectedAnswer = answers[currentQuestionIdx];

  const timerColor = timeLeft > 20 ? BRAND_COLORS.teal : timeLeft > 10 ? BRAND_COLORS.orange : BRAND_COLORS.error;

  return (
    <div
      role="main"
      aria-label={`${quizTitle} - ${t('quiz.question', { current: currentQuestionIdx + 1, total: questions.length })}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ padding: '16px', maxWidth: '900px', margin: '0 auto', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* NAVIGATION BUTTONS - Responsive with media queries */}
      <style>{`
        @media (max-width: 640px) {
          [data-nav-buttons] {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
          }
          [data-nav-buttons] button {
            padding: 12px 16px !important;
            height: 44px;
            min-width: 100%;
            font-size: 14px;
          }
        }
        @media (min-width: 641px) {
          [data-nav-buttons] {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
          }
          [data-nav-buttons] button {
            padding: 10px 16px !important;
            height: 40px;
          }
        }
      `}</style>
      <div data-nav-buttons style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <button
          onClick={() => router.back()}
          aria-label={t('quiz.back')}
          style={{
            backgroundColor: BRAND_COLORS.white,
            color: BRAND_COLORS.teal,
            border: `1px solid ${BRAND_COLORS.teal}`,
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {t('quiz.back')}
        </button>
        <button
          onClick={() => router.push('/learn/quizzes')}
          aria-label={t('quiz.quizzesLink')}
          style={{
            backgroundColor: BRAND_COLORS.white,
            color: BRAND_COLORS.navy,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {t('quiz.quizzesLink')}
        </button>
      </div>

      {/* HEADER - Responsive */}
      <style>{`
        @media (max-width: 640px) {
          [data-quiz-header] {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start !important;
          }
          [data-quiz-header] h1 {
            font-size: 20px !important;
          }
          [data-timer] {
            align-self: flex-start;
            width: 100%;
            padding: 12px 16px !important;
            font-size: 20px !important;
          }
        }
        @media (min-width: 641px) {
          [data-quiz-header] {
            flex-direction: row;
            align-items: start;
          }
          [data-quiz-header] h1 {
            font-size: 24px;
          }
          [data-timer] {
            align-self: flex-start;
          }
        }
      `}</style>
      <div style={{ backgroundColor: BRAND_COLORS.light, padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div data-quiz-header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ color: BRAND_COLORS.navy, margin: '0 0 10px 0', fontSize: '24px' }}>📖 {quizTitle}</h1>
            <div style={{ color: BRAND_COLORS.gray, fontSize: '14px' }}>
              <p style={{ margin: 0 }}>
                {t('quiz.question', { current: currentQuestionIdx + 1, total: questions.length })} • {isPracticeMode ? t('quiz.practiceMode') : t('quiz.mockTestMode')}
              </p>
            </div>
          </div>
          {/* MOCK TEST TIMER - Responsive */}
          {isMockTest && (
            <div
              data-timer
              role="timer"
              aria-label={`${timeLeft} seconds remaining`}
              aria-live="assertive"
              aria-atomic="true"
              style={{
                textAlign: 'center',
                padding: '12px 20px',
                backgroundColor: timerColor,
                color: '#fff',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '24px',
                minWidth: '100px',
                transition: 'background-color 0.3s ease',
              }}>
              ⏱️ {timeLeft}s
            </div>
          )}
        </div>
        {/* PROGRESS BAR */}
        <div style={{ marginTop: '10px', backgroundColor: BRAND_COLORS.border, height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            style={{
              backgroundColor: BRAND_COLORS.teal,
              height: '100%',
              width: `${((currentQuestionIdx + 1) / questions.length) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* QUESTION */}
      <div
        style={{ backgroundColor: BRAND_COLORS.white, border: `1px solid ${BRAND_COLORS.border}`, padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
        <div
          role="status"
          aria-live="polite"
          aria-label={t('quiz.question', { current: currentQuestionIdx + 1, total: questions.length })}
          style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
          Question {currentQuestionIdx + 1} of {questions.length}
        </div>
        <h2 id="q-text" style={{ color: BRAND_COLORS.navy, margin: '0 0 20px 0', fontSize: '18px' }}>
          {sanitizeQuestionText(current.question)}
        </h2>

        {/* ANSWER OPTIONS - Touch optimized */}
        <style>{`
          @media (max-width: 640px) {
            [data-answer-options] {
              gap: 12px !important;
            }
            [data-answer-btn] {
              padding: 14px 12px !important;
              min-height: 48px;
              font-size: 14px;
            }
          }
          @media (min-width: 641px) {
            [data-answer-options] {
              gap: 10px;
            }
            [data-answer-btn] {
              padding: 12px;
              min-height: 44px;
            }
          }
        `}</style>
        <fieldset
          aria-labelledby="q-text"
          style={{ border: 'none', padding: 0, margin: 0 }}
        >
          <legend style={{ position: 'absolute', left: isRTL ? 'auto' : '-10000px', right: isRTL ? '-10000px' : 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
            {t('quiz.selectAnswer', { defaultValue: 'Select an answer' })}
          </legend>
          <div data-answer-options style={{ display: 'grid', gap: '10px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => {
              const key = `option_${letter.toLowerCase()}` as keyof typeof current;
              const option = String(current[key]);
              const isSelected = selectedAnswer === letter;
              const isCorrect = current.correct_answer === letter;

              return (
                <button
                  key={letter}
                  onClick={() => handleSelectAnswer(letter)}
                  disabled={submitted}
                  data-answer-btn
                  aria-label={`Option ${letter}: ${option}`}
                  aria-pressed={isSelected}
                  style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  border: `2px solid ${
                    submitted && isCorrect
                      ? BRAND_COLORS.success
                      : submitted && isSelected && !isCorrect
                        ? BRAND_COLORS.error
                        : isSelected
                          ? BRAND_COLORS.teal
                          : BRAND_COLORS.border
                  }`,
                  borderRadius: '6px',
                  backgroundColor:
                    submitted && isCorrect
                      ? '#ECFDF5'
                      : submitted && isSelected && !isCorrect
                        ? '#FEF2F2'
                        : isSelected
                          ? BRAND_COLORS.light
                          : BRAND_COLORS.white,
                  cursor: submitted ? 'default' : 'pointer',
                  opacity: submitted && !isSelected && !isCorrect ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
                onTouchStart={(e) => !submitted && (e.currentTarget.style.opacity = '0.7')}
                onTouchEnd={(e) => !submitted && (e.currentTarget.style.opacity = '1')}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${
                      submitted && isCorrect
                        ? BRAND_COLORS.success
                        : submitted && isSelected && !isCorrect
                          ? BRAND_COLORS.error
                          : isSelected
                            ? BRAND_COLORS.teal
                            : BRAND_COLORS.gray
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color:
                      submitted && isCorrect
                        ? BRAND_COLORS.success
                        : submitted && isSelected && !isCorrect
                          ? BRAND_COLORS.error
                          : isSelected
                            ? BRAND_COLORS.teal
                            : BRAND_COLORS.gray,
                  }}
                >
                  {isSelected && (submitted && isCorrect ? '✓' : submitted && !isCorrect ? '✗' : '●')}
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <p style={{ color: BRAND_COLORS.navy, margin: 0, fontWeight: 'bold', fontSize: '14px' }}>
                    {letter}. {sanitizeOptionText(option)}
                  </p>
                </div>
              </button>
              );
            })}
          </div>
        </fieldset>

        {/* EXPLANATION - Practice: immediate feedback, Mock: only after submission */}
        {isPracticeMode && selectedAnswer === current.correct_answer && (
          <div
            role="status"
            aria-live="polite"
            aria-label={`Correct. ${current.explanation}`}
            style={{ marginTop: '20px', padding: '12px', backgroundColor: '#ECFDF5', borderRadius: '6px', borderLeft: `4px solid ${BRAND_COLORS.success}` }}>
            <p style={{ color: BRAND_COLORS.success, margin: 0, fontSize: '14px' }}>
              ✓ <strong>{t('quiz.checkAnswer')}</strong> {sanitizeExplanation(current.explanation)}
            </p>
          </div>
        )}

        {isPracticeMode && selectedAnswer && selectedAnswer !== current.correct_answer && (
          <div
            role="alert"
            aria-live="assertive"
            aria-label={`Incorrect. The correct answer is ${current.correct_answer}. ${current.explanation}`}
            style={{ marginTop: '20px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', borderLeft: `4px solid ${BRAND_COLORS.error}` }}>
            <p style={{ color: BRAND_COLORS.error, margin: '0 0 8px 0', fontSize: '14px' }}>
              ✗ <strong>{t('quiz.incorrectAnswer')}</strong>
            </p>
            <p style={{ color: BRAND_COLORS.navy, margin: 0, fontSize: '13px' }}>
              <strong>{t('quiz.correctAnswerLabel')}</strong> {current.correct_answer}. {sanitizeExplanation(current.explanation)}
            </p>
          </div>
        )}

        {isMockTest && submitted && selectedAnswer === current.correct_answer && (
          <div
            role="status"
            aria-live="polite"
            aria-label={`Correct. ${current.explanation}`}
            style={{ marginTop: '20px', padding: '12px', backgroundColor: '#ECFDF5', borderRadius: '6px', borderLeft: `4px solid ${BRAND_COLORS.success}` }}>
            <p style={{ color: BRAND_COLORS.success, margin: 0, fontSize: '14px' }}>
              ✓ <strong>{t('quiz.checkAnswer')}</strong> {sanitizeExplanation(current.explanation)}
            </p>
          </div>
        )}

        {isMockTest && submitted && selectedAnswer && selectedAnswer !== current.correct_answer && (
          <div
            role="alert"
            aria-live="assertive"
            aria-label={`Incorrect. The correct answer is ${current.correct_answer}. ${current.explanation}`}
            style={{ marginTop: '20px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', borderLeft: `4px solid ${BRAND_COLORS.error}` }}>
            <p style={{ color: BRAND_COLORS.error, margin: '0 0 8px 0', fontSize: '14px' }}>
              ✗ <strong>{t('quiz.incorrectAnswer')}</strong>
            </p>
            <p style={{ color: BRAND_COLORS.navy, margin: 0, fontSize: '13px' }}>
              <strong>{t('quiz.correctAnswerLabel')}</strong> {current.correct_answer}. {sanitizeExplanation(current.explanation)}
            </p>
          </div>
        )}
      </div>

      {/* NAVIGATION - Responsive button layout */}
      <style>{`
        @media (max-width: 640px) {
          [data-nav-bottom] {
            flex-direction: column;
            gap: 12px;
          }
          [data-nav-bottom] button {
            padding: 14px 16px !important;
            height: 48px;
            width: 100%;
            font-size: 14px;
          }
          [data-nav-bottom-flex] {
            flex-direction: column;
            width: 100%;
          }
          [data-nav-bottom-flex] button {
            width: 100%;
          }
        }
        @media (min-width: 641px) {
          [data-nav-bottom] {
            flex-direction: row;
            gap: 12px;
          }
          [data-nav-bottom] button {
            padding: 10px 16px;
            height: 40px;
          }
          [data-nav-bottom-flex] {
            flex-direction: row;
          }
        }
      `}</style>
      <div data-nav-bottom style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {/* Previous button - hidden in mock-test mode */}
        {!isMockTest && (
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIdx === 0 || submitted}
            aria-label={`Go to previous question, question ${currentQuestionIdx - 1 >= 0 ? currentQuestionIdx : 'one'}`}
            style={{
              padding: '10px 16px',
              border: `2px solid ${BRAND_COLORS.teal}`,
              color: BRAND_COLORS.teal,
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: currentQuestionIdx === 0 || submitted ? 'default' : 'pointer',
              opacity: currentQuestionIdx === 0 || submitted ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onTouchStart={(e) => !submitted && currentQuestionIdx > 0 && (e.currentTarget.style.opacity = '0.7')}
            onTouchEnd={(e) => !submitted && currentQuestionIdx > 0 && (e.currentTarget.style.opacity = '1')}
          >
            {isRTL ? 'Next ←' : '← Previous'}
          </button>
        )}

        {/* Question navigator - only in practice mode, responsive */}
        {isPracticeMode && (
          <div
            role="toolbar"
            aria-label="Question navigator"
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              maxHeight: '120px',
              overflowY: 'auto',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }}>
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIdx(idx)}
                disabled={submitted}
                aria-label={`Go to question ${idx + 1}${idx in answers ? ', answered' : ''}`}
                aria-pressed={idx === currentQuestionIdx}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: `2px solid ${idx === currentQuestionIdx ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
                  backgroundColor: idx in answers ? BRAND_COLORS.teal : BRAND_COLORS.white,
                  color: idx in answers ? BRAND_COLORS.white : BRAND_COLORS.navy,
                  fontWeight: 'bold',
                  cursor: submitted ? 'default' : 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => !submitted && (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => !submitted && (e.currentTarget.style.transform = 'scale(1)')}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}

        {currentQuestionIdx === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitted}
            aria-label={`Submit quiz, you have answered ${Object.keys(answers).length} of ${questions.length} questions`}
            style={{
              padding: '10px 16px',
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: submitted ? 'default' : 'pointer',
              opacity: submitted ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onTouchStart={(e) => !submitted && (e.currentTarget.style.opacity = '0.7')}
            onTouchEnd={(e) => !submitted && (e.currentTarget.style.opacity = '1')}
          >
            ✓ {isMockTest ? 'Finish Test' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={submitted}
            aria-label={`Go to next question, question ${currentQuestionIdx + 2}`}
            style={{
              padding: '10px 16px',
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: submitted ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onTouchStart={(e) => !submitted && (e.currentTarget.style.opacity = '0.7')}
            onTouchEnd={(e) => !submitted && (e.currentTarget.style.opacity = '1')}
          >
            {isMockTest ? (isRTL ? '← Next' : 'Next →') : (isRTL ? '← Next' : 'Next →')}
          </button>
        )}
      </div>

      {/* Mock Test Warning */}
      {isMockTest && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#FEF3C7',
          border: `1px solid ${BRAND_COLORS.orange}`,
          borderRadius: '6px',
          fontSize: '13px',
          color: BRAND_COLORS.navy
        }}>
          ⚠️ In mock test mode, you cannot go back to previous questions. Your answers will be graded after you finish.
        </div>
      )}
    </div>
  );
}

function QuizResults({
  results,
  quizTitle,
  mode,
  questions,
  answers,
}: {
  results: any;
  quizTitle: string;
  mode: string;
  questions: QuizQuestion[];
  answers: Record<number, string>;
}) {
  const { locale } = useI18n();
  const [dbResults, setDbResults] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(!!results?.submissionId);

  // Attempt to load from Supabase if submission ID is available
  useEffect(() => {
    if (!results?.submissionId) return;

    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/student/quiz/submission/${results.submissionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            log.info('Quiz results loaded from Supabase');
            setDbResults(data.data);
          }
        }
      } catch (err) {
        log.warn('Failed to load results from Supabase, using local results:', err);
      } finally {
        setLoadingResults(false);
      }
    };

    fetchResults();
  }, [results?.submissionId]);

  // Use Supabase results if available, otherwise fall back to local results
  const displayResults = dbResults || results;
  const percentageValue = displayResults.score / displayResults.total_points;
  const percentage = formatPercent(percentageValue, locale, 1);
  const passed = displayResults.score >= displayResults.total_points * 0.7;
  const isMockTest = mode === 'mock-test';
  const isPractice = mode === 'practice';

  if (loadingResults) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: BRAND_COLORS.navy }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏳</div>
        <p style={{ fontSize: '18px' }}>Loading your results from the server...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>
          {passed ? '🎉' : '📋'}
        </div>
        <h1 style={{ color: BRAND_COLORS.navy, fontSize: '28px', margin: '0 0 10px 0' }}>
          {passed ? 'Great Job!' : 'Quiz Complete'}
        </h1>
        <p style={{ color: BRAND_COLORS.gray, fontSize: '16px' }}>
          {quizTitle} {isMockTest && '(Mock Test)'}
        </p>
        {dbResults && (
          <p style={{ color: BRAND_COLORS.teal, fontSize: '12px', marginTop: '10px' }}>
            ✓ Results saved to server
          </p>
        )}
      </div>

      <div
        style={{
          backgroundColor: passed ? '#ECFDF5' : BRAND_COLORS.light,
          border: `2px solid ${passed ? BRAND_COLORS.success : BRAND_COLORS.teal}`,
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '30px',
        }}
      >
        <p style={{ color: BRAND_COLORS.gray, fontSize: '14px', margin: 0 }}>Your Score</p>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '10px 0' }}>
          <span>{Math.round(displayResults.score)}</span> / <span>{displayResults.total_points}</span>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND_COLORS.navy }}>
          {percentage}
        </div>
        {isMockTest && (
          <div style={{ fontSize: '14px', marginTop: '15px', color: passed ? BRAND_COLORS.success : BRAND_COLORS.error }}>
            {passed ? '✓ Test Passed (70% or higher)' : '✗ Test Failed (Below 70%)'}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: BRAND_COLORS.light, padding: '20px', borderRadius: '8px' }}>
          <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: 0 }}>Correct Answers</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: BRAND_COLORS.success, margin: '10px 0 0 0' }}>
            {displayResults.correct}
          </p>
        </div>
        <div style={{ backgroundColor: BRAND_COLORS.light, padding: '20px', borderRadius: '8px' }}>
          <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: 0 }}>Incorrect Answers</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: BRAND_COLORS.error, margin: '10px 0 0 0' }}>
            {displayResults.incorrect}
          </p>
        </div>
      </div>

      {/* Detailed Review for Mock Test & Practice */}
      {(isMockTest || isPractice) && (
        <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: `2px solid ${BRAND_COLORS.border}` }}>
          <h2 style={{ color: BRAND_COLORS.navy, fontSize: '20px', marginBottom: '20px' }}>📋 {isPractice ? 'Answer Review' : 'Detailed Review'}</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {questions.map((q, idx) => {
              const userAnswerKey = answers[idx];
              const isCorrect = userAnswerKey === q.correct_answer;

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: isCorrect ? '#ECFDF5' : '#FEF2F2',
                    borderLeft: `4px solid ${isCorrect ? BRAND_COLORS.success : BRAND_COLORS.error}`,
                    padding: '16px',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: BRAND_COLORS.navy, fontWeight: 'bold', margin: '0 0 8px 0' }}>
                        Question {idx + 1}: {sanitizeQuestionText(q.question)}
                      </p>
                      <p style={{ color: BRAND_COLORS.gray, fontSize: '13px', margin: '0 0 8px 0' }}>
                        Your answer: <strong>{userAnswerKey ? `(${userAnswerKey.toUpperCase()}) ${sanitizeOptionText(q[`option_${userAnswerKey.toLowerCase()}` as keyof typeof q] as string)}` : 'Not answered'}</strong>
                      </p>
                      {!isCorrect && (
                        <p style={{ color: BRAND_COLORS.navy, fontSize: '13px', margin: '0 0 8px 0' }}>
                          Correct answer: <strong>(${q.correct_answer.toUpperCase()}) ${sanitizeOptionText(q[`option_${q.correct_answer.toLowerCase()}` as keyof typeof q] as string)}</strong>
                        </p>
                      )}
                      <p style={{ color: '#92400E', fontSize: '13px', margin: '0', backgroundColor: '#FEF3C7', padding: '8px', borderRadius: '4px' }}>
                        💡 {sanitizeExplanation(q.explanation)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ color: BRAND_COLORS.gray, fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
        {isPractice
          ? 'You can retake this quiz anytime to improve your score. Review the explanations to strengthen your knowledge.'
          : passed
            ? 'Congratulations on passing the test! You have successfully demonstrated mastery of this material.'
            : 'Review your incorrect answers and the material. You can retake this test after studying.'}
      </p>
    </div>
  );
}
