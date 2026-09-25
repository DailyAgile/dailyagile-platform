'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PerformanceDashboard } from '@/components/instructor/performance-dashboard';

interface StudentInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface StudentStats {
  total_quizzes_assigned: number;
  total_quizzes_completed: number;
  completion_percentage: number;
  average_score: number;
  last_activity: string | null;
}

interface QuizResult {
  quiz_id: string;
  quiz_title: string;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  attempted_at: string | null;
  duration_seconds: number | null;
  status: 'pending' | 'in_progress' | 'completed';
}

interface PerformanceData {
  student: StudentInfo;
  stats: StudentStats;
  quizzes: QuizResult[];
}

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/instructor/students/${studentId}/performance`);

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/teach/login');
            return;
          }
          if (response.status === 404) {
            setError('Student not found');
            return;
          }
          throw new Error('Failed to fetch performance data');
        }

        const result = await response.json();
        if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Error fetching performance:', err);
        setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      fetchPerformance();
    }
  }, [studentId, router]);

  const handleExportData = () => {
    if (!data) return;

    const csvHeaders = ['Quiz Name', 'Score', 'Percentage', 'Status', 'Attempted At'];
    const csvRows = data.quizzes.map((q) => [
      q.quiz_title,
      q.score !== null ? q.score : '-',
      q.percentage !== null ? q.percentage + '%' : '-',
      q.status === 'completed' ? (q.percentage !== null && q.percentage >= 60 ? 'Passed' : 'Failed') : 'Pending',
      q.attempted_at ? new Date(q.attempted_at).toLocaleString() : '-',
    ]);

    const csvContent = [csvHeaders, ...csvRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.student.email}_performance.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-teal-500"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/teach/dashboard"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-lg bg-red-50 border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-900">Error Loading Performance</h2>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/teach/dashboard"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-6">
            <h2 className="text-lg font-semibold text-yellow-900">Student Not Found</h2>
            <p className="text-yellow-700 mt-2">The student you're looking for doesn't exist</p>
          </div>
        </div>
      </div>
    );
  }

  const studentName = `${data.student.first_name || ''} ${data.student.last_name || ''}`.trim() || data.student.email;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/teach/dashboard" className="hover:text-gray-900">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-teal-600 font-medium">Student Performance</span>
          </div>

          {/* Title and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Student Performance</h1>

            <div className="flex gap-2">
              <button
                onClick={handleExportData}
                disabled={data.quizzes.length === 0}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                📥 Export Data
              </button>

              <Link
                href="/teach/dashboard"
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900 font-medium hover:bg-gray-300 transition-colors"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PerformanceDashboard
          studentName={studentName}
          studentEmail={data.student.email}
          stats={data.stats}
          quizzes={data.quizzes}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
