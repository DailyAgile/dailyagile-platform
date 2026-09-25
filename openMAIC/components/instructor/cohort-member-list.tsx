'use client';

/**
 * Cohort Member List Component
 * Display and manage members in a cohort
 */

import { useState, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('CohortMemberList');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface Student {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface CohortMember {
  student_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  added_at: string;
}

interface CohortMemberListProps {
  cohortId: string;
  members: CohortMember[];
  availableStudents: Student[];
  isLoading?: boolean;
  onMemberAdded?: (member: CohortMember) => void;
  onMemberRemoved?: (studentId: string) => void;
}

export function CohortMemberList({
  cohortId,
  members,
  availableStudents,
  isLoading = false,
  onMemberAdded,
  onMemberRemoved,
}: CohortMemberListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter out already-added students
  const studentsToAdd = availableStudents.filter(
    (student) => !members.some((m) => m.student_id === student.id),
  );

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudentId) {
      setError('Please select a student');
      return;
    }

    try {
      setAdding(true);
      setError(null);

      const response = await fetch(
        `/api/instructor/cohorts/${cohortId}/add-student`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: selectedStudentId }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to add student');
      }

      const data = await response.json();
      const student = availableStudents.find((s) => s.id === selectedStudentId);

      const newMember: CohortMember = {
        student_id: selectedStudentId,
        email: student?.email || '',
        first_name: student?.first_name,
        last_name: student?.last_name,
        added_at: new Date().toISOString(),
      };

      setSuccess(`${student?.email} added successfully!`);
      setSelectedStudentId('');
      setShowAddForm(false);
      onMemberAdded?.(newMember);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      log.error('Failed to add student:', err);
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, email: string) => {
    if (!confirm(`Remove ${email} from this cohort?`)) {
      return;
    }

    try {
      setRemoving(studentId);
      setError(null);

      const response = await fetch(
        `/api/instructor/cohorts/${cohortId}/remove-student?student_id=${studentId}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to remove student');
      }

      setSuccess(`${email} removed successfully!`);
      onMemberRemoved?.(studentId);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      log.error('Failed to remove student:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove student');
    } finally {
      setRemoving(null);
    }
  };

  const getDisplayName = (member: CohortMember) => {
    if (member.first_name || member.last_name) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim();
    }
    return member.email;
  };

  return (
    <div>
      {/* Messages */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            border: `1px solid ${BRAND_COLORS.border}`,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: '#DBEAFE',
            color: '#1E40AF',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            border: `1px solid ${BRAND_COLORS.border}`,
            fontSize: '0.875rem',
          }}
        >
          ✓ {success}
        </div>
      )}

      {/* Add Member Section */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          padding: '1.5rem',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          border: `1px solid ${BRAND_COLORS.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: 0,
            }}
          >
            Add Member to Cohort
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={studentsToAdd.length === 0}
            style={{
              backgroundColor: showAddForm ? BRAND_COLORS.gray : BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: studentsToAdd.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              opacity: studentsToAdd.length === 0 ? 0.6 : 1,
            }}
          >
            {showAddForm ? 'Cancel' : '+ Add Member'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddStudent} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  color: BRAND_COLORS.navy,
                }}
              >
                <option value="">Select a student...</option>
                {studentsToAdd.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name || student.last_name
                      ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                      : student.email}
                    {' '}({student.email})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={adding || !selectedStudentId}
                style={{
                  backgroundColor:
                    adding || !selectedStudentId ? BRAND_COLORS.gray : BRAND_COLORS.orange,
                  color: BRAND_COLORS.white,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: adding || !selectedStudentId ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: adding || !selectedStudentId ? 0.6 : 1,
                }}
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {studentsToAdd.length === 0 && !showAddForm && (
          <p
            style={{
              fontSize: '0.875rem',
              color: BRAND_COLORS.gray,
              marginTop: '0.5rem',
              marginBottom: 0,
            }}
          >
            All available students are already members of this cohort.
          </p>
        )}
      </div>

      {/* Members List */}
      <div>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            marginBottom: '1rem',
            margin: '0 0 1rem 0',
          }}
        >
          Cohort Members ({members.length})
        </h3>

        {isLoading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: BRAND_COLORS.gray,
            }}
          >
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div
            style={{
              backgroundColor: BRAND_COLORS.light,
              padding: '2rem',
              borderRadius: '0.5rem',
              textAlign: 'center',
              color: BRAND_COLORS.gray,
              border: `1px solid ${BRAND_COLORS.border}`,
            }}
          >
            <p>No members yet. Add students to this cohort.</p>
          </div>
        ) : (
          <div
            style={{
              border: `1px solid ${BRAND_COLORS.border}`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: BRAND_COLORS.light,
                    borderBottom: `2px solid ${BRAND_COLORS.border}`,
                  }}
                >
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                    }}
                  >
                    Added
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '0.75rem',
                      fontWeight: '600',
                      color: BRAND_COLORS.navy,
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => (
                  <tr
                    key={member.student_id}
                    style={{
                      borderBottom: `1px solid ${BRAND_COLORS.border}`,
                      backgroundColor: idx % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light,
                    }}
                  >
                    <td style={{ padding: '0.75rem', color: BRAND_COLORS.navy }}>
                      {getDisplayName(member)}
                    </td>
                    <td style={{ padding: '0.75rem', color: BRAND_COLORS.navy }}>
                      {member.email}
                    </td>
                    <td style={{ padding: '0.75rem', color: BRAND_COLORS.gray }}>
                      {new Date(member.added_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveStudent(member.student_id, member.email)}
                        disabled={removing === member.student_id}
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.25rem',
                          border: 'none',
                          cursor: removing === member.student_id ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem',
                          opacity: removing === member.student_id ? 0.6 : 1,
                        }}
                      >
                        {removing === member.student_id ? '...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
