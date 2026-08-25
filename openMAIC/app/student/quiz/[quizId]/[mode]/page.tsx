'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { QuestionDisplay } from '@/components/student/quiz/QuestionDisplay';

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
  timeLimit?: number;
  questions: Question[];
  passingScore: number;
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

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const response = await fetch(`/api/student/quiz/${quizId}`);
        if (!response.ok) {
          throw new Error(`Failed to load quiz: ${response.status}`);
        }
        const result = await response.json();
        console.log('API response:', result);

        // apiSuccess adds success: true to the response
        const { success, ...data } = result;
        console.log('Quiz data:', data);

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
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
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

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: currentQuestion === 0 ? '#e5e7eb' : '#ffffff',
              color: currentQuestion === 0 ? '#9ca3af' : '#0891b2',
              border: '2px solid #0891b2',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
              opacity: currentQuestion === 0 ? 0.5 : 1,
            }}
          >
            ← Previous
          </button>

          {currentQuestion < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
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
              Next →
            </button>
          ) : (
            <button
              onClick={() => {
                if (window.confirm('Submit your quiz?')) {
                  fetch(`/api/student/quiz/submit-simple`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizCode: quizId, answers: Object.values(answers) }),
                  })
                    .then(res => res.json())
                    .then((response) => {
                      console.log('Submit response:', response);
                      const attemptId = response.attemptId;
                      if (attemptId) {
                        router.push(`/student/quiz/${quizId}/${mode}/results?attemptId=${attemptId}`);
                      } else {
                        setError('Failed to get attempt ID');
                      }
                    })
                    .catch((err) => {
                      console.error('Submit error:', err);
                      setError('Failed to submit quiz');
                    });
                }
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Submit Quiz ✓
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
