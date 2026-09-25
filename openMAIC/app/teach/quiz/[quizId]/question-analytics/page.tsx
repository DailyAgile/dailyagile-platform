'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import styles from './analytics.module.css';

interface QuestionAnalytic {
  question_id: string;
  question_text: string;
  total_attempts: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
  percentage_correct: number;
  average_time_seconds: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface AnalyticsData {
  quiz_id: string;
  quiz_title: string;
  total_students: number;
  total_attempts: number;
  average_score: number;
  hardest_questions: QuestionAnalytic[];
  easiest_questions: QuestionAnalytic[];
  all_questions: QuestionAnalytic[];
}

export default function QuestionAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params?.quizId as string;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'difficulty' | 'time'>('difficulty');

  useEffect(() => {
    if (!quizId) return;
    loadAnalytics();
  }, [quizId]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        router.push('/teach/login');
        return;
      }

      const response = await fetch(
        `/api/instructor/quiz/question-analytics?quiz_id=${quizId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        router.push('/teach/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to load analytics');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'hard':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'Easy (75%+ correct)';
      case 'medium':
        return 'Medium (26-74% correct)';
      case 'hard':
        return 'Hard (≤25% correct)';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading question analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Image
            src="/dailyagile-logo.png"
            alt="DailyAgile Logo"
            width={40}
            height={40}
            className={styles.logo}
          />
          <h1>Question Analytics</h1>
        </div>
        <div className={styles.errorAlert}>
          {error || 'Failed to load analytics'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Image
            src="/dailyagile-logo.png"
            alt="DailyAgile Logo"
            width={40}
            height={40}
            className={styles.logo}
          />
          <div>
            <h1>Question Analytics</h1>
            <p>{analytics.quiz_title}</p>
          </div>
        </div>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ← Back
        </button>
      </div>

      <div className={styles.content}>
        {/* Overview Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Students</div>
            <div className={styles.statValue}>{analytics.total_students}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Attempts</div>
            <div className={styles.statValue}>{analytics.total_attempts}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Average Score</div>
            <div className={styles.statValue}>{analytics.average_score.toFixed(1)}%</div>
          </div>
        </div>

        {/* Hardest & Easiest Questions */}
        <div className={styles.topQuestionsGrid}>
          <div className={styles.topQuestionsCard}>
            <h2>Hardest Questions</h2>
            <div className={styles.questionsList}>
              {analytics.hardest_questions.length > 0 ? (
                analytics.hardest_questions.map((q, idx) => (
                  <div key={q.question_id} className={styles.questionItem}>
                    <div className={styles.rank}>#{idx + 1}</div>
                    <div className={styles.questionInfo}>
                      <div className={styles.questionText}>{q.question_text}</div>
                      <div className={styles.questionStats}>
                        {q.percentage_correct.toFixed(1)}% correct · {q.total_attempts} attempts
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>No data available</div>
              )}
            </div>
          </div>

          <div className={styles.topQuestionsCard}>
            <h2>Easiest Questions</h2>
            <div className={styles.questionsList}>
              {analytics.easiest_questions.length > 0 ? (
                analytics.easiest_questions.map((q, idx) => (
                  <div key={q.question_id} className={styles.questionItem}>
                    <div className={styles.rank}>#{idx + 1}</div>
                    <div className={styles.questionInfo}>
                      <div className={styles.questionText}>{q.question_text}</div>
                      <div className={styles.questionStats}>
                        {q.percentage_correct.toFixed(1)}% correct · {q.total_attempts} attempts
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* All Questions Detailed Analysis */}
        <div className={styles.allQuestionsSection}>
          <div className={styles.sectionHeader}>
            <h2>All Questions Analysis</h2>
            <div className={styles.sortControls}>
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="difficulty">Difficulty (Easiest to Hardest)</option>
                <option value="time">Average Time Spent</option>
              </select>
            </div>
          </div>

          {analytics.all_questions.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Attempts</th>
                    <th>Correct</th>
                    <th>% Correct</th>
                    <th>Avg Time (sec)</th>
                    <th>Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {(sortBy === 'difficulty'
                    ? analytics.all_questions
                    : [...analytics.all_questions].sort(
                        (a, b) => b.average_time_seconds - a.average_time_seconds
                      )
                  ).map((question) => (
                    <tr key={question.question_id}>
                      <td className={styles.questionCol}>{question.question_text}</td>
                      <td>{question.total_attempts}</td>
                      <td>{question.correct_answers}</td>
                      <td>
                        <div className={styles.percentageBar}>
                          <div
                            className={styles.percentageBarFill}
                            style={{
                              width: `${question.percentage_correct}%`,
                              backgroundColor: getDifficultyColor(question.difficulty),
                            }}
                          ></div>
                          <span className={styles.percentageText}>
                            {question.percentage_correct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>{question.average_time_seconds.toFixed(1)}</td>
                      <td>
                        <span
                          className={styles.difficultyBadge}
                          style={{
                            backgroundColor: getDifficultyColor(question.difficulty),
                            color: 'white',
                          }}
                        >
                          {getDifficultyLabel(question.difficulty).split(' ')[0]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>No question data available</div>
          )}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ backgroundColor: '#10B981' }}
            ></div>
            <span>Easy (75%+ students answered correctly)</span>
          </div>
          <div className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ backgroundColor: '#F59E0B' }}
            ></div>
            <span>Medium (26-74% students answered correctly)</span>
          </div>
          <div className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ backgroundColor: '#EF4444' }}
            ></div>
            <span>Hard (≤25% students answered correctly)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
