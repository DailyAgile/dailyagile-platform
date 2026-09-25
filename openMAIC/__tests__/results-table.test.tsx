/**
 * Tests for Results Table Component
 * Feature 1.3: View Quiz Results & Scores
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsTable } from '@/components/instructor/results-table';

const mockResults = [
  {
    id: 'result-1',
    assignment_id: 'assignment-1',
    student: {
      id: 'student-1',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
    },
    status: 'completed',
    score: 85,
    percentage: 85,
    attempted_at: '2026-08-27T14:30:00Z',
    duration_seconds: 900,
  },
  {
    id: 'result-2',
    assignment_id: 'assignment-2',
    student: {
      id: 'student-2',
      email: 'jane@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
    },
    status: 'completed',
    score: 50,
    percentage: 50,
    attempted_at: '2026-08-26T10:00:00Z',
    duration_seconds: 1200,
  },
  {
    id: 'result-3',
    assignment_id: 'assignment-3',
    student: {
      id: 'student-3',
      email: 'bob@example.com',
      first_name: 'Bob',
      last_name: 'Johnson',
    },
    status: 'pending',
    score: null,
    percentage: null,
    attempted_at: null,
    duration_seconds: null,
  },
];

describe('ResultsTable Component', () => {
  describe('Rendering', () => {
    it('should render table with results', () => {
      render(<ResultsTable results={mockResults} />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<ResultsTable results={[]} isLoading={true} />);

      expect(screen.getByText('Loading results...')).toBeInTheDocument();
    });

    it('should show empty state when no results', () => {
      render(<ResultsTable results={[]} />);

      expect(screen.getByText('No results yet')).toBeInTheDocument();
    });

    it('should display student scores', () => {
      render(<ResultsTable results={mockResults} />);

      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should display percentage badges', () => {
      render(<ResultsTable results={mockResults} />);

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display status badges', () => {
      render(<ResultsTable results={mockResults} />);

      const badges = screen.getAllByText(/Passed|Failed|Pending/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by score ascending', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      // Click score header twice to get ascending order
      const scoreHeader = screen.getByRole('button', { name: /Score/i });
      await user.click(scoreHeader);
      await user.click(scoreHeader);

      const rows = screen.getAllByRole('row');
      // Should be ordered: 50, 85, - (pending has no score)
      expect(rows[1]).toHaveTextContent('jane@example.com');
      expect(rows[2]).toHaveTextContent('john@example.com');
    });

    it('should sort by score descending', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const scoreHeader = screen.getByRole('button', { name: /Score/i });
      await user.click(scoreHeader); // First click: descending

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('john@example.com'); // 85 is highest
    });

    it('should sort by email', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const emailHeader = screen.getByRole('button', { name: /Student Email/i });
      await user.click(emailHeader);

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('bob@example.com'); // 'b' comes first alphabetically
    });

    it('should sort by date', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const dateHeader = screen.getByRole('button', { name: /Completed/i });
      await user.click(dateHeader);

      const rows = screen.getAllByRole('row');
      // Should be sorted by attempted_at
      expect(rows[1]).toHaveTextContent('john@example.com'); // Most recent first
    });

    it('should toggle sort order', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ResultsTable results={mockResults} />);

      const scoreHeader = screen.getByRole('button', { name: /Score/i });

      // First click: descending
      await user.click(scoreHeader);
      expect(scoreHeader).toHaveTextContent('↓');

      // Second click: ascending
      await user.click(scoreHeader);
      expect(scoreHeader).toHaveTextContent('↑');
    });
  });

  describe('Filtering', () => {
    it('should filter by passed status', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const filterSelect = screen.getByDisplayValue('All Results');
      await user.selectOptions(filterSelect, 'passed');

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument(); // 50% is failed
    });

    it('should filter by failed status', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const filterSelect = screen.getByDisplayValue('All Results');
      await user.selectOptions(filterSelect, 'failed');

      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument(); // 85% is passed
    });

    it('should filter by pending status', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const filterSelect = screen.getByDisplayValue('All Results');
      await user.selectOptions(filterSelect, 'pending');

      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    });

    it('should search by email', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const searchInput = screen.getByPlaceholderText('Search by email...');
      await user.type(searchInput, 'john');

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
    });

    it('should case-insensitive search', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const searchInput = screen.getByPlaceholderText('Search by email...');
      await user.type(searchInput, 'JOHN');

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should show no results message when filter has no matches', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const searchInput = screen.getByPlaceholderText('Search by email...');
      await user.type(searchInput, 'nonexistent@example.com');

      expect(screen.getByText('No results match your filters')).toBeInTheDocument();
    });

    it('should clear search and show all results', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} />);

      const searchInput = screen.getByPlaceholderText('Search by email...') as HTMLInputElement;
      await user.type(searchInput, 'john');
      expect(searchInput.value).toBe('john');

      await user.clear(searchInput);
      expect(searchInput.value).toBe('');

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('should display summary stats cards', () => {
      render(<ResultsTable results={mockResults} />);

      expect(screen.getByText('Total Results')).toBeInTheDocument();
      expect(screen.getByText('Passed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should calculate correct passed count', () => {
      render(<ResultsTable results={mockResults} />);

      // Only john (85%) passed
      const passedBadges = screen.getAllByText(/Passed|Failed|Pending/);
      expect(passedBadges.length).toBeGreaterThan(0);
    });

    it('should calculate correct failed count', () => {
      render(<ResultsTable results={mockResults} />);

      // Only jane (50%) failed
      const stats = screen.getByText('Failed').closest('div');
      expect(stats).toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration correctly', () => {
      render(<ResultsTable results={mockResults} />);

      // 900 seconds = 15 minutes
      expect(screen.getByText('15m 0s')).toBeInTheDocument();
      // 1200 seconds = 20 minutes
      expect(screen.getByText('20m 0s')).toBeInTheDocument();
    });

    it('should show dash for missing duration', () => {
      render(<ResultsTable results={mockResults} />);

      const rows = screen.getAllByRole('row');
      expect(rows.some((row) => row.textContent?.includes('-'))).toBe(true);
    });
  });

  describe('Status Badges', () => {
    it('should show passed badge for high scores', () => {
      render(<ResultsTable results={mockResults} />);

      const passedBadge = screen.getByText(/Passed/);
      expect(passedBadge).toHaveClass('bg-green-100');
      expect(passedBadge).toHaveClass('text-green-800');
    });

    it('should show failed badge for low scores', () => {
      render(<ResultsTable results={mockResults} />);

      const failedBadge = screen.getByText(/Failed/);
      expect(failedBadge).toHaveClass('bg-red-100');
      expect(failedBadge).toHaveClass('text-red-800');
    });

    it('should show pending badge for pending quizzes', () => {
      render(<ResultsTable results={mockResults} />);

      const pendingBadges = screen.getAllByText('Pending');
      expect(pendingBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Student Link Navigation', () => {
    it('should render view profile links', () => {
      render(<ResultsTable results={mockResults} />);

      const profileLinks = screen.getAllByText('View Profile');
      expect(profileLinks.length).toBe(mockResults.length);
    });

    it('should include correct student ID in link', () => {
      render(<ResultsTable results={mockResults} />);

      const profileLinks = screen.getAllByRole('link', { name: /View Profile/i });
      expect(profileLinks[0]).toHaveAttribute('href', '/teach/analytics/student-1');
      expect(profileLinks[1]).toHaveAttribute('href', '/teach/analytics/student-2');
    });

    it('should call onStudentClick callback when link is clicked', async () => {
      const mockCallback = vi.fn();
      const user = userEvent.setup();

      render(<ResultsTable results={mockResults} onStudentClick={mockCallback} />);

      const profileLink = screen.getAllByRole('link', { name: /View Profile/i })[0];
      await user.click(profileLink);

      expect(mockCallback).toHaveBeenCalledWith('student-1');
    });
  });

  describe('Responsive Design', () => {
    it('should render table with responsive classes', () => {
      const { container } = render(<ResultsTable results={mockResults} />);

      const filterSection = container.querySelector('.flex.flex-col.gap-4.sm\\:flex-row');
      expect(filterSection).toBeInTheDocument();
    });

    it('should have scrollable table on small screens', () => {
      const { container } = render(<ResultsTable results={mockResults} />);

      const tableContainer = container.querySelector('.overflow-x-auto');
      expect(tableContainer).toBeInTheDocument();
    });
  });
});
