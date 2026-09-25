'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentList } from '@/components/instructor/student-list';
import { AssignQuizModal } from '@/components/instructor/assign-quiz-modal';

/**
 * Instructor Student Management Page
 * Displays list of students and allows assignment of quizzes
 */
export default function StudentManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Check if instructor is authenticated by trying to fetch student list
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('instructor_token');
        if (!token) {
          router.push('/teach-login');
          return;
        }

        // Make a test API call to verify authentication
        const response = await fetch('/api/instructor/students?limit=1', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          router.push('/teach-login');
          return;
        }

        setAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/teach-login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleOpenAssignModal = (studentId?: string) => {
    if (studentId) {
      setSelectedStudentId(studentId);
    }
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedStudentId(null);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #0891B2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }}
          />
          <p style={{ color: '#64748B', fontSize: '16px' }}>Loading...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid #e2e8f0',
          padding: '20px',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1E3A5F',
                margin: '0 0 10px 0',
              }}
            >
              Student List
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#64748B',
                margin: '0',
              }}
            >
              Manage students and assign quizzes
            </p>
          </div>

          <button
            onClick={() => handleOpenAssignModal()}
            style={{
              backgroundColor: '#0891B2',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
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
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <StudentList onAssignQuiz={handleOpenAssignModal} />
      </main>

      {/* Assign Quiz Modal */}
      {showAssignModal && (
        <AssignQuizModal
          studentId={selectedStudentId || undefined}
          onClose={handleCloseAssignModal}
          onSuccess={() => {
            handleCloseAssignModal();
            // Refresh student list
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
