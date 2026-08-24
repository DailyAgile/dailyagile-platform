/**
 * Quiz Filter Utilities
 * Functions to filter and search quizzes
 */

import { FilterOptions } from '@/components/quiz/QuizFilters';

export interface Quiz {
  id: string;
  title: string;
  quizCode: string;
  totalQuestions: number;
  totalPoints: number;
  createdAt?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  attempts?: number;
  passRate?: number;
  averageScore?: number;
}

/**
 * Determine difficulty from question count
 */
export function determineDifficulty(questionCount: number): 'Easy' | 'Medium' | 'Hard' {
  if (questionCount <= 10) return 'Easy';
  if (questionCount <= 25) return 'Medium';
  return 'Hard';
}

/**
 * Determine quiz type from metadata
 */
export function getQuizType(
  quiz: any
): 'CSV' | 'AI' | 'Manual' | 'Unknown' {
  if (quiz.title?.includes('AI Generated')) return 'AI';
  if (quiz.title?.includes('CSV Import')) return 'CSV';
  if (quiz.title?.includes('Manual')) return 'Manual';
  return 'Unknown';
}

/**
 * Filter quizzes based on FilterOptions
 */
export function filterQuizzes(quizzes: Quiz[], filters: FilterOptions): Quiz[] {
  let filtered = [...quizzes];

  // Search by title
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (q) =>
        q.title.toLowerCase().includes(query) ||
        q.quizCode.toLowerCase().includes(query)
    );
  }

  // Filter by difficulty
  if (filters.difficulty !== 'All') {
    filtered = filtered.filter((q) => {
      const difficulty = q.difficulty || determineDifficulty(q.totalQuestions);
      return difficulty === filters.difficulty;
    });
  }

  // Filter by quiz type
  if (filters.quizType !== 'All') {
    filtered = filtered.filter((q) => {
      const type = getQuizType(q);
      return type === filters.quizType;
    });
  }

  // Filter by date range
  if (filters.dateRange !== 'All') {
    const now = new Date();
    const daysAgo = {
      Week: 7,
      Month: 30,
      Year: 365,
    }[filters.dateRange];

    if (daysAgo) {
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((q) => {
        const qDate = q.createdAt ? new Date(q.createdAt) : new Date(0);
        return qDate >= cutoffDate;
      });
    }
  }

  // Filter by min/max questions
  if (filters.minQuestions !== undefined) {
    filtered = filtered.filter((q) => q.totalQuestions >= filters.minQuestions!);
  }

  if (filters.maxQuestions !== undefined) {
    filtered = filtered.filter((q) => q.totalQuestions <= filters.maxQuestions!);
  }

  // Sort results
  filtered = sortQuizzes(filtered, filters.sortBy);

  return filtered;
}

/**
 * Sort quizzes based on sort option
 */
export function sortQuizzes(
  quizzes: Quiz[],
  sortBy: 'Newest' | 'Oldest' | 'Popular' | 'HighestRated'
): Quiz[] {
  const sorted = [...quizzes];

  switch (sortBy) {
    case 'Newest':
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
      break;

    case 'Oldest':
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );
      break;

    case 'Popular':
      sorted.sort(
        (a, b) => (b.attempts || 0) - (a.attempts || 0)
      );
      break;

    case 'HighestRated':
      sorted.sort(
        (a, b) => (b.averageScore || 0) - (a.averageScore || 0)
      );
      break;
  }

  return sorted;
}

/**
 * Search quizzes by query
 */
export function searchQuizzes(quizzes: Quiz[], query: string): Quiz[] {
  if (!query) return quizzes;

  const lowerQuery = query.toLowerCase();
  return quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(lowerQuery) ||
      q.quizCode.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get statistics summary for quiz list
 */
export function getQuizListStats(quizzes: Quiz[]) {
  return {
    totalQuizzes: quizzes.length,
    averageDifficulty:
      quizzes.reduce((sum, q) => {
        const difficulty = q.difficulty || determineDifficulty(q.totalQuestions);
        const score = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3;
        return sum + score;
      }, 0) / quizzes.length,
    totalQuestions: quizzes.reduce((sum, q) => sum + q.totalQuestions, 0),
    averagePassRate:
      quizzes.filter((q) => q.passRate).reduce((sum, q) => sum + (q.passRate || 0), 0) /
      quizzes.filter((q) => q.passRate).length,
  };
}
