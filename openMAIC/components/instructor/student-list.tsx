'use client';

import { useEffect, useState, useCallback } from 'react';

interface Student {
  id: string;
  email: string;
  name?: string;
  enrolled_at: string;
  quizzes_assigned: number;
  quizzes_completed: number;
  completion_percentage: number;
  last_activity?: string;
}

interface StudentListProps {
  onAssignQuiz?: (studentId?: string) => void;
}

/**
 * StudentList Component
 * Displays a table of students with search, filter, and pagination
 */
export function StudentList({ onAssignQuiz }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('instructor_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await fetch(`/api/instructor/students?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch students: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch students');
        return;
      }

      setStudents(data.data?.students || []);
      setTotalPages(data.data?.pagination?.pages || 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return '#10b981'; // green
    if (percentage >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      {/* Filters and Search */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginBottom: '25px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#64748B',
              marginBottom: '6px',
            }}
          >
            Search by Name or Email
          </label>
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxSizing: 'border-box',
              fontFamily: 'Calibri, sans-serif',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#64748B',
              marginBottom: '6px',
            }}
          >
            Completion Status
          </label>
          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value as 'all' | 'completed' | 'pending')
            }
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxSizing: 'border-box',
              fontFamily: 'Calibri, sans-serif',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="all">All Students</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#64748B',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #0891B2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px',
            }}
          />
          <p>Loading students...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Students Table */}
      {!loading && students.length > 0 && (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#1E3A5F',
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#1E3A5F',
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1E3A5F',
                  }}
                >
                  Assigned
                </th>
                <th
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1E3A5F',
                  }}
                >
                  Completed
                </th>
                <th
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1E3A5F',
                  }}
                >
                  Completion %
                </th>
                <th
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#1E3A5F',
                  }}
                >
                  Enrolled
                </th>
                <th
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1E3A5F',
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr
                  key={student.id}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  }}
                >
                  <td
                    style={{
                      padding: '14px 16px',
                      color: '#0891B2',
                      wordBreak: 'break-all',
                    }}
                  >
                    {student.email}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      color: '#1e293b',
                    }}
                  >
                    {student.name || 'N/A'}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      color: '#1e293b',
                    }}
                  >
                    {student.quizzes_assigned}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      color: '#1e293b',
                    }}
                  >
                    {student.quizzes_completed}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: '#f0f4f8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <svg
                          style={{
                            width: '24px',
                            height: '24px',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                          viewBox="0 0 36 36"
                        >
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="3"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke={getCompletionColor(student.completion_percentage)}
                            strokeWidth="3"
                            strokeDasharray={`${(student.completion_percentage / 100) * 100.53} 100.53`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            transform="rotate(-90 18 18)"
                          />
                        </svg>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: getCompletionColor(student.completion_percentage),
                            zIndex: 1,
                          }}
                        >
                          {student.completion_percentage}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      color: '#64748B',
                    }}
                  >
                    {formatDate(student.enrolled_at)}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <button
                      onClick={() => onAssignQuiz?.(student.id)}
                      style={{
                        backgroundColor: '#0891B2',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.backgroundColor = '#0a7a94')
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.backgroundColor = '#0891B2')
                      }
                    >
                      Assign Quiz
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && students.length === 0 && !error && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <p
            style={{
              fontSize: '16px',
              color: '#64748B',
              marginBottom: '10px',
            }}
          >
            No students found
          </p>
          <p
            style={{
              fontSize: '13px',
              color: '#94a3b8',
              margin: '0',
            }}
          >
            Create a quiz and assign it to students to see them here
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            marginTop: '30px',
          }}
        >
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: page === 1 ? '#e2e8f0' : '#0891B2',
              color: page === 1 ? '#94a3b8' : '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Previous
          </button>

          <span style={{ color: '#64748B', fontSize: '13px' }}>
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: page === totalPages ? '#e2e8f0' : '#0891B2',
              color: page === totalPages ? '#94a3b8' : '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
