'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { QuestionDisplay } from '@/components/student/quiz/QuestionDisplay';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizPlayer');

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
  correctAnswer?: string;
  explanation?: string;
  points?: number;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  timeLimit?: number;
  questions: Question[];
  passingScore: number;
  totalPoints?: number;
}

interface FeedbackData {
  isCorrect: boolean;
  explanation: string;
  correctAnswer: string;
  points: number;
}

export default function QuizPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const mode = (params.mode as string) || 'practice'; // practice | mock-test | game-mode

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizStartTime] = useState<number>(Date.now());

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const response = await fetch(`/api/student/quiz/${quizId}`);
        if (!response.ok) {
          throw new Error(`Failed to load quiz: ${response.status}`);
        }
        const result = await response.json();
        log.info('Quiz loaded:', result.title);

        // apiSuccess adds success: true to the response, extract data
        const { success: _success, ...data } = result;

        if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error('Invalid quiz data');
        }

        setQuizData(data);
      } catch (err) {
        console.error('Error loading quiz:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const handleSubmitAnswer = async () => {
    if (!answers[currentQuestion]) {
      setError('Please select an answer before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const question = quizData!.questions[currentQuestion];
      const selectedAnswer = answers[currentQuestion];
      const isCorrect = selectedAnswer === question.correctAnswer;
      const points = isCorrect ? (question.points || 5) : 0;

      setFeedbackData({
        isCorrect,
        explanation: question.explanation || 'No explanation available',
        correctAnswer: question.correctAnswer || '',
        points,
      });
      setShowingFeedback(true);
      setSubmittedQuestions(new Set([...submittedQuestions, currentQuestion]));

      log.info(`Question ${currentQuestion + 1}: ${isCorrect ? 'Correct' : 'Incorrect'}`);
    } catch (err) {
      log.error('Error submitting answer:', err);
      setError('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextAfterFeedback = async () => {
    const totalQuestions = quizData!.questions.length;

    if (currentQuestion < totalQuestions - 1) {
      setShowingFeedback(false);
      setFeedbackData(null);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      await handleQuizCompletion();
    }
  };

  const handleQuizCompletion = async () => {
    try {
      setIsSubmitting(true);
      const questions = quizData!.questions;
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach((q, idx) => {
        totalPoints += q.points || 5;
        const selected = answers[idx];

        if (selected === q.correctAnswer) {
          earnedPoints += q.points || 5;
        }
      });

      const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);
      const percentage = Math.round((earnedPoints / totalPoints) * 100);
      const passed = percentage >= (quizData!.passingScore || 70);

      log.info(`Quiz completed: ${earnedPoints}/${totalPoints} (${percentage}%)`);

      const tempAttemptId = `attempt_${Date.now()}`;

      router.push(
        `/student/quiz/${quizId}/results/${tempAttemptId}?score=${earnedPoints}&total=${totalPoints}&percentage=${percentage}&passed=${passed}&time=${timeTaken}`
      );
    } catch (err) {
      log.error('Error completing quiz:', err);
      setError('Failed to complete quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: '#4b5563' }}>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <p style={{ fontSize: '18px', color: '#1f2937', marginBottom: '24px' }}>
            {error || 'Quiz not found'}
          </p>
          <button
            onClick={() => router.back()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#0891b2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const question = quizData.questions[currentQuestion];
  const totalQuestions = quizData.questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* DailyAgile Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            marginBottom: '1rem',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '48px', width: 'auto' }} />
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/student/quizzes" style={{ color: '#0891b2', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              Quizzes
            </Link>
            <Link href="/" style={{ color: '#0891b2', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Quiz Header */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a5f', margin: 0 }}>
                {quizData.title}
              </h1>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 12px',
                borderRadius: '4px',
                backgroundColor: mode === 'mock-test' ? '#fef3c7' : mode === 'game-mode' ? '#dbeafe' : '#dcfce7',
                color: mode === 'mock-test' ? '#92400e' : mode === 'game-mode' ? '#0369a1' : '#166534',
                textTransform: 'capitalize',
              }}>
                {mode.replace('-', ' ')} Mode
              </span>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              Question {currentQuestion + 1} of {totalQuestions}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' }}>
              Progress: {answeredCount}/{totalQuestions}
            </div>
            <button
              onClick={() => {
                if (window.confirm('Exit this quiz? Your progress will not be saved.')) {
                  router.push('/student/quizzes');
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#64748b',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Exit Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '32px 24px',
          pointerEvents: showingFeedback ? 'none' : 'auto',
          opacity: showingFeedback ? 0.5 : 1,
        }}
      >
        {/* Question Display */}
        <div style={{ marginBottom: '32px' }}>
          <QuestionDisplay
            question={question}
            questionNumber={currentQuestion + 1}
            totalQuestions={totalQuestions}
            selectedAnswers={answers[currentQuestion] || ''}
            onAnswerChange={(answer) => {
              setAnswers({ ...answers, [currentQuestion]: answer as string });
            }}
          />
        </div>

        {/* Submit Answer Button */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={handleSubmitAnswer}
            disabled={!answers[currentQuestion] || isSubmitting}
            style={{
              padding: '12px 32px',
              backgroundColor: answers[currentQuestion] && !isSubmitting ? '#0891b2' : '#d1d5db',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: answers[currentQuestion] && !isSubmitting ? 'pointer' : 'not-allowed',
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>

        {/* Feedback Overlay */}
        {showingFeedback && feedbackData && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              pointerEvents: 'auto',
            }}
            onClick={() => { /* prevent background click from closing */ }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Feedback Icon & Status */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '64px',
                    marginBottom: '16px',
                  }}
                >
                  {feedbackData.isCorrect ? '✅' : '❌'}
                </div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: feedbackData.isCorrect ? '#059669' : '#dc2626',
                    margin: '0 0 8px 0',
                  }}
                >
                  {feedbackData.isCorrect ? 'Correct!' : 'Incorrect'}
                </h2>
                {feedbackData.isCorrect && (
                  <p style={{ fontSize: '16px', color: '#6b7280', margin: '0' }}>
                    +{feedbackData.points} points
                  </p>
                )}
              </div>

              {/* Explanation */}
              <div
                style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <p style={{ fontSize: '14px', color: '#374151', margin: '0', lineHeight: '1.6' }}>
                  {feedbackData.explanation}
                </p>
                {!feedbackData.isCorrect && (
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#059669',
                      margin: '8px 0 0 0',
                      fontWeight: '600',
                    }}
                  >
                    Correct answer: <strong>{feedbackData.correctAnswer}</strong>
                  </p>
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextAfterFeedback}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: '#0891b2',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                {currentQuestion < totalQuestions - 1 ? 'Next Question →' : 'See Results'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
