'use client';

/**
 * Quiz Search and Filter Component
 * Reusable filter controls for quiz discovery
 */

import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizFilters');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  orange: '#EA580C',
};

export interface FilterOptions {
  searchQuery: string;
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard';
  quizType: 'All' | 'CSV' | 'AI' | 'Manual';
  dateRange: 'All' | 'Week' | 'Month' | 'Year';
  sortBy: 'Newest' | 'Oldest' | 'Popular' | 'HighestRated';
  minQuestions?: number;
  maxQuestions?: number;
}

interface QuizFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  showAdvanced?: boolean;
  totalResults?: number;
}

export default function QuizFilters({
  onFilterChange,
  showAdvanced = false,
  totalResults,
}: QuizFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    difficulty: 'All',
    quizType: 'All',
    dateRange: 'All',
    sortBy: 'Newest',
  });

  const [isExpanded, setIsExpanded] = useState(showAdvanced);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
    log.info('Filters updated:', updatedFilters);
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterOptions = {
      searchQuery: '',
      difficulty: 'All',
      quizType: 'All',
      dateRange: 'All',
      sortBy: 'Newest',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.difficulty !== 'All' ||
    filters.quizType !== 'All' ||
    filters.dateRange !== 'All' ||
    filters.sortBy !== 'Newest';

  return (
    <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-4 bg-white mb-6">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
            placeholder="🔍 Search by quiz title or topic..."
            style={{ borderColor: BRAND_COLORS.border }}
            className="w-full px-4 py-3 rounded-lg border bg-white focus:ring-2 focus:ring-offset-0"
            onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
            onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
          />
        </div>
      </div>

      {/* Quick Filters Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Difficulty */}
        <div>
          <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
            Difficulty
          </label>
          <select
            value={filters.difficulty}
            onChange={(e) => handleFilterChange({ difficulty: e.target.value as any })}
            style={{ borderColor: BRAND_COLORS.border }}
            className="w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2"
          >
            <option>All</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>

        {/* Quiz Type */}
        <div>
          <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
            Type
          </label>
          <select
            value={filters.quizType}
            onChange={(e) => handleFilterChange({ quizType: e.target.value as any })}
            style={{ borderColor: BRAND_COLORS.border }}
            className="w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2"
          >
            <option>All</option>
            <option>CSV</option>
            <option>AI</option>
            <option>Manual</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
            Created
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange({ dateRange: e.target.value as any })}
            style={{ borderColor: BRAND_COLORS.border }}
            className="w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2"
          >
            <option>All</option>
            <option>Week</option>
            <option>Month</option>
            <option>Year</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
            style={{ borderColor: BRAND_COLORS.border }}
            className="w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2"
          >
            <option>Newest</option>
            <option>Oldest</option>
            <option>Popular</option>
            <option>HighestRated</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      {!showAdvanced && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ color: BRAND_COLORS.teal }}
          className="text-sm font-semibold hover:underline mb-3"
        >
          {isExpanded ? '▼ Advanced Filters' : '▶ Advanced Filters'}
        </button>
      )}

      {/* Advanced Filters */}
      {isExpanded && (
        <div
          style={{ backgroundColor: BRAND_COLORS.light }}
          className="rounded-lg p-4 mb-4"
        >
          <h3 style={{ color: BRAND_COLORS.navy }} className="font-semibold mb-3">
            Question Count Range
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: BRAND_COLORS.gray }} className="block text-sm mb-1">
                Minimum Questions
              </label>
              <input
                type="number"
                min="0"
                value={filters.minQuestions || ''}
                onChange={(e) =>
                  handleFilterChange({
                    minQuestions: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Any"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2"
              />
            </div>
            <div>
              <label style={{ color: BRAND_COLORS.gray }} className="block text-sm mb-1">
                Maximum Questions
              </label>
              <input
                type="number"
                min="0"
                value={filters.maxQuestions || ''}
                onChange={(e) =>
                  handleFilterChange({
                    maxQuestions: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Any"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-3 py-2 rounded-lg border bg-white text-sm focus:ring-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter Info and Clear Button */}
      <div className="flex items-center justify-between">
        <div>
          {totalResults !== undefined && (
            <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
              <span style={{ color: BRAND_COLORS.navy }} className="font-bold">
                {totalResults}
              </span>{' '}
              quizzes found
            </p>
          )}
          {hasActiveFilters && (
            <p style={{ color: BRAND_COLORS.teal }} className="text-xs mt-1">
              Filters active
            </p>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            style={{ color: BRAND_COLORS.teal, borderColor: BRAND_COLORS.teal }}
            className="px-4 py-2 text-sm border rounded-lg font-semibold hover:bg-opacity-10 transition-colors"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
