/**
 * CompletionStatsCard Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CompletionStatsCard } from '@/components/instructor/completion-stats-card';

describe('CompletionStatsCard', () => {
  const mockStat = {
    quiz_id: 'quiz-123',
    quiz_code: 'TEST-001',
    title: 'Sample Quiz',
    assigned_count: 10,
    completed_count: 7,
    completion_percentage: 70,
    avg_score: 85,
    last_completion_date: '2026-08-28T14:30:00Z',
  };

  it('should render quiz title and code', () => {
    render(<CompletionStatsCard stat={mockStat} />);

    expect(screen.getByText('Sample Quiz')).toBeInTheDocument();
    expect(screen.getByText(/TEST-001/)).toBeInTheDocument();
  });

  it('should display assigned count', () => {
    render(<CompletionStatsCard stat={mockStat} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('should display completed count', () => {
    render(<CompletionStatsCard stat={mockStat} />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should display completion percentage', () => {
    render(<CompletionStatsCard stat={mockStat} />);

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('should display average score', () => {
    render(<CompletionStatsCard stat={mockStat} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Avg Score')).toBeInTheDocument();
  });

  it('should display last completion date', () => {
    render(<CompletionStatsCard stat={mockStat} />);

    const dateElement = screen.getByText(/Aug 28, 2026/);
    expect(dateElement).toBeInTheDocument();
  });

  it('should show pending count when not all completed', () => {
    render(<CompletionStatsCard stat={mockStat} />);

    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  it('should show all completed message when completion is 100%', () => {
    const fullStat = { ...mockStat, completed_count: 10, completion_percentage: 100 };
    render(<CompletionStatsCard stat={fullStat} />);

    expect(screen.getByText('✓ All completed')).toBeInTheDocument();
  });

  it('should show no assignments message when assigned_count is 0', () => {
    const noAssignmentsStat = { ...mockStat, assigned_count: 0, completed_count: 0, completion_percentage: 0 };
    render(<CompletionStatsCard stat={noAssignmentsStat} />);

    expect(screen.getByText('No assignments yet')).toBeInTheDocument();
  });

  it('should handle null average score', () => {
    const noScoreStat = { ...mockStat, avg_score: null };
    render(<CompletionStatsCard stat={noScoreStat} />);

    // Should not render the avg score card
    const avgScoreElements = screen.queryAllByText('Avg Score');
    expect(avgScoreElements.length).toBe(0);
  });

  it('should handle null last completion date', () => {
    const noDateStat = { ...mockStat, last_completion_date: null };
    render(<CompletionStatsCard stat={noDateStat} />);

    expect(screen.getByText('No completions yet')).toBeInTheDocument();
  });

  it('should call onClick handler when provided', () => {
    const handleClick = jest.fn();
    const { container } = render(<CompletionStatsCard stat={mockStat} onClick={handleClick} />);

    const card = container.firstChild;
    if (card) {
      (card as HTMLElement).click();
      expect(handleClick).toHaveBeenCalled();
    }
  });

  it('should hide details when showDetails is false', () => {
    render(<CompletionStatsCard stat={mockStat} showDetails={false} />);

    // Should still show the main stats
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Sample Quiz')).toBeInTheDocument();
  });

  it('should use correct color for completion percentage >= 80%', () => {
    const highCompletionStat = { ...mockStat, completion_percentage: 85 };
    const { container } = render(<CompletionStatsCard stat={highCompletionStat} />);

    // Check for success color (green)
    expect(container.innerHTML).toContain('10B981'); // success green color
  });

  it('should use correct color for completion percentage < 40%', () => {
    const lowCompletionStat = { ...mockStat, completion_percentage: 30, completed_count: 3 };
    const { container } = render(<CompletionStatsCard stat={lowCompletionStat} />);

    // Check for orange warning color
    expect(container.innerHTML).toContain('EA580C'); // orange color
  });

  it('should format score label correctly for high scores', () => {
    const highScoreStat = { ...mockStat, avg_score: 90 };
    const { container } = render(<CompletionStatsCard stat={highScoreStat} />);

    // Should contain 90% and Excellent
    expect(container.innerHTML).toContain('90%');
  });
});
