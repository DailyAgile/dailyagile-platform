'use client';

import { useEffect, useState } from 'react';

interface Quiz {
  id: string;
  title: string;
  quiz_code: string;
}

interface Student {
  id: string;
  email: string;
  name?: string;
}

interface AssignQuizModalProps {
  studentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * AssignQuizModal Component
 * Modal for assigning quizzes to students
 */
export function AssignQuizModal({ studentId, onClose, onSuccess }: AssignQuizModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    studentId ? new Set([studentId]) : new Set()
  );
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState('');
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch students and quizzes on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('instructor_token');

        if (!token) {
          setError('Not authenticated');
          return;
        }

        // Fetch students
        const studentsResponse = await fetch('/api/instructor/students?limit=1000', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (studentsResponse.ok) {
          const data = await studentsResponse.json();
          setStudents(data.data?.students || []);
        }

        // Fetch quizzes
        const quizzesResponse = await fetch('/api/instructor/quiz/list-with-auth', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (quizzesResponse.ok) {
          const data = await quizzesResponse.json();
          setQuizzes(data.data?.quizzes || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectAllStudents = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const handleToggleQuiz = (id: string) => {
    const newSelected = new Set(selectedQuizzes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuizzes(newSelected);
  };

  const handleSubmit = async () => {
    try {
      if (selectedStudents.size === 0) {
        setError('Select at least one student');
        return;
      }

      if (selectedQuizzes.size === 0) {
        setError('Select at least one quiz');
        return;
      }

      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('instructor_token');

      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Assign each quiz to selected students
      const studentIds = Array.from(selectedStudents);
      let successCount = 0;

      for (const quizId of selectedQuizzes) {
        const response = await fetch(
          `/api/instructor/quiz/${quizId}/assign-students`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              student_ids: studentIds,
              deadline: deadline || null,
              notify_students: notifyStudents,
            }),
          }
        );

        if (response.ok) {
          successCount++;
        }
      }

      if (successCount === selectedQuizzes.size) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(`Failed to assign all quizzes (${successCount}/${selectedQuizzes.size} succeeded)`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error submitting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: '0',
            backgroundColor: '#ffffff',
            zIndex: 10,
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1E3A5F',
              margin: '0',
            }}
          >
            Assign Quiz to Students
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Success Message */}
          {success && (
            <div
              style={{
                backgroundColor: '#d1fae5',
                border: '1px solid #6ee7b7',
                color: '#065f46',
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              ✓ Assignment successful! Redirecting...
            </div>
          )}

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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: '#64748B' }}>Loading...</p>
            </div>
          ) : (
            <>
              {/* Students Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1E3A5F',
                    marginBottom: '12px',
                  }}
                >
                  Select Students
                </h3>

                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {/* Select All Checkbox */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      backgroundColor: '#f8fafc',
                      fontWeight: '500',
                      fontSize: '14px',
                      color: '#1e293b',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === students.length && students.length > 0}
                      onChange={handleSelectAllStudents}
                      style={{
                        marginRight: '10px',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                      }}
                    />
                    Select All ({selectedStudents.size}/{students.length})
                  </label>

                  {/* Individual Students */}
                  {students.map(student => (
                    <label
                      key={student.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        backgroundColor: selectedStudents.has(student.id)
                          ? '#eff6ff'
                          : '#ffffff',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => handleToggleStudent(student.id)}
                        style={{
                          marginRight: '10px',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', color: '#1e293b' }}>
                          {student.name || 'N/A'}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748B',
                          }}
                        >
                          {student.email}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quizzes Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1E3A5F',
                    marginBottom: '12px',
                  }}
                >
                  Select Quiz(zes)
                </h3>

                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {quizzes.length === 0 ? (
                    <div
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontSize: '14px',
                      }}
                    >
                      No quizzes available
                    </div>
                  ) : (
                    quizzes.map(quiz => (
                      <label
                        key={quiz.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          backgroundColor: selectedQuizzes.has(quiz.id)
                            ? '#eff6ff'
                            : '#ffffff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuizzes.has(quiz.id)}
                          onChange={() => handleToggleQuiz(quiz.id)}
                          style={{
                            marginRight: '10px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', color: '#1e293b' }}>
                            {quiz.title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#64748B',
                            }}
                          >
                            Code: {quiz.quiz_code}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Deadline Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1E3A5F',
                    marginBottom: '12px',
                  }}
                >
                  Deadline (Optional)
                </h3>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Notify Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1e293b',
                }}
              >
                <input
                  type="checkbox"
                  checked={notifyStudents}
                  onChange={e => setNotifyStudents(e.target.checked)}
                  style={{
                    marginRight: '10px',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                  }}
                />
                Send email notification to students
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            position: 'sticky',
            bottom: '0',
            backgroundColor: '#ffffff',
            zIndex: 10,
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#0891B2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting || loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: submitting || loading ? 0.6 : 1,
            }}
          >
            {submitting ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
