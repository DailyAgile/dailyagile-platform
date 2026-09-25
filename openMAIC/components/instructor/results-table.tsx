'use client';

/**
 * Results Table Component
 * Displays quiz results in a sortable table
 */

import { useState } from 'react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  white: '#FFFFFF',
  border: '#E2E8F0',
  red: '#DC2626',
  green: '#16A34A',
};

interface QuizResult {
  id: string;
  assignment_id: string;
  student: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  status: string;
  score: number | null;
  percentage: number | null;
  attempted_at: string | null;
  duration_seconds: number | null;
}

interface ResultsTableProps {
  results: QuizResult[];
  quiz?: {
    title: string;
    total_questions: number;
    total_points: number;
    passing_score_percentage?: number;
  } | null;
  isLoading?: boolean;
}

type SortField = 'email' | 'score' | 'percentage' | 'date' | 'status';
type SortOrder = 'asc' | 'desc';

export default function ResultsTable({ results, quiz, isLoading = false }: ResultsTableProps) {
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

  const passingScore = quiz?.passing_score_percentage || 70;

  // Filter results
  const filtered = results.filter((r) => {
    if (filterStatus === 'completed') return r.status === 'completed';
    if (filterStatus === 'pending') return r.status !== 'completed';
    return true;
  });

  // Sort results
  const sorted = [...filtered].sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';

    if (sortBy === 'email') {
      aVal = a.student.email;
      bVal = b.student.email;
    } else if (sortBy === 'score') {
      aVal = a.score || 0;
      bVal = b.score || 0;
    } else if (sortBy === 'percentage') {
      aVal = a.percentage || 0;
      bVal = b.percentage || 0;
    } else if (sortBy === 'date') {
      aVal = a.attempted_at ? new Date(a.attempted_at).getTime() : 0;
      bVal = b.attempted_at ? new Date(b.attempted_at).getTime() : 0;
    } else if (sortBy === 'status') {
      aVal = a.status;
      bVal = b.status;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortArrow = (field: SortField) => {
    if (sortBy !== field) return ' ⇅';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: BRAND_COLORS.gray,
          backgroundColor: BRAND_COLORS.light,
          borderRadius: '8px',
        }}
      >
        Loading results...
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: BRAND_COLORS.gray,
          backgroundColor: BRAND_COLORS.light,
          borderRadius: '8px',
        }}
      >
        No results to display
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '8px 12px',
            backgroundColor: filterStatus === 'all' ? BRAND_COLORS.navy : BRAND_COLORS.light,
            color: filterStatus === 'all' ? 'white' : BRAND_COLORS.navy,
            border: `2px solid ${BRAND_COLORS.navy}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          All ({filtered.length})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          style={{
            padding: '8px 12px',
            backgroundColor: filterStatus === 'completed' ? BRAND_COLORS.teal : BRAND_COLORS.light,
            color: filterStatus === 'completed' ? 'white' : BRAND_COLORS.teal,
            border: `2px solid ${BRAND_COLORS.teal}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          Passed ({filtered.filter((r) => r.percentage && r.percentage >= passingScore).length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          style={{
            padding: '8px 12px',
            backgroundColor: filterStatus === 'pending' ? BRAND_COLORS.orange : BRAND_COLORS.light,
            color: filterStatus === 'pending' ? 'white' : BRAND_COLORS.orange,
            border: `2px solid ${BRAND_COLORS.orange}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          Pending ({filtered.filter((r) => r.status !== 'completed').length})
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: BRAND_COLORS.navy, color: 'white' }}>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  userSelect: 'none',
                }}
                onClick={() => toggleSort('email')}
              >
                Student Email {getSortArrow('email')}
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  userSelect: 'none',
                }}
                onClick={() => toggleSort('score')}
              >
                Score {getSortArrow('score')}
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  userSelect: 'none',
                }}
                onClick={() => toggleSort('percentage')}
              >
                Percentage {getSortArrow('percentage')}
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  userSelect: 'none',
                }}
                onClick={() => toggleSort('status')}
              >
                Status {getSortArrow('status')}
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  userSelect: 'none',
                }}
                onClick={() => toggleSort('date')}
              >
                Completed At {getSortArrow('date')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((result, index) => {
              const passed = result.percentage && result.percentage >= passingScore;
              const rowBg = index % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light;

              return (
                <tr
                  key={result.id}
                  style={{
                    backgroundColor: rowBg,
                    borderBottom: `1px solid ${BRAND_COLORS.border}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = rowBg;
                  }}
                >
                  <td
                    style={{
                      padding: '12px',
                      fontSize: '13px',
                      color: BRAND_COLORS.navy,
                      fontWeight: '500',
                    }}
                  >
                    {result.student.email}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: result.score !== null ? BRAND_COLORS.navy : BRAND_COLORS.gray,
                    }}
                  >
                    {result.score !== null ? result.score : '-'}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: result.percentage !== null ? (passed ? BRAND_COLORS.green : BRAND_COLORS.red) : BRAND_COLORS.gray,
                    }}
                  >
                    {result.percentage !== null ? `${result.percentage}%` : '-'}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '13px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: result.status === 'completed' ? '#D1FAE5' : '#FEE2E2',
                        color: result.status === 'completed' ? '#065F46' : '#991B1B',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {result.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontSize: '13px',
                      color: BRAND_COLORS.gray,
                    }}
                  >
                    {result.status === 'completed' && result.attempted_at ? new Date(result.attempted_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div style={{ marginTop: '15px', fontSize: '13px', color: BRAND_COLORS.gray }}>
        Showing {sorted.length} of {results.length} results
      </div>
    </div>
  );
}
