'use client';

/**
 * Student Roster Table Component
 * Displays list of enrolled students with filters, search, and actions
 *
 * User Experience Focus:
 * - Skeleton loading state while fetching
 * - Empty state with helpful messaging
 * - Column sort indicators (arrows on headers)
 * - Hover effects on rows
 * - Responsive mobile layout
 * - Bulk actions placeholder (remove, export)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  Mail,
  Trash2,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import type { StudentRosterWithDetails } from '@/lib/ilt/types/models';
import { toast } from '@/components/ilt/ui/Toast';

interface StudentRosterTableProps {
  classroom_id: string;
  instructor_id: string;
  on_add_student?: () => void;
}

type SortColumn = 'name' | 'email' | 'enrollment_date' | 'status';
type SortOrder = 'asc' | 'desc';

export function StudentRosterTable({
  classroom_id,
  instructor_id,
  on_add_student,
}: StudentRosterTableProps) {
  const [students, setStudents] = useState<StudentRosterWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'all'>('active');
  const [sortColumn, setSortColumn] = useState<SortColumn>('enrollment_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Fetch students from API
  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        status: status,
        search: search,
        sort: sortColumn,
        order: sortOrder,
      });

      const response = await fetch(`/api/classrooms/${classroom_id}/students?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load students');
      }

      const data = await response.json();
      setStudents(data.students);
      setTotalPages(data.pagination.total_pages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Failed to fetch students:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classroom_id, page, status, search, sortColumn, sortOrder]);

  // Load students on mount and when filters change
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle column sort
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortOrder('asc');
    }
    setPage(1); // Reset to first page
  }, [sortColumn, sortOrder]);

  // Handle toggle all selection
  const handleSelectAll = useCallback(() => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((s) => s.student_id)));
    }
  }, [students, selectedStudents]);

  // Handle select individual student
  const handleSelectStudent = useCallback((studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  }, [selectedStudents]);

  // Handle remove student
  const handleRemoveStudent = useCallback(async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student?')) return;

    try {
      const response = await fetch(
        `/api/classrooms/${classroom_id}/students?student_id=${studentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to remove student');
      }

      toast.success('Student removed');
      await fetchStudents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove student';
      toast.error(message);
    }
  }, [classroom_id, fetchStudents]);

  // Handle bulk remove
  const handleBulkRemove = useCallback(async () => {
    if (selectedStudents.size === 0) return;
    if (!confirm(`Remove ${selectedStudents.size} selected student(s)?`)) return;

    try {
      const toastId = toast.loading(`Removing ${selectedStudents.size} students...`);

      for (const studentId of selectedStudents) {
        await fetch(
          `/api/classrooms/${classroom_id}/students?student_id=${studentId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
          },
        );
      }

      toast.dismiss(toastId);
      toast.success(`${selectedStudents.size} student(s) removed`);
      setSelectedStudents(new Set());
      await fetchStudents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove students';
      toast.error(message);
    }
  }, [classroom_id, selectedStudents, fetchStudents]);

  // Handle export roster
  const handleExport = useCallback(async () => {
    try {
      const toastId = toast.loading('Generating roster...');

      const response = await fetch(
        `/api/classrooms/${classroom_id}/students/export`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to export roster');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss(toastId);
      toast.success('Roster exported successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export roster';
      toast.error(message);
    }
  }, [classroom_id]);

  // Handle resend invite
  const handleResendInvite = useCallback(async (studentEmail: string) => {
    try {
      // TODO: Implement resend invite endpoint
      alert('Invite resend coming soon! Email would be sent to: ' + studentEmail);
    } catch (err) {
      alert('Failed to resend invite');
    }
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Error loading students</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => fetchStudents()}
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
      {/* Header with Search and Add Button */}
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
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            aria-label="Filter by enrollment status"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="active">Active</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={on_add_student}
            aria-label="Add a new student"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedStudents.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
          <span className="text-sm font-medium text-teal-900">
            {selectedStudents.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleBulkRemove}
              aria-label={`Remove ${selectedStudents.size} selected students`}
              className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
            <button
              onClick={() => setSelectedStudents(new Set())}
              aria-label="Clear selection"
              className="px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full">
          <thead className="bg-zinc-50">
            <tr className="border-b border-zinc-200">
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedStudents.size === students.length && students.length > 0}
                  onChange={handleSelectAll}
                  aria-label="Select all students"
                  className="rounded border-zinc-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-teal-600"
                  aria-label="Sort by name"
                >
                  Name
                  {sortColumn === 'name' && (
                    <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
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
                    <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                Student ID
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                <button
                  onClick={() => handleSort('enrollment_date')}
                  className="flex items-center gap-2 hover:text-teal-600"
                  aria-label="Sort by enrollment date"
                >
                  Enrolled
                  {sortColumn === 'enrollment_date' && (
                    <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 hover:text-teal-600"
                  aria-label="Sort by status"
                >
                  Status
                  {sortColumn === 'status' && (
                    <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton Loading State
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-zinc-100 animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 w-4 bg-zinc-200 rounded" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-zinc-200 rounded-full" />
                      <div className="h-4 w-24 bg-zinc-200 rounded" />
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="h-4 w-32 bg-zinc-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-zinc-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 bg-zinc-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-200 rounded ml-auto" /></td>
                </tr>
              ))
            ) : students.length === 0 ? (
              // Enhanced Empty State
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="inline-block text-center">
                    <div className="mb-4 flex justify-center">
                      <AlertCircle className="h-12 w-12 text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900 mb-2">
                      No students yet
                    </h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      {search ? 'No students match your search criteria.' : 'Start building your classroom by adding students.'}
                    </p>
                    {!search && (
                      <button
                        onClick={on_add_student}
                        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add First Student
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Student Rows
              students.map((roster) => (
                <tr
                  key={roster.id}
                  className="border-b border-zinc-100 hover:bg-teal-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(roster.student_id)}
                      onChange={() => handleSelectStudent(roster.student_id)}
                      aria-label={`Select ${roster.student?.name}`}
                      className="rounded border-zinc-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                    <div className="flex items-center gap-3">
                      {roster.student?.avatar_url && (
                        <img
                          src={roster.student.avatar_url}
                          alt={roster.student.name}
                          className="h-8 w-8 rounded-full bg-zinc-100 object-cover"
                        />
                      )}
                      <span>{roster.student?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {roster.student?.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {roster.student?.student_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {new Date(roster.enrollment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        roster.status === 'active'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {roster.status === 'active' ? '🟢' : '🔴'} {roster.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResendInvite(roster.student?.email || '')}
                        aria-label={`Resend invitation to ${roster.student?.name}`}
                        className="rounded p-1.5 hover:bg-zinc-100 transition-colors"
                        title="Resend invitation email"
                      >
                        <Mail className="h-4 w-4 text-zinc-500 hover:text-zinc-700" />
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(roster.student_id)}
                        aria-label={`Remove ${roster.student?.name}`}
                        className="rounded p-1.5 hover:bg-red-50 transition-colors"
                        title="Remove student"
                      >
                        <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            aria-label="Export roster as CSV"
            className="flex items-center gap-2 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
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

      {/* Summary */}
      <p className="text-xs text-zinc-500">
        Showing {students.length} students{search && ` matching "${search}"`}
      </p>
    </div>
  );
}
