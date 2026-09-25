/**
 * Tests for Performance Dashboard Component
 * Feature 1.4: Student Performance Report
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceDashboard } from '@/components/instructor/performance-dashboard';

const mockStats = {
  total_quizzes_assigned: 5,
  total_quizzes_completed: 3,
  completion_percentage: 60,
  average_score: 78,
  last_activity: '2026-08-27T15:30:00Z',
};

const mockQuizzes = [
  {
    quiz_id: 'quiz-1',
    quiz_title: 'Quiz 1: Basics',
    score: 85,
    percentage: 85,
    passed: true,
    attempted_at: '2026-08-27T14:30:00Z',
    duration_seconds: 900,
    status: 'completed' as const,
  },
  {
    quiz_id: 'quiz-2',
    quiz_title: 'Quiz 2: Advanced',
    score: 70,
    percentage: 70,
    passed: true,
    attempted_at: '2026-08-26T10:00:00Z',
    duration_seconds: 1200,
    status: 'completed' as const,
  },
  {
    quiz_id: 'quiz-3',
    quiz_title: 'Quiz 3: Challenge',
    score: 45,
    percentage: 45,
    passed: false,
    attempted_at: '2026-08-25T09:00:00Z',
    duration_seconds: 600,
    status: 'completed' as const,
  },
  {
    quiz_id: 'quiz-4',
    quiz_title: 'Quiz 4: Final',
    score: null,
    percentage: null,
    passed: null,
    attempted_at: null,
    duration_seconds: null,
    status: 'pending' as const,
  },
  {
    quiz_id: 'quiz-5',
    quiz_title: 'Quiz 5: Extra',
    score: null,
    percentage: null,
    passed: null,
    attempted_at: null,
    duration_seconds: null,
    status: 'pending' as const,
  },
];

describe('PerformanceDashboard Component', () => {
  describe('Rendering', () => {
    it('should render student name and email', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display loading state', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
          isLoading={true}
        />,
      );

      expect(screen.getByText('Loading performance data...')).toBeInTheDocument();
    });

    it('should render without student name when empty', () => {
      render(
        <PerformanceDashboard
          studentName=""
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Statistics Cards', () => {
    it('should display quizzes assigned stat', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Quizzes Assigned')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display quizzes completed stat', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display completion percentage', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should display average score', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Average Score')).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
    });

    it('should display last activity', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Last Activity')).toBeInTheDocument();
      const lastActivityElements = screen.getAllByText(/ago|ago/);
      expect(lastActivityElements.length).toBeGreaterThan(0);
    });

    it('should show Never for last activity when null', () => {
      const statsWithoutActivity = { ...mockStats, last_activity: null };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={statsWithoutActivity}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('Quiz Results Table', () => {
    it('should render quiz results table', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Quiz Results')).toBeInTheDocument();
      expect(screen.getByText('Quiz 1: Basics')).toBeInTheDocument();
      expect(screen.getByText('Quiz 2: Advanced')).toBeInTheDocument();
    });

    it('should display quiz scores', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('should display quiz percentages', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const percentages = screen.getAllByText(/%/);
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('should show empty state when no quizzes', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={{ ...mockStats, total_quizzes_assigned: 0 }}
          quizzes={[]}
        />,
      );

      expect(screen.getByText('No quizzes assigned yet')).toBeInTheDocument();
    });

    it('should format duration correctly in table', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      // 900 seconds = 15 minutes
      expect(screen.getByText('15m 0s')).toBeInTheDocument();
      // 1200 seconds = 20 minutes
      expect(screen.getByText('20m 0s')).toBeInTheDocument();
      // 600 seconds = 10 minutes
      expect(screen.getByText('10m 0s')).toBeInTheDocument();
    });

    it('should show dash for missing duration', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe('Status Badges', () => {
    it('should show passed badge for successful quizzes', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const passedBadges = screen.getAllByText(/Passed/);
      expect(passedBadges.length).toBeGreaterThan(0);
    });

    it('should show failed badge for unsuccessful quizzes', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const failedBadges = screen.getAllByText(/Failed/);
      expect(failedBadges.length).toBeGreaterThan(0);
    });

    it('should show pending badge for not started quizzes', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const pendingBadges = screen.getAllByText('Pending');
      expect(pendingBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Insights', () => {
    it('should show excellent performance insight for high average score', () => {
      const highScoreStats = { ...mockStats, average_score: 85 };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={highScoreStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Excellent performance!')).toBeInTheDocument();
      expect(screen.getByText(/Average score of 85% is outstanding/)).toBeInTheDocument();
    });

    it('should show good performance insight for medium average score', () => {
      const mediumScoreStats = { ...mockStats, average_score: 70 };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mediumScoreStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Good performance')).toBeInTheDocument();
    });

    it('should show all completed insight when completion is 100%', () => {
      const completedStats = {
        ...mockStats,
        total_quizzes_completed: 5,
        completion_percentage: 100,
      };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={completedStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('All quizzes completed!')).toBeInTheDocument();
    });

    it('should show work in progress insight', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Work in progress')).toBeInTheDocument();
      expect(screen.getByText(/2 quizzes remaining/)).toBeInTheDocument();
    });

    it('should show no quizzes started insight', () => {
      const notStartedStats = {
        ...mockStats,
        total_quizzes_assigned: 5,
        total_quizzes_completed: 0,
        completion_percentage: 0,
      };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={notStartedStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('No quizzes started')).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('should handle null student name gracefully', () => {
      render(
        <PerformanceDashboard
          studentName=""
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should handle null last activity date', () => {
      const statsWithoutDate = { ...mockStats, last_activity: null };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={statsWithoutDate}
          quizzes={mockQuizzes}
        />,
      );

      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('should handle empty quiz list', () => {
      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={{ ...mockStats, total_quizzes_assigned: 0 }}
          quizzes={[]}
        />,
      );

      expect(screen.getByText('No quizzes assigned yet')).toBeInTheDocument();
    });

    it('should handle zero average score', () => {
      const zeroScoreStats = { ...mockStats, average_score: 0 };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={zeroScoreStats}
          quizzes={[
            {
              quiz_id: 'quiz-1',
              quiz_title: 'Quiz 1',
              score: 0,
              percentage: 0,
              passed: false,
              attempted_at: '2026-08-27T14:30:00Z',
              duration_seconds: 100,
              status: 'completed',
            },
          ]}
        />,
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should format high percentages correctly', () => {
      const highScoreStats = { ...mockStats, average_score: 100, completion_percentage: 100 };

      render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={highScoreStats}
          quizzes={mockQuizzes}
        />,
      );

      const hundredPercentElements = screen.getAllByText('100%');
      expect(hundredPercentElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Responsive Design', () => {
    it('should render stat cards with responsive grid', () => {
      const { container } = render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const gridElement = container.querySelector('.grid.grid-cols-1.gap-4.sm\\:grid-cols-2');
      expect(gridElement).toBeInTheDocument();
    });

    it('should render table with scrollable container on mobile', () => {
      const { container } = render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const scrollableTable = container.querySelector('.overflow-x-auto');
      expect(scrollableTable).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use green color for passed badges', () => {
      const { container } = render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const greenBadges = container.querySelectorAll('.bg-green-100');
      expect(greenBadges.length).toBeGreaterThan(0);
    });

    it('should use red color for failed badges', () => {
      const { container } = render(
        <PerformanceDashboard
          studentName="John Doe"
          studentEmail="john@example.com"
          stats={mockStats}
          quizzes={mockQuizzes}
        />,
      );

      const redBadges = container.querySelectorAll('.bg-red-100');
      expect(redBadges.length).toBeGreaterThan(0);
    });
  });
});
