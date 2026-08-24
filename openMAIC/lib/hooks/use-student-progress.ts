'use client';

import { useEffect, useState } from 'react';

export interface StudentProgress {
  studentId: string;
  score: number;
  streak: number;
  totalPoints: number;
  badgeCount: number;
  completedQuizzes: number;
  totalQuizzes: number;
}

export function useStudentProgress() {
  const [data, setData] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/student/progress', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch progress: ${response.statusText}`);
        }

        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Set fallback mock data for development
        setData({
          studentId: 'user-123',
          score: 78,
          streak: 5,
          totalPoints: 420,
          badgeCount: 7,
          completedQuizzes: 12,
          totalQuizzes: 28,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    // Refresh every 30 seconds
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
