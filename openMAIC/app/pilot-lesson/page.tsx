'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface AccessData {
  email: string;
  daysRemaining: number;
  expiresAt: string;
  isValid: boolean;
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '24px',
    color: '#0891B2',
  },
  header: {
    background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
    color: 'white',
    padding: '30px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    margin: '0 0 5px 0',
    fontSize: '28px',
  },
  headerSubtitle: {
    margin: '0',
    fontSize: '14px',
    opacity: 0.9,
  },
  accessWindow: {
    textAlign: 'center' as const,
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '15px 30px',
    borderRadius: '8px',
  },
  daysRemaining: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0',
  },
  daysLabel: {
    fontSize: '12px',
    opacity: 0.9,
    margin: '5px 0 0 0',
  },
  expiresLabel: {
    fontSize: '11px',
    opacity: 0.8,
    margin: '3px 0 0 0',
  },
  lessonContainer: {
    display: 'flex',
    maxWidth: '1400px',
    margin: '0 auto',
    gap: '20px',
    padding: '20px',
  },
  sidebar: {
    width: '250px',
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    height: 'fit-content',
  },
  sidebarTitle: {
    margin: '0 0 15px 0',
    color: '#1E3A5F',
    fontSize: '16px',
  },
  lessonList: {
    marginBottom: '20px',
  },
  lessonItem: {
    padding: '10px',
    marginBottom: '8px',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#475569',
    background: '#f0f7fa',
  },
  lessonItemActive: {
    background: '#d1fae5',
    color: '#065f46',
    fontWeight: '600',
  },
  progressSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  progressLabel: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#1E3A5F',
    fontWeight: '600',
  },
  progressBar: {
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '45%',
    background: '#0891B2',
  },
  lessonContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  videoPlaceholder: {
    background: 'white',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
  },
  videoNote: {
    fontSize: '12px',
    color: '#64748B',
    marginTop: '10px',
  },
  demoInfo: {
    marginTop: '20px',
  },
  detailsSummary: {
    cursor: 'pointer',
    color: '#0891B2',
    fontSize: '13px',
    fontWeight: '600',
  },
  demoData: {
    background: '#f0f7fa',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '10px',
    fontSize: '12px',
  },
  quizSection: {
    background: 'white',
    borderRadius: '8px',
    padding: '30px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  quizButton: {
    background: '#0891B2',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '15px',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#64748B',
    fontSize: '14px',
  },
  errorCard: {
    background: 'white',
    maxWidth: '500px',
    margin: '60px auto',
    padding: '40px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  errorTitle: {
    color: '#dc2626',
    margin: '0 0 15px 0',
  },
  errorMessage: {
    color: '#475569',
    fontSize: '16px',
    marginBottom: '30px',
  },
  errorActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  button: {
    background: '#0891B2',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

function PilotLessonContent() {
  const searchParams = useSearchParams();
  const accessToken = searchParams.get('access_token');
  const [accessData, setAccessData] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) {
      setError('❌ No access token provided. Please sign up first.');
      setLoading(false);
      return;
    }

    // Decode token (base64: email:timestamp)
    try {
      const decoded = Buffer.from(accessToken, 'base64').toString('utf-8');
      const [email, timestamp] = decoded.split(':');

      if (!email || !timestamp) {
        setError('❌ Invalid access token format');
        setLoading(false);
        return;
      }

      const accessGrantedAt = new Date(parseInt(timestamp));
      const accessExpiresAt = new Date(accessGrantedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const isValid = accessExpiresAt > now;
      const daysRemaining = Math.ceil((accessExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      setAccessData({
        email,
        daysRemaining: Math.max(0, daysRemaining),
        expiresAt: accessExpiresAt.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        isValid,
      });

      if (!isValid) {
        setError(`❌ Your pilot access expired on ${accessExpiresAt.toLocaleDateString()}`);
      }
    } catch (err) {
      console.error('Token decode error:', err);
      setError('❌ Access token expired or invalid. Please sign up again.');
    }

    setLoading(false);
  }, [accessToken]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>⏳ Loading...</div>
      </div>
    );
  }

  if (error || !accessData?.isValid) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h1 style={styles.errorTitle}>❌ Access Denied</h1>
          <p style={styles.errorMessage}>{error || 'Your access is no longer valid.'}</p>
          <div style={styles.errorActions}>
            <button
              onClick={() => {
                // Email support link
                window.location.href = 'mailto:support@dailyagile.com?subject=Pilot%20Access%20Help';
              }}
              style={styles.button}
            >
              📧 Request New Access
            </button>
            <a href="/pilot-signup" style={{ ...styles.button, textDecoration: 'none' }}>
              🔄 Sign Up Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Valid access - show lesson
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>🎓 DailyAgile Pilot Lesson</h1>
          <p style={styles.headerSubtitle}>{accessData.email}</p>
        </div>
        <div style={styles.accessWindow}>
          <div style={styles.daysRemaining}>{accessData.daysRemaining}</div>
          <div style={styles.daysLabel}>Days Left</div>
          <div style={styles.expiresLabel}>Expires {accessData.expiresAt}</div>
        </div>
      </div>

      <div style={styles.lessonContainer}>
        {/* Lesson Sidebar */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>📚 Course Content</h3>
          <div style={styles.lessonList}>
            <div style={styles.lessonItem}>
              <span>✓</span> Introduction (5 min)
            </div>
            <div style={styles.lessonItem}>
              <span>✓</span> Core Concepts (5 min)
            </div>
            <div style={{ ...styles.lessonItem, ...styles.lessonItemActive }}>
              <span>▶</span> Main Lesson (5 min) - PLAYING NOW
            </div>
          </div>
          <div style={styles.progressSection}>
            <p style={styles.progressLabel}>Progress: 45%</p>
            <div style={styles.progressBar}>
              <div style={styles.progressFill}></div>
            </div>
          </div>
        </div>

        {/* Main Lesson Content */}
        <div style={styles.lessonContent}>
          <div style={styles.videoPlaceholder}>
            <h2>🎬 Video Lesson</h2>
            <p>Your self-paced lesson will load here</p>
            <p style={styles.videoNote}>
              (In production, this will be your OpenMAIC interactive lesson)
            </p>

            {/* Demo: Show lesson frame info */}
            <div style={styles.demoInfo}>
              <details>
                <summary style={styles.detailsSummary}>📊 Demo Data (Click to expand)</summary>
                <div style={styles.demoData}>
                  <p><strong>Email:</strong> {accessData.email}</p>
                  <p><strong>Access Granted:</strong> Today</p>
                  <p><strong>Access Expires:</strong> {accessData.expiresAt}</p>
                  <p><strong>Days Remaining:</strong> {accessData.daysRemaining}</p>
                  <p><strong>Status:</strong> ✅ Active & Valid</p>
                  <p><strong>Lesson Completion:</strong> 45%</p>
                </div>
              </details>
            </div>
          </div>

          {/* Quiz Section */}
          <div style={styles.quizSection}>
            <h3>📝 Next: Take the Quiz</h3>
            <button
              onClick={() => alert('Quiz will open in a modal (Phase 2 implementation)')}
              style={styles.quizButton}
            >
              Take Final Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p>Need help? Email: <a href="mailto:support@dailyagile.com">support@dailyagile.com</a></p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={styles.container}>
      <div style={styles.loadingSpinner}>⏳ Loading...</div>
    </div>
  );
}

export default function PilotLessonPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PilotLessonContent />
    </Suspense>
  );
}
