'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Quiz {
  id: string;
  quiz_code: string;
  title: string;
  description?: string;
  total_questions?: number;
  difficulty_level?: string;
}

export default function BrowseQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'practice' | 'mock-test'>('practice');

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const response = await fetch('/api/student/quizzes/public');
        if (!response.ok) {
          throw new Error('Failed to load quizzes');
        }
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      } catch (err) {
        console.error('Error loading quizzes:', err);
        setError('Failed to load available quizzes');
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, []);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return '#16a34a';
      case 'medium':
        return '#ea580c';
      case 'hard':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header with Logo */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem',
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

      {/* Main Content */}
      <div style={{ backgroundColor: '#f3f4f6', minHeight: 'calc(100vh - 80px)', padding: '24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#1e3a5f', fontSize: '32px', fontWeight: 'bold', margin: '16px 0 8px 0' }}>
            Browse Quizzes
          </h1>
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>
            Explore and take available quizzes
          </p>
        </div>

        {/* Mode Selector */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setSelectedMode('practice')}
            style={{
              padding: '10px 16px',
              backgroundColor: selectedMode === 'practice' ? '#0891b2' : '#ffffff',
              color: selectedMode === 'practice' ? '#ffffff' : '#0891b2',
              border: `2px solid #0891b2`,
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📚 Practice Mode
          </button>
          <button
            onClick={() => setSelectedMode('mock-test')}
            style={{
              padding: '10px 16px',
              backgroundColor: selectedMode === 'mock-test' ? '#0891b2' : '#ffffff',
              color: selectedMode === 'mock-test' ? '#ffffff' : '#0891b2',
              border: `2px solid #0891b2`,
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🎯 Mock Test Mode
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p>Loading quizzes...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <p>{error}</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <p>No public quizzes available yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  hover: { boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' },
                } as any}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#1e3a5f', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                    {quiz.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>
                      Code: <strong>{quiz.quiz_code}</strong>
                    </span>
                    {quiz.total_questions && (
                      <span style={{ color: '#64748b', fontSize: '14px' }}>
                        📋 {quiz.total_questions} questions
                      </span>
                    )}
                    {quiz.difficulty_level && (
                      <span
                        style={{
                          color: getDifficultyColor(quiz.difficulty_level),
                          fontSize: '14px',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}
                      >
                        {quiz.difficulty_level}
                      </span>
                    )}
                  </div>
                  {quiz.description && (
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                      {quiz.description}
                    </p>
                  )}
                </div>
                <Link
                  href={`/student/quiz/${quiz.quiz_code}/${selectedMode}`}
                  style={{
                    marginLeft: '16px',
                    padding: '10px 20px',
                    backgroundColor: '#0891b2',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Start Quiz
                </Link>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
