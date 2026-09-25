'use client';

/**
 * Quiz Results Page
 * Displays all student results for a specific quiz
 * Allows exporting to CSV and sending reminders to incomplete students
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';
import ResultsTable from '@/components/instructor/results-table';
import QuizReminderModal from '@/components/instructor/quiz-reminder-modal';

const log = createLogger('QuizResultsPage');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  white: '#FFFFFF',
  border: '#E2E8F0',
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

interface QuizStats {
  total_attempts: number;
  completed_count: number;
  average_score: number;
  pass_rate: number;
}

export default function QuizResultsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<{ title: string; total_questions: number; total_points: number } | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reminderModal, setReminderModal] = useState({ open: false });
  const [successMessage, setSuccessMessage] = useState<{ visible: boolean; text: string }>({ visible: false, text: '' });

  useEffect(() => {
    loadResults();
  }, [quizId]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage.visible) {
      const timer = setTimeout(() => {
        setSuccessMessage({ visible: false, text: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage.visible]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/instructor/quiz/${quizId}/results`);

      if (!response.ok) {
        throw new Error('Failed to load results');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load results');
      }

      setQuiz(data.data.quiz);
      setResults(data.data.results || []);
      setStats(data.data.stats);
    } catch (err) {
      log.error('Failed to load results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);

      const response = await fetch(`/api/instructor/quiz/${quizId}/export-results`);

      if (!response.ok) {
        throw new Error('Failed to export results');
      }

      // Get filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `quiz-results.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage({ visible: true, text: `Exported ${results.length} results` });
    } catch (err) {
      log.error('Failed to export results:', err);
      setError(err instanceof Error ? err.message : 'Failed to export results');
    } finally {
      setExporting(false);
    }
  };

  const handleSendReminders = async (customMessage?: string) => {
    try {
      setReminderModal({ open: false });

      const response = await fetch(`/api/instructor/quiz/${quizId}/send-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: customMessage,
          include_link: true,
          include_deadline: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminders');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to send reminders');
      }

      setSuccessMessage({
        visible: true,
        text: `Reminders sent to ${data.data.sent_count} students`,
      });

      log.info(`Sent reminders to ${data.data.sent_count} students`);
    } catch (err) {
      log.error('Failed to send reminders:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reminders');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: BRAND_COLORS.gray }}>Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div
          style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '12px',
            borderRadius: '4px',
          }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

  const incompleteCount = results.filter((r) => r.status !== 'completed').length;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Success Message */}
      {successMessage.visible && (
        <div
          style={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          ✓ {successMessage.text}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: BRAND_COLORS.navy, fontSize: '28px', margin: '0 0 10px 0', fontFamily: 'Cambria, serif' }}>
          {quiz?.title || 'Quiz Results'}
        </h1>
        <p style={{ color: BRAND_COLORS.gray, margin: '0', fontSize: '14px' }}>
          {results.length} attempts • {stats?.completed_count || 0} completed
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '30px',
          }}
        >
          <StatCard label="Total Attempts" value={stats.total_attempts} color={BRAND_COLORS.teal} />
          <StatCard label="Completed" value={stats.completed_count} color={BRAND_COLORS.teal} />
          <StatCard label="Average Score" value={`${stats.average_score}%`} color={BRAND_COLORS.navy} />
          <StatCard label="Pass Rate" value={`${stats.pass_rate}%`} color={BRAND_COLORS.orange} />
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setReminderModal({ open: true })}
          disabled={incompleteCount === 0}
          style={{
            backgroundColor: incompleteCount === 0 ? BRAND_COLORS.gray : BRAND_COLORS.orange,
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: incompleteCount === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: incompleteCount === 0 ? 0.6 : 1,
          }}
        >
          📧 Send Reminders ({incompleteCount})
        </button>

        <button
          onClick={handleExportCSV}
          disabled={results.length === 0 || exporting}
          style={{
            backgroundColor: results.length === 0 ? BRAND_COLORS.gray : BRAND_COLORS.teal,
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: results.length === 0 || exporting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: results.length === 0 || exporting ? 0.6 : 1,
          }}
        >
          {exporting ? '⏳ Exporting...' : '⬇️ Export CSV'}
        </button>

        <button
          onClick={() => router.back()}
          style={{
            backgroundColor: 'transparent',
            color: BRAND_COLORS.teal,
            padding: '10px 20px',
            border: `2px solid ${BRAND_COLORS.teal}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          ← Back
        </button>
      </div>

      {/* Results Table */}
      <ResultsTable results={results} quiz={quiz} />

      {/* Reminder Modal */}
      <QuizReminderModal
        open={reminderModal.open}
        incompleteCount={incompleteCount}
        quizTitle={quiz?.title || 'Quiz'}
        onClose={() => setReminderModal({ open: false })}
        onSend={handleSendReminders}
      />
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        backgroundColor: BRAND_COLORS.light,
        padding: '15px',
        borderRadius: '8px',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '12px', color: BRAND_COLORS.gray, marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}
