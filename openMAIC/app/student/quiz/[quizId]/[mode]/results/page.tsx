'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

interface Question {
  questionNumber: number;
  question: string;
  studentAnswer: string;
  studentAnswerText: string;
  correctAnswer: string;
  correctAnswerText: string;
  isCorrect: boolean;
  explanation?: string;
  sourceLink?: string;
  pointsEarned?: number;
  maxPoints?: number;
}

interface AttemptData {
  quizTitle: string;
  scorePercentage: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  answers: Question[];
}

export default function QuizResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quizId = params.quizId as string;
  const mode = params.mode as string;
  const attemptId = searchParams.get('attemptId');

  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }

    const fetchAttempt = async () => {
      try {
        const response = await fetch(`/api/student/quiz/${quizId}/attempts/${attemptId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch attempt');
        }
        const data = await response.json();
        setAttemptData(data.data || data);
      } catch (err) {
        console.error('Error fetching attempt:', err);
        setError('Could not load quiz results');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempt();
  }, [attemptId, quizId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: '#4b5563' }}>Loading quiz results...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* DailyAgile Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
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
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '48px', width: 'auto' }} />
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/" style={{ color: '#0891b2', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Page Title */}
      <div style={{ backgroundColor: '#f3f4f6', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ color: '#1e3a5f', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {attemptData ? 'Quiz Results' : 'Quiz Submitted'}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px', backgroundColor: '#ffffff' }}>
        {error ? (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              color: '#991b1b',
            }}
          >
            <p>{error}</p>
          </div>
        ) : attemptData ? (
          <>
            {/* Score Summary */}
            <div
              style={{
                backgroundColor: attemptData.passed ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${attemptData.passed ? '#86efac' : '#fca5a5'}`,
                borderRadius: '12px',
                padding: '32px 24px',
                textAlign: 'center',
                marginBottom: '32px',
              }}
            >
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {attemptData.passed ? '✅' : '⚠️'}
              </div>
              <h2
                style={{
                  color: attemptData.passed ? '#166534' : '#991b1b',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  margin: '0 0 16px 0',
                }}
              >
                {attemptData.passed ? 'Quiz Passed!' : 'Quiz Completed'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 24px 0' }}>
                {attemptData.quizTitle}
              </p>

              {/* Score Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0891b2', margin: '0 0 8px 0' }}>
                    {attemptData.scorePercentage}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Score</div>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#16a34a', margin: '0 0 8px 0' }}>
                    {attemptData.correctCount}/{attemptData.totalQuestions}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Correct</div>
                </div>
              </div>

              {attemptData.passed && (
                <p style={{ color: '#166534', margin: 0, fontSize: '14px', fontWeight: '500' }}>
                  🎉 Great job! You passed with a score of {attemptData.scorePercentage}%
                </p>
              )}
            </div>

            {/* Question Review */}
            {attemptData.answers && attemptData.answers.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#1e3a5f', fontSize: '20px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
                  Question Review
                </h3>

                {attemptData.answers.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#ffffff',
                      border: `2px solid ${q.isCorrect ? '#86efac' : '#fca5a5'}`,
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '16px',
                    }}
                  >
                    {/* Question Header */}
                    <div style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '16px' }}>
                      <div
                        style={{
                          minWidth: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: q.isCorrect ? '#dcfce7' : '#fee2e2',
                          color: q.isCorrect ? '#16a34a' : '#dc2626',
                          borderRadius: '50%',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}
                      >
                        {q.isCorrect ? '✓' : '✗'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ color: '#1e3a5f', fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>
                          Question {q.questionNumber}
                        </h4>
                        <p style={{ color: '#1e293b', fontSize: '15px', margin: 0, lineHeight: '1.6' }}>
                          {q.question}
                        </p>
                      </div>
                    </div>

                    {/* Answer Section */}
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                          Your Answer
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            color: q.isCorrect ? '#16a34a' : '#dc2626',
                            fontWeight: '500',
                          }}
                        >
                          {q.studentAnswer ? `${q.studentAnswer}. ${q.studentAnswerText}` : 'Not answered'}
                        </div>
                      </div>

                      {!q.isCorrect && (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                            Correct Answer
                          </div>
                          <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: '500' }}>
                            {q.correctAnswer}. {q.correctAnswerText}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                          Explanation
                        </div>
                        <p style={{ color: '#475569', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                          {q.explanation}
                        </p>
                      </div>
                    )}

                    {/* Source Link */}
                    {q.sourceLink && (
                      <div>
                        <a
                          href={q.sourceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '13px',
                            color: '#0891b2',
                            textDecoration: 'none',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          📖 Read more
                          <span style={{ fontSize: '12px' }}>→</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
              <Link
                href="/student/quizzes"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#0891b2',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Browse More Quizzes
              </Link>

              <Link
                href="/"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ffffff',
                  color: '#0891b2',
                  border: '2px solid #0891b2',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Back to Home
              </Link>

              {mode === 'practice' && (
                <Link
                  href={`/student/quiz/${quizId}/practice`}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#ffffff',
                    color: '#059669',
                    border: '2px solid #059669',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  ↻ Retake Quiz
                </Link>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
            <h2 style={{ color: '#1e3a5f', fontSize: '28px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
              Quiz Completed!
            </h2>
            <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 32px 0', lineHeight: '1.6' }}>
              Thank you for completing the quiz in <strong>{mode === 'mock-test' ? 'Mock Test' : 'Practice'} Mode</strong>.
            </p>

            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '32px',
              }}
            >
              <p style={{ color: '#166534', margin: 0, fontSize: '14px' }}>
                📊 Your quiz responses have been recorded. Check back later for detailed feedback and scoring.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/student/quizzes"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#0891b2',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Browse More Quizzes
              </Link>

              <Link
                href="/"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ffffff',
                  color: '#0891b2',
                  border: '2px solid #0891b2',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Back to Home
              </Link>
            </div>

            {mode === 'practice' && (
              <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #e5e7eb' }}>
                <Link
                  href={`/student/quiz/${quizId}/practice`}
                  style={{
                    color: '#0891b2',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  ↻ Retake Quiz in Practice Mode
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
