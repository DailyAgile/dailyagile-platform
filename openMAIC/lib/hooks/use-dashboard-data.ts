'use client';

import { useEffect, useState } from 'react';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'Free' | 'Premium';
  industry: string;
  passRate: number;
  yourBestScore?: number;
  questionCount: number;
}

export interface Recommendation {
  quizId: string;
  quizTitle: string;
  reason: 'spaced_repetition' | 'weak_area' | 'next_in_line';
  daysUntilNext: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt: string;
  requirements: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

export interface DashboardData {
  quizzes: Quiz[];
  recommendation: Recommendation | null;
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  totalQuizzes: number;
}

export function useDashboardData(pageNumber = 1, pageSize = 20) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/student/dashboard?page=${pageNumber}&pageSize=${pageSize}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
        }

        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Set fallback mock data for development
        setData({
          quizzes: [
            {
              id: 'quiz-1',
              title: 'Python Basics',
              description: 'Learn fundamental Python programming concepts',
              difficulty: 'Beginner',
              type: 'Free',
              industry: 'Technology',
              passRate: 85,
              yourBestScore: 90,
              questionCount: 10,
            },
            {
              id: 'quiz-2',
              title: 'Machine Learning 101',
              description: 'Introduction to machine learning algorithms',
              difficulty: 'Intermediate',
              type: 'Premium',
              industry: 'AI',
              passRate: 72,
              questionCount: 15,
            },
            {
              id: 'quiz-3',
              title: 'Data Structures',
              description: 'Master essential data structures',
              difficulty: 'Intermediate',
              type: 'Free',
              industry: 'Technology',
              passRate: 78,
              yourBestScore: 85,
              questionCount: 12,
            },
          ],
          recommendation: {
            quizId: 'quiz-1',
            quizTitle: 'Python Basics',
            reason: 'spaced_repetition',
            daysUntilNext: 3,
          },
          badges: [
            {
              id: 'badge-1',
              name: 'Quick Learner',
              icon: '⚡',
              earnedAt: '2024-08-13',
              requirements: 'Complete 5 quizzes in one week',
            },
            {
              id: 'badge-2',
              name: 'Persistence',
              icon: '🔥',
              earnedAt: '2024-08-10',
              requirements: 'Maintain a 5-day streak',
            },
          ],
          leaderboard: [
            { rank: 1, studentId: 'user-456', name: 'Alex', points: 4521, isCurrentUser: false },
            { rank: 2, studentId: 'user-789', name: 'Jordan', points: 4340, isCurrentUser: false },
            {
              rank: 47,
              studentId: 'current-user',
              name: 'You',
              points: 2340,
              isCurrentUser: true,
            },
          ],
          totalQuizzes: 28,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [pageNumber, pageSize]);

  return { data, loading, error };
}
