'use client';

/**
 * Gradebook Table Component
 * Display student grades with sorting, search, and color-coding
 *
 * Features:
 * - Sortable columns (name, email, average score)
 * - Search by student name or email
 * - Color-coded scores: red (<70%), yellow (70-85%), green (>85%)
 * - Export to CSV functionality
 * - Pagination (50 students per page)
 * - Responsive design
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  Download,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import type { StudentRosterWithDetails, QuizSubmission, QuizAnswer } from '@/lib/ilt/types/models';
import { toast } from '@/components/ilt/ui/Toast';

interface GradebookTableProps {
  classroom_id: string;
  onOverrideClick?: (submission: QuizSubmission, answer: QuizAnswer) => void;
}

type SortColumn = 'name' | 'email' | 'average_score';
type SortOrder = 'asc' | 'desc';

interface StudentGrade {
  student: StudentRosterWithDetails;
  quizzes: QuizSubmission[];
  averageScore: number;
  completionRate: number;
}

export function GradebookTable({ classroom_id }: GradebookTableProps) {
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('average_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Fetch grades from API
  const fetchGrades = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: search,
        sort: sortColumn,
        order: sortOrder,
      });

      const response = await fetch(
        `/api/classrooms/${classroom_id}/gradebook?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load grades');
      }

      const data = await response.json();
      setGrades(data.grades);
      setTotalPages(data.pagination.total_pages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Failed to fetch grades:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classroom_id, page, search, sortColumn, sortOrder]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  // Handle column sort
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
    setPage(1);
  }, [sortColumn, sortOrder]);

  // Export gradebook
  const handleExport = useCallback(async () => {
    try {
      const toastId = toast.loading('Generating gradebook...');

      const response = await fetch(
        `/api/classrooms/${classroom_id}/gradebook/export`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to export gradebook');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gradebook-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss(toastId);
      toast.success('Gradebook exported');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export';
      toast.error(message);
    }
  }, [classroom_id]);

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-700';
    if (score >= 70) return 'text-yellow-700';
    return 'text-red-700';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 85) return 'bg-green-50';
    if (score >= 70) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Error loading gradebook</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => fetchGrades()}
            aria-label="Retry loading gradebook"
            className="ml-auto rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search students"
              className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          aria-label="Export gradebook as CSV"
          className="flex items-center gap-2 rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Gradebook Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full">
          <thead className="bg-zinc-50">
            <tr className="border-b border-zinc-200">
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-teal-600"
                  aria-label="Sort by name"
                >
                  Name
                  {sortColumn === 'name' && (
                    <ArrowUpDown
                      className={`h-4 w-4 ${
                        sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'
                      }`}
                    />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-2 hover:text-teal-600"
                  aria-label="Sort by email"
                >
                  Email
                  {sortColumn === 'email' && (
                    <ArrowUpDown
                      className={`h-4 w-4 ${
                        sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'
                      }`}
                    />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-zinc-900">
                Quizzes Taken
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-zinc-900">
                <button
                  onClick={() => handleSort('average_score')}
                  className="flex items-center justify-center gap-2 hover:text-teal-600 w-full"
                  aria-label="Sort by average score"
                >
                  Average Score
                  {sortColumn === 'average_score' && (
                    <ArrowUpDown
                      className={`h-4 w-4 ${
                        sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'
                      }`}
                    />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-zinc-900">
                Completion
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton Loading
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-zinc-100 animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-zinc-200 rounded" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-zinc-200 rounded" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-4 w-8 bg-zinc-200 rounded mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-4 w-12 bg-zinc-200 rounded mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-4 w-16 bg-zinc-200 rounded mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="h-4 w-16 bg-zinc-200 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : grades.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="inline-block text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-zinc-300 mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900 mb-2">
                      No grades yet
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {search
                        ? 'No students match your search.'
                        : 'Grades will appear here as students complete quizzes.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Grade Rows
              grades.map((grade) => (
                <tr
                  key={grade.student.id}
                  className="border-b border-zinc-100 hover:bg-teal-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                    {grade.student.student?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {grade.student.student?.email}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-zinc-900">
                    {grade.quizzes.length}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div
                      className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-semibold ${getScoreBgColor(
                        grade.averageScore,
                      )} ${getScoreColor(grade.averageScore)}`}
                    >
                      {grade.averageScore.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-zinc-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full"
                          style={{ width: `${grade.completionRate * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-zinc-600">
                        {Math.round(grade.completionRate * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    {grade.averageScore >= 70 ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                        ✓ Passing
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                        ⚠ At Risk
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 hover:bg-zinc-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 hover:bg-zinc-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <p className="text-xs text-zinc-500">
        Showing {grades.length} student(s)
        {search && ` matching "${search}"`}
      </p>

      {/* Legend */}
      <div className="rounded-lg bg-zinc-50 p-4">
        <p className="text-xs font-medium text-zinc-600 mb-3">Score Color Guide:</p>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
            <span className="text-zinc-600">85%+ Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
            <span className="text-zinc-600">70-84% Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
            <span className="text-zinc-600">&lt;70% Needs Help</span>
          </div>
        </div>
      </div>
    </div>
  );
}
