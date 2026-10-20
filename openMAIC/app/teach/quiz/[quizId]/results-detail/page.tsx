'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ResultsTable from '@/components/instructor/results-table';

interface QuizInfo {
  id: string;
  title: string;
  total_questions: number;
  total_points: number;
}

interface QuizResult {
  id: string;
  assignment_id: string;
  student: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  status: 'pending' | 'in_progress' | 'completed';
  score: number | null;
  percentage: number | null;
  attempted_at: string | null;
  duration_seconds: number | null;
}

interface QuizStats {
  total_assignments: number;
  completed_count: number;
  average_score: number;
  pass_rate: number;
}

export default function ResultsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/instructor/quiz/${quizId}/results`);

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/instructors');
            return;
          }
          throw new Error('Failed to fetch results');
        }

        const data = await response.json();

        if (data.data) {
          setQuiz(data.data.quiz);
          setResults(data.data.results || []);
          setStats(data.data.stats);
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) {
      fetchResults();
    }
  }, [quizId, router]);

  const handleExportCSV = () => {
    if (!quiz || results.length === 0) return;

    // Prepare CSV data
    const headers = ['Student Email', 'Score', 'Percentage', 'Status', 'Completed At'];
    const rows = results.map((r) => [
      r.student.email,
      r.score !== null ? r.score : '-',
      r.percentage !== null ? r.percentage + '%' : '-',
      r.status === 'completed' ? (r.percentage !== null && r.percentage >= 60 ? 'Passed' : 'Failed') : 'Pending',
      r.attempted_at ? new Date(r.attempted_at).toLocaleString() : '-',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${quiz.title.replace(/\s+/g, '_')}_results.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-teal-500"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-lg bg-red-50 border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-900">Error Loading Results</h2>
            <p className="text-red-700 mt-2">{error}</p>
            <Link href="/teach/quiz/management" className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Back to Quiz Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-6">
            <h2 className="text-lg font-semibold text-yellow-900">Quiz Not Found</h2>
            <p className="text-yellow-700 mt-2">The quiz you're looking for doesn't exist</p>
            <Link href="/teach/quiz/management" className="mt-4 inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              Back to Quiz Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/teach/quiz/management" className="hover:text-gray-900">
              Quiz Management
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{quiz.title}</span>
            <span>/</span>
            <span className="text-teal-600 font-medium">Results</span>
          </div>

          {/* Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600 mt-1">
                {quiz.total_questions} questions • {quiz.total_points} points
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={results.length === 0}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
            <div className="rounded-lg bg-white border border-gray-200 p-6">
              <p className="text-sm text-gray-600 font-medium">Total Assignments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_assignments}</p>
            </div>

            <div className="rounded-lg bg-white border border-gray-200 p-6">
              <p className="text-sm text-gray-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed_count}</p>
              <p className="text-sm text-gray-600 mt-1">
                {stats.total_assignments > 0
                  ? `${Math.round((stats.completed_count / stats.total_assignments) * 100)}%`
                  : '0%'}
              </p>
            </div>

            <div className="rounded-lg bg-white border border-gray-200 p-6">
              <p className="text-sm text-gray-600 font-medium">Average Score</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.average_score}
                <span className="text-lg">%</span>
              </p>
            </div>

            <div className="rounded-lg bg-white border border-gray-200 p-6">
              <p className="text-sm text-gray-600 font-medium">Pass Rate</p>
              <p className="text-3xl font-bold text-teal-600 mt-2">
                {stats.pass_rate}
                <span className="text-lg">%</span>
              </p>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Student Results</h2>
          <ResultsTable results={results} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
