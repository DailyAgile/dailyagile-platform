'use client';

import { useState, useEffect } from 'react';
import { mockQuizApi } from '@/lib/api/mock-api';
import { createLogger } from '@/lib/logger';

const log = createLogger('useAssignments');

export interface Assignment {
  id: string;
  assignment_code: string;
  quiz_id: string;
  expires_at: string;
  status: 'active' | 'archived' | 'expired';
  is_active: boolean;
  quiz_title?: string;
  total_questions?: number;
  total_points?: number;
}

export interface QuizInfo {
  id: string;
  title: string;
  description?: string;
  total_questions: number;
  total_points: number;
}

interface UseAssignmentsReturn {
  activeAssignments: Assignment[];
  expiredAssignments: Assignment[];
  archivedAssignments: Assignment[];
  quizInfo: Record<string, QuizInfo>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch student assignments
 * Separates assignments by status (active, expired, archived)
 * Also fetches quiz info for each assignment
 */
export function useAssignments(studentId: string | null): UseAssignmentsReturn {
  const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
  const [expiredAssignments, setExpiredAssignments] = useState<Assignment[]>([]);
  const [archivedAssignments, setArchivedAssignments] = useState<Assignment[]>([]);
  const [quizInfo, setQuizInfo] = useState<Record<string, QuizInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try real API first, fallback to mock
      const endpoint = `/api/quiz/assignments?studentId=${id}`;
      const response = await fetch(endpoint).catch(async () => {
        log.info('Real API not available, using mock API');
        const result = await mockQuizApi.getAssignments(id);
        return {
          ok: result.success,
          status: result.success ? 200 : 400,
          json: async () => result
        } as Response;
      });

      if (!response.ok) {
        throw new Error('Failed to load assignments');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load assignments');
      }

      // Separate into categories
      setActiveAssignments(data.data?.active || []);
      setExpiredAssignments(data.data?.expired || []);
      setArchivedAssignments(data.data?.archived || []);

      // Load quiz info for each assignment
      const allAssignments = [
        ...(data.data?.active || []),
        ...(data.data?.expired || [])
      ];
      const quizIds = [...new Set(allAssignments.map((a: Assignment) => a.quiz_id))];

      log.info(`Loading quiz info for ${quizIds.length} quizzes`);

      for (const quizId of quizIds) {
        try {
          const quizResponse = await fetch(`/api/quiz/${quizId}`).catch(async () => {
            const result = await mockQuizApi.getQuizInfo(quizId);
            return {
              ok: result.success,
              status: result.success ? 200 : 400,
              json: async () => result
            } as Response;
          });

          if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            if (quizData.success) {
              setQuizInfo((prev) => ({
                ...prev,
                [quizId]: quizData.data
              }));
            }
          }
        } catch (err) {
          log.warn(`Failed to load quiz info for ${quizId}:`, err);
        }
      }
    } catch (err) {
      log.error('Failed to load assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    if (!studentId) return;
    await loadAssignments(studentId);
  };

  // Load on mount or when studentId changes
  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError(null);
      return;
    }

    loadAssignments(studentId);
  }, [studentId]);

  return {
    activeAssignments,
    expiredAssignments,
    archivedAssignments,
    quizInfo,
    loading,
    error,
    refetch
  };
}
