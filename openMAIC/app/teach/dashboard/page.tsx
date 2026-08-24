'use client';

/**
 * Instructor Dashboard
 * Manage quizzes, create new quizzes, view student results
 *
 * Features:
 * - Filter student results by email or quiz
 * - View detailed quiz attempt results
 * - Export results to CSV
 * - Comprehensive analytics with 5 professional reports
 * - Responsive design with accessibility support
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

const log = createLogger('InstructorDashboard');

// ============================================================================
// CONSTANTS
// ============================================================================
const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  teal_dark: '#0a7e9a',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

const PASS_THRESHOLD = 70;
const WARN_THRESHOLD = 50;

type Tab = 'quizzes' | 'create-csv' | 'create-ai' | 'analytics' | 'results';

interface Quiz {
  id: string;
  quiz_code: string;
  title: string;
  total_questions: number;
  total_points: number;
  created_at: string;
  student_count?: number;
  average_score?: number;
}

export default function InstructorDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('quizzes');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student Results Report state
  const [resultsFilterMode, setResultsFilterMode] = useState<'by-email' | 'by-quiz'>('by-email');
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<{ open: boolean; quizCode?: string; quizTitle?: string }>({ open: false });

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  // AI Generation state
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestions, setAiQuestions] = useState('10');
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Sorting and pagination
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'score' | 'date' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load quizzes on mount + check localStorage for tab preference
  useEffect(() => {
    loadQuizzes();

    // Check if we should switch to a specific tab (from New Quiz page)
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
      setActiveTab(savedTab as Tab);
      localStorage.removeItem('activeTab'); // Clear after reading
    }
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/instructor/quiz/list');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load quizzes');
      }

      setQuizzes(result.data?.quizzes || []);
      log.info(`Loaded ${result.data?.quizzes?.length || 0} quizzes`);
    } catch (err) {
      log.error('Failed to load quizzes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    // Two-step delete: soft (archive) or hard (permanent with 2FA)
    const userChoice = confirm(
      `Choose delete type for "${quizTitle}":\n\n` +
      `[OK] Archive (soft delete - can restore)\n` +
      `[Cancel] Permanent delete (requires 2FA code)`
    );

    try {
      setLoading(true);
      setError(null);

      if (userChoice) {
        // SOFT DELETE - archive the quiz
        const response = await fetch(`/api/instructor/quiz/${quizId}/delete?deleteType=soft`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to delete quiz');
        }

        log.info('Quiz archived successfully');
        alert(`✅ Quiz archived successfully! You can restore it later if needed.`);
        loadQuizzes();
      } else {
        // HARD DELETE - two-step process
        // Step 1: Request 2FA code
        const confirmName = prompt(
          `⚠️ PERMANENT DELETE\n\nType the exact quiz name to confirm:\n"${quizTitle}"`
        );

        if (!confirmName) {
          setError('Delete cancelled');
          return;
        }

        if (confirmName !== quizTitle) {
          setError(`Quiz name mismatch. Expected "${quizTitle}" but got "${confirmName}"`);
          return;
        }

        // Request 2FA code
        log.info(`Requesting 2FA code for hard delete: ${quizTitle}`);
        const codeResponse = await fetch(`/api/instructor/quiz/${quizId}/request-delete-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteType: 'hard' }),
        });

        if (!codeResponse.ok) {
          throw new Error('Failed to request deletion confirmation code');
        }

        const codeResult = await codeResponse.json();
        if (!codeResult.success) {
          throw new Error(codeResult.error?.message || 'Failed to request code');
        }

        // Step 2: Get 2FA code from user
        const twoFACode = prompt(
          `✅ 2FA code sent to your email\n\n` +
          `Enter the 6-digit code:\n` +
          `(Code expires in ${codeResult.data?.expiresIn || 600} seconds)`
        );

        if (!twoFACode) {
          setError('Delete cancelled - no code provided');
          return;
        }

        // Step 3: Execute hard delete with 2FA code
        const deleteResponse = await fetch(`/api/instructor/quiz/${quizId}/delete?deleteType=hard`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmQuizName: quizTitle,
            twoFACode,
          }),
        });

        const deleteResult = await deleteResponse.json();

        if (!deleteResponse.ok) {
          throw new Error(deleteResult.error?.message || 'Failed to delete quiz');
        }

        log.info('Quiz permanently deleted');
        alert(
          `🔒 Quiz permanently deleted!\n\n` +
          `${deleteResult.data?.message || ''}\n\n` +
          `Student records preserved: ${deleteResult.data?.snapshotsPreserved || 0} submissions`
        );
        loadQuizzes();
      }
    } catch (err) {
      log.error('Failed to delete quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleShareQuiz = (quizCode: string, quizTitle: string) => {
    setShareModal({ open: true, quizCode, quizTitle });
  };

  // ========================================================================
  // SORTING & PAGINATION HELPERS
  // ========================================================================

  /**
   * Sort results based on current sort config
   */
  const getSortedResults = (results: any[]): any[] => {
    if (!sortConfig.key) return results;

    return [...results].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortConfig.key === 'name') {
        aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
        bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else if (sortConfig.key === 'score') {
        aVal = a.percentage || 0;
        bVal = b.percentage || 0;
      } else if (sortConfig.key === 'date') {
        aVal = new Date(a.taken_at).getTime();
        bVal = new Date(b.taken_at).getTime();
      }

      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  };

  /**
   * Handle column header sort click
   */
  const handleSort = (key: 'name' | 'score' | 'date') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page when sorting
  };

  /**
   * Get paginated results
   */
  const sortedResults = getSortedResults(studentResults);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Search student results by email
   */
  const searchByEmail = async () => {
    try {
      if (!studentEmail.trim()) {
        setResultsError('Please enter a student email address');
        return;
      }

      if (!isValidEmail(studentEmail)) {
        setResultsError('Please enter a valid email address');
        return;
      }

      setResultsLoading(true);
      setResultsError(null);
      setSuccessMessage(null);

      log.info(`Searching for results: email=${studentEmail}`);
      const response = await fetch(`/api/instructor/quiz/student-results?email=${encodeURIComponent(studentEmail)}`);
      const result = await response.json();

      log.info('API Response:', result);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch results');
      }

      const results = result.data?.results || result.results || [];
      log.info(`Found ${results.length} results`);
      setStudentResults(results);
      setCurrentPage(1);
      setSortConfig({ key: null, direction: 'asc' });

      // Show success message
      if (results.length > 0) {
        setSuccessMessage(`Found ${results.length} result${results.length !== 1 ? 's' : ''} for ${studentEmail}`);
      }
    } catch (err) {
      log.error('Failed to search results:', err);
      setResultsError(err instanceof Error ? err.message : 'Failed to search results');
      setStudentResults([]);
    } finally {
      setResultsLoading(false);
    }
  };

  /**
   * Search quiz results
   */
  const searchByQuiz = async () => {
    try {
      if (!selectedQuizId) {
        setResultsError('Please select a quiz');
        return;
      }

      setResultsLoading(true);
      setResultsError(null);
      setSuccessMessage(null);

      log.info(`Searching for quiz results: quiz_id=${selectedQuizId}`);
      const response = await fetch(`/api/instructor/quiz/quiz-results?quiz_id=${encodeURIComponent(selectedQuizId)}`);
      const result = await response.json();

      log.info('API Response:', result);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch results');
      }

      const results = result.data?.results || result.results || [];
      log.info(`Found ${results.length} results`);
      setStudentResults(results);
      setCurrentPage(1);
      setSortConfig({ key: null, direction: 'asc' });

      // Show success message
      const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId);
      if (results.length > 0 && selectedQuiz) {
        setSuccessMessage(
          `Found ${results.length} result${results.length !== 1 ? 's' : ''} for ${selectedQuiz.title}`
        );
      }
    } catch (err) {
      log.error('Failed to search results:', err);
      setResultsError(err instanceof Error ? err.message : 'Failed to search results');
      setStudentResults([]);
    } finally {
      setResultsLoading(false);
    }
  };

  /**
   * Export results to CSV with feedback
   */
  const handleExportCSV = async () => {
    try {
      setResultsLoading(true);
      const response = await fetch('/api/instructor/quiz/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter_mode: resultsFilterMode,
          email: resultsFilterMode === 'by-email' ? studentEmail : undefined,
          quiz_id: resultsFilterMode === 'by-quiz' ? selectedQuizId : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      // Trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'quiz-results.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      log.info('CSV exported successfully');
      setSuccessMessage(`Exported ${studentResults.length} result${studentResults.length !== 1 ? 's' : ''} to CSV`);
    } catch (err) {
      log.error('Failed to export CSV:', err);
      setResultsError('Failed to export results. Please try again.');
    } finally {
      setResultsLoading(false);
    }
  };

  /**
   * Handle CSV file upload
   */
  const handleCsvUpload = async () => {
    try {
      if (!csvFile) {
        setCsvError('Please select a CSV file');
        return;
      }

      setCsvLoading(true);
      setCsvError(null);

      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/instructor/quiz/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to upload CSV');
      }

      log.info('Quiz created from CSV:', result.data);
      alert(`✅ Quiz created successfully!\n\nQuiz Code: ${result.data.quiz_code}\nQuestions: ${result.data.total_questions}`);

      // Reset and reload
      setCsvFile(null);
      loadQuizzes();
      setActiveTab('quizzes');
    } catch (err) {
      log.error('Failed to upload CSV:', err);
      setCsvError(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  /**
   * Handle AI generation
   */
  const handleGenerateWithAI = async () => {
    try {
      if (!aiTopic.trim()) {
        setAiError('Please enter a topic');
        return;
      }

      setAiLoading(true);
      setAiError(null);

      const response = await fetch('/api/instructor/quiz/generate-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          num_questions: parseInt(aiQuestions),
          difficulty: aiDifficulty,
          additional_instructions: aiInstructions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate quiz');
      }

      log.info('Quiz generated:', result.data);
      alert(`✅ Quiz generated successfully!\n\nQuiz Code: ${result.data.quiz_code}\nQuestions: ${result.data.total_questions}`);

      // Reset and reload
      setAiTopic('');
      setAiQuestions('10');
      setAiDifficulty('Medium');
      setAiInstructions('');
      loadQuizzes();
      setActiveTab('quizzes');
    } catch (err) {
      log.error('Failed to generate quiz:', err);
      setAiError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Quiz Management</h1>
          <p style={{ color: BRAND_COLORS.gray }}>Create and manage quizzes for your courses</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ borderBottomColor: BRAND_COLORS.border }} className="border-b">
        <div className="max-w-6xl mx-auto px-4 flex gap-8 overflow-x-auto">
          {[
            { id: 'quizzes', label: '📋 My Quizzes' },
            { id: 'create-csv', label: '📤 Upload CSV' },
            { id: 'create-ai', label: '🤖 Generate with AI' },
            { id: 'analytics', label: '📊 Analytics' },
            { id: 'results', label: '📋 Student Results' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              data-testid={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className={`py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? `border-[${BRAND_COLORS.teal}] text-[${BRAND_COLORS.teal}]`
                  : `border-transparent text-[${BRAND_COLORS.gray}] hover:text-[${BRAND_COLORS.navy}]`
              }`}
              style={
                activeTab === tab.id
                  ? { borderBottomColor: BRAND_COLORS.teal, color: BRAND_COLORS.teal }
                  : { borderBottomColor: 'transparent', color: BRAND_COLORS.gray }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* TAB 1: MY QUIZZES */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-[#1E3A5F]">All Quizzes</h2>
                {quizzes.length > 0 && (
                  <p className="text-sm text-[#64748B] mt-1">
                    Total Quizzes: <span className="font-semibold text-[#1E3A5F]">{quizzes.length}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push('/teach/quiz/new')}
                className="px-4 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a]"
              >
                + New Quiz
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0891B2] mx-auto mb-4"></div>
                <p className="text-[#64748B]">Loading quizzes...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12 bg-[#F0F7FA] rounded-lg border border-[#E2E8F0]">
                <p className="text-[#64748B] mb-4">No quizzes yet</p>
                <p className="text-sm text-[#64748B]">Create your first quiz by uploading a CSV or generating with AI</p>
              </div>
            ) : (
              <>
                {/* Pagination Info */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#F0F7FA] rounded-lg border border-[#E2E8F0]">
                  <p className="text-sm text-[#64748B]">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, quizzes.length)}–{Math.min(currentPage * itemsPerPage, quizzes.length)} of {quizzes.length} quizzes
                  </p>
                </div>

                {/* Quiz Grid */}
                <div className="grid gap-4">
                  {quizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((quiz) => (
                  <div key={quiz.id} className="bg-white border border-[#E2E8F0] rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#1E3A5F]">{quiz.title}</h3>
                        <p className="text-sm text-[#64748B]">Code: {quiz.quiz_code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/teach/quiz/${quiz.id}/edit`)}
                          className="px-3 py-1 text-sm border border-[#0891B2] text-[#0891B2] rounded hover:bg-[#F0F7FA]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleShareQuiz(quiz.quiz_code, quiz.title)}
                          className="px-3 py-1 text-sm border border-[#0891B2] text-[#0891B2] rounded hover:bg-[#F0F7FA]"
                        >
                          Share 🔗
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-[#64748B]">Questions</p>
                        <p className="font-semibold text-[#1E3A5F]">{quiz.total_questions}</p>
                      </div>
                      <div>
                        <p className="text-[#64748B]">Points</p>
                        <p className="font-semibold text-[#1E3A5F]">{quiz.total_points}</p>
                      </div>
                      <div>
                        <p className="text-[#64748B]">Students</p>
                        <p className="font-semibold text-[#1E3A5F]">{quiz.student_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[#64748B]">Avg Score</p>
                        <p className="font-semibold text-[#1E3A5F]">{quiz.average_score?.toFixed(1) || '—'}%</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                {/* Modern Pagination Controls */}
                {Math.ceil(quizzes.length / itemsPerPage) > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 bg-white border border-[#E2E8F0] rounded-lg">
                    {/* Left: Page Info */}
                    <div className="text-sm text-[#64748B]">
                      Page <span className="font-semibold text-[#1E3A5F]">{currentPage}</span> of <span className="font-semibold text-[#1E3A5F]">{Math.ceil(quizzes.length / itemsPerPage)}</span>
                    </div>

                    {/* Center: Navigation Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          borderColor: currentPage === 1 ? BRAND_COLORS.border : BRAND_COLORS.teal,
                          color: currentPage === 1 ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage > 1) {
                            e.currentTarget.style.backgroundColor = BRAND_COLORS.light;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        ← Previous
                      </button>

                      {/* Page Number Buttons */}
                      {Array.from({ length: Math.ceil(quizzes.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter((page) => {
                          const totalPages = Math.ceil(quizzes.length / itemsPerPage);
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                          return false;
                        })
                        .map((page, idx, arr) => (
                          <div key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="px-1 text-[#64748B]">…</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: currentPage === page ? BRAND_COLORS.teal : 'transparent',
                                color: currentPage === page ? BRAND_COLORS.white : BRAND_COLORS.navy,
                                border: currentPage === page ? `1px solid ${BRAND_COLORS.teal}` : `1px solid ${BRAND_COLORS.border}`,
                              }}
                              onMouseEnter={(e) => {
                                if (currentPage !== page) {
                                  e.currentTarget.style.backgroundColor = BRAND_COLORS.light;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentPage !== page) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {page}
                            </button>
                          </div>
                        ))}

                      <button
                        onClick={() => setCurrentPage(Math.min(Math.ceil(quizzes.length / itemsPerPage), currentPage + 1))}
                        disabled={currentPage === Math.ceil(quizzes.length / itemsPerPage)}
                        className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          borderColor: currentPage === Math.ceil(quizzes.length / itemsPerPage) ? BRAND_COLORS.border : BRAND_COLORS.teal,
                          color: currentPage === Math.ceil(quizzes.length / itemsPerPage) ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage < Math.ceil(quizzes.length / itemsPerPage)) {
                            e.currentTarget.style.backgroundColor = BRAND_COLORS.light;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Next →
                      </button>
                    </div>

                    {/* Right: Jump to Page */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#64748B]">Jump to:</label>
                      <input
                        type="number"
                        min="1"
                        max={Math.ceil(quizzes.length / itemsPerPage)}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value) || 1;
                          setCurrentPage(Math.min(Math.max(1, page), Math.ceil(quizzes.length / itemsPerPage)));
                        }}
                        className="w-12 px-2 py-1 text-sm border rounded-lg"
                        style={{
                          borderColor: BRAND_COLORS.border,
                          backgroundColor: BRAND_COLORS.white,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: UPLOAD CSV */}
        {activeTab === 'create-csv' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">Upload Quiz from CSV</h2>
            {csvError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {csvError}
              </div>
            )}
            <div className="bg-[#F0F7FA] border-2 border-dashed border-[#0891B2] rounded-lg p-8 text-center space-y-4">
              <p className="text-[#1E3A5F] font-semibold">Drag and drop your CSV file here</p>
              <p className="text-sm text-[#64748B]">or click to browse</p>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCsvFile(file);
                    log.info(`CSV selected: ${file.name}`);
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('csv-input')?.click()}
                className="px-6 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a]"
              >
                Select File
              </button>
              {csvFile && (
                <div className="mt-4 p-3 bg-white rounded border border-[#0891B2]">
                  <p className="text-sm text-[#1E3A5F] font-semibold">Selected: {csvFile.name}</p>
                  <button
                    onClick={handleCsvUpload}
                    disabled={csvLoading}
                    className="mt-2 px-6 py-2 bg-[#EA580C] text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {csvLoading ? 'Uploading...' : '📤 Upload and Create Quiz'}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-8 p-4 bg-[#F0F7FA] rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-[#1E3A5F]">CSV Format (Required Columns):</p>
                <a
                  href="/api/sample-csv"
                  download="sample-quiz.csv"
                  className="text-sm px-3 py-1 bg-white border border-[#0891B2] text-[#0891B2] rounded hover:bg-[#F0F7FA] font-semibold"
                >
                  📥 Download Sample
                </a>
              </div>
              <code className="text-sm text-[#64748B] bg-white p-3 rounded block overflow-x-auto">
                question, timer_seconds, answer_a, answer_b, answer_c, answer_d, answer_e,<br />
                correct_answer, explanation, source_link
              </code>
              <div className="mt-3 text-xs text-[#64748B]">
                <p><strong>Fields:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>question: The quiz question text</li>
                  <li>timer_seconds: Time limit for answering (e.g., 60)</li>
                  <li>answer_a to answer_e: Five answer options</li>
                  <li>correct_answer: A, B, C, D, or E</li>
                  <li>explanation: Why this answer is correct</li>
                  <li>source_link: Reference/learning material URL</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GENERATE WITH AI */}
        {activeTab === 'create-ai' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-[#1E3A5F]">Generate Quiz with AI</h2>
            {aiError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {aiError}
              </div>
            )}
            <div className="space-y-4 bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-6">
              <div>
                <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">Topic</label>
                <input
                  type="text"
                  placeholder="e.g., DORA Metrics for Agile Teams"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">Number of Questions</label>
                  <select
                    value={aiQuestions}
                    onChange={(e) => setAiQuestions(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white focus:border-[#0891B2]"
                  >
                    {[5, 10, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} questions
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">Difficulty</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white focus:border-[#0891B2]"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                    <option>Mixed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">Additional Instructions</label>
                <textarea
                  placeholder="e.g., Include DORA's four key metrics, focus on deployment frequency and lead time..."
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]"
                />
              </div>

              <button
                onClick={handleGenerateWithAI}
                disabled={aiLoading}
                className="w-full px-6 py-3 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] disabled:opacity-50"
              >
                {aiLoading ? '⏳ Generating...' : '🤖 Generate Quiz'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: ANALYTICS - 5 Professional Reports with Tab Navigation */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard quizzes={quizzes} />
        )}

        {/* TAB 5: STUDENT RESULTS */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: BRAND_COLORS.navy }}>
                  Student Results Report
                </h2>
                <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
                  Search and filter student quiz attempts by email or quiz
                </p>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div
                className="p-4 rounded-lg border flex items-center gap-3 animate-fadeIn"
                style={{ backgroundColor: '#dcfce7', borderColor: '#22c55e', color: '#166534' }}
              >
                <span className="text-lg">✓</span>
                <p className="text-sm font-medium">{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="ml-auto text-lg leading-none hover:opacity-70"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Filter Mode Selection */}
            <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: BRAND_COLORS.navy }}>
                📊 Select Filter Method
              </h3>
              <p style={{ color: BRAND_COLORS.gray }} className="text-sm mb-4">
                Choose how you want to filter results
              </p>
              <div className="flex gap-6">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-75 transition-opacity">
                  <input
                    type="radio"
                    name="filter-mode"
                    value="by-email"
                    checked={resultsFilterMode === 'by-email'}
                    onChange={(e) => {
                      setResultsFilterMode(e.target.value as 'by-email' | 'by-quiz');
                      setStudentResults([]);
                      setSuccessMessage(null);
                      setResultsError(null);
                    }}
                    className="w-4 h-4"
                    style={{ accentColor: BRAND_COLORS.teal }}
                    data-testid="filter-by-email"
                    aria-label="Filter by student email"
                  />
                  <span style={{ color: BRAND_COLORS.navy }} className="font-medium">
                    👤 Search by Student Email
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-75 transition-opacity">
                  <input
                    type="radio"
                    name="filter-mode"
                    value="by-quiz"
                    checked={resultsFilterMode === 'by-quiz'}
                    onChange={(e) => {
                      setResultsFilterMode(e.target.value as 'by-email' | 'by-quiz');
                      setStudentResults([]);
                      setSuccessMessage(null);
                      setResultsError(null);
                    }}
                    className="w-4 h-4"
                    style={{ accentColor: BRAND_COLORS.teal }}
                    data-testid="filter-by-quiz"
                    aria-label="Filter by quiz"
                  />
                  <span style={{ color: BRAND_COLORS.navy }} className="font-medium">
                    📝 Search by Quiz
                  </span>
                </label>
              </div>
            </div>

            {/* Filter Inputs - Email Search */}
            {resultsFilterMode === 'by-email' && (
              <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white shadow-sm">
                <label htmlFor="email-input" className="block text-sm font-semibold mb-2" style={{ color: BRAND_COLORS.navy }}>
                  📧 Enter Student Email Address
                </label>
                <p style={{ color: BRAND_COLORS.gray }} className="text-sm mb-4">
                  Enter the student's email to view all their quiz attempts
                </p>
                <div className="flex gap-2">
                  <input
                    id="email-input"
                    type="email"
                    placeholder="e.g., alice@example.com"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchByEmail()}
                    maxLength={255}
                    data-testid="email-input"
                    aria-label="Student email address"
                    className="flex-1 px-4 py-3 rounded-lg border font-normal transition-colors focus:outline-none focus:ring-2"
                    style={{
                      borderColor: resultsError && !studentEmail ? '#ef4444' : BRAND_COLORS.border,
                      backgroundColor: BRAND_COLORS.white,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = BRAND_COLORS.teal;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND_COLORS.light}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = BRAND_COLORS.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    onClick={searchByEmail}
                    disabled={!studentEmail || resultsLoading}
                    data-testid="search-email-button"
                    className="px-6 py-3 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:disabled:opacity-50"
                    style={{
                      backgroundColor: !studentEmail || resultsLoading ? '#cbd5e1' : BRAND_COLORS.teal,
                    }}
                    onMouseEnter={(e) => {
                      if (!(!studentEmail || resultsLoading)) {
                        e.currentTarget.style.backgroundColor = BRAND_COLORS.teal_dark;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(!studentEmail || resultsLoading)) {
                        e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
                      }
                    }}
                  >
                    {resultsLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Searching...
                      </span>
                    ) : (
                      '🔍 Search'
                    )}
                  </button>
                </div>
                {studentEmail && !isValidEmail(studentEmail) && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    Please enter a valid email address
                  </p>
                )}
              </div>
            )}

            {/* Filter Inputs - Quiz Search */}
            {resultsFilterMode === 'by-quiz' && (
              <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg p-6 bg-white shadow-sm">
                <label htmlFor="quiz-select" className="block text-sm font-semibold mb-2" style={{ color: BRAND_COLORS.navy }}>
                  📝 Select a Quiz
                </label>
                <p style={{ color: BRAND_COLORS.gray }} className="text-sm mb-4">
                  Select a quiz to view all student attempts and scores
                </p>
                <div className="flex gap-2">
                  <select
                    id="quiz-select"
                    value={selectedQuizId}
                    onChange={(e) => setSelectedQuizId(e.target.value)}
                    data-testid="quiz-select"
                    aria-label="Select a quiz"
                    className="flex-1 px-4 py-3 rounded-lg border font-normal transition-colors focus:outline-none focus:ring-2"
                    style={{
                      borderColor: BRAND_COLORS.border,
                      backgroundColor: BRAND_COLORS.white,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = BRAND_COLORS.teal;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND_COLORS.light}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = BRAND_COLORS.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">-- Select a quiz --</option>
                    {quizzes.map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title} ({quiz.total_questions} Qs, {quiz.total_points} pts)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={searchByQuiz}
                    disabled={!selectedQuizId || resultsLoading}
                    data-testid="search-quiz-button"
                    className="px-6 py-3 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:disabled:opacity-50"
                    style={{
                      backgroundColor: !selectedQuizId || resultsLoading ? '#cbd5e1' : BRAND_COLORS.teal,
                    }}
                    onMouseEnter={(e) => {
                      if (!(!selectedQuizId || resultsLoading)) {
                        e.currentTarget.style.backgroundColor = BRAND_COLORS.teal_dark;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(!selectedQuizId || resultsLoading)) {
                        e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
                      }
                    }}
                  >
                    {resultsLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Searching...
                      </span>
                    ) : (
                      '🔍 Search'
                    )}
                  </button>
                </div>
                {quizzes.length === 0 && (
                  <p style={{ color: BRAND_COLORS.gray }} className="text-sm mt-3">
                    ℹ️ No quizzes available. Create a quiz first to view results.
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {resultsError && (
              <div className="p-4 rounded-lg border flex items-start gap-3" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>
                <span className="text-lg mt-0.5">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{resultsError}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {studentEmail && resultsFilterMode === 'by-email'
                      ? 'Try checking the email address for typos'
                      : resultsFilterMode === 'by-quiz'
                        ? 'Please select a valid quiz'
                        : 'Please adjust your search and try again'}
                  </p>
                </div>
                <button
                  onClick={() => setResultsError(null)}
                  className="ml-auto text-lg leading-none hover:opacity-70"
                  aria-label="Close error"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Loading State */}
            {resultsLoading && (
              <div className="text-center py-12 bg-white border rounded-lg" style={{ borderColor: BRAND_COLORS.border }}>
                <div className="inline-block">
                  <div
                    className="w-12 h-12 rounded-full border-4 border-transparent animate-spin mx-auto mb-4"
                    style={{ borderTopColor: BRAND_COLORS.teal, borderRightColor: BRAND_COLORS.teal }}
                  ></div>
                  <p style={{ color: BRAND_COLORS.gray }}>Loading results...</p>
                  <p className="text-xs" style={{ color: BRAND_COLORS.gray }}>
                    This usually takes a few seconds
                  </p>
                </div>
              </div>
            )}

            {/* Results Table */}
            {!resultsLoading && studentResults.length > 0 && (
              <div style={{ borderColor: BRAND_COLORS.border }} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Results Summary */}
                <div className="px-6 py-3 border-b" style={{ backgroundColor: BRAND_COLORS.light, borderBottomColor: BRAND_COLORS.border }}>
                  <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
                    Showing {paginatedResults.length} of {sortedResults.length} result
                    {sortedResults.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: BRAND_COLORS.light, borderBottomColor: BRAND_COLORS.border }} className="border-b">
                      <tr>
                        <th
                          className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:opacity-75 transition-opacity select-none"
                          onClick={() => handleSort('name')}
                          style={{ color: BRAND_COLORS.navy }}
                          data-testid="sort-name"
                        >
                          <div className="flex items-center gap-2">
                            <span>👤 Student Name</span>
                            {sortConfig.key === 'name' && (
                              <span className="text-xs" style={{ color: BRAND_COLORS.teal }}>
                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: BRAND_COLORS.navy }}>
                          📧 Email
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: BRAND_COLORS.navy }}>
                          📚 Course / Lesson
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: BRAND_COLORS.navy }}>
                          📝 Quiz
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: BRAND_COLORS.navy }}>
                          Points
                        </th>
                        <th
                          className="px-6 py-4 text-center text-sm font-semibold cursor-pointer hover:opacity-75 transition-opacity select-none"
                          onClick={() => handleSort('score')}
                          style={{ color: BRAND_COLORS.navy }}
                          data-testid="sort-score"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>📊 Score</span>
                            {sortConfig.key === 'score' && (
                              <span className="text-xs" style={{ color: BRAND_COLORS.teal }}>
                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-4 text-center text-sm font-semibold cursor-pointer hover:opacity-75 transition-opacity select-none"
                          onClick={() => handleSort('date')}
                          style={{ color: BRAND_COLORS.navy }}
                          data-testid="sort-date"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>📅 Date Taken</span>
                            {sortConfig.key === 'date' && (
                              <span className="text-xs" style={{ color: BRAND_COLORS.teal }}>
                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: BRAND_COLORS.navy }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedResults.map((result, idx) => (
                        <tr
                          key={`${result.session_id}-${idx}`}
                          className="border-b transition-colors hover:opacity-75"
                          style={{ borderBottomColor: BRAND_COLORS.border }}
                          data-testid="result-row"
                        >
                          <td className="px-6 py-4 text-sm font-medium" style={{ color: BRAND_COLORS.navy }}>
                            {result.first_name} {result.last_name}
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: BRAND_COLORS.gray }}>
                            {result.email}
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: BRAND_COLORS.gray }}>
                            {result.course_name}
                            {result.lesson_name && ` / ${result.lesson_name}`}
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: BRAND_COLORS.gray }}>
                            {result.quiz_title}
                          </td>
                          <td className="px-6 py-4 text-sm text-center font-semibold" style={{ color: BRAND_COLORS.navy }}>
                            {result.score}/{result.total_points}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span
                              className="px-3 py-2 rounded-lg text-sm font-semibold inline-block"
                              style={{
                                backgroundColor:
                                  result.percentage >= PASS_THRESHOLD
                                    ? '#dcfce7'
                                    : result.percentage >= WARN_THRESHOLD
                                      ? '#fef3c7'
                                      : '#fee2e2',
                                color:
                                  result.percentage >= PASS_THRESHOLD
                                    ? '#166534'
                                    : result.percentage >= WARN_THRESHOLD
                                      ? '#92400e'
                                      : '#991b1b',
                              }}
                              data-testid="score-badge"
                            >
                              {result.percentage}%
                              {result.percentage >= PASS_THRESHOLD && ' ✓'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: BRAND_COLORS.gray }}>
                            {new Date(result.taken_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => router.push(`/teach/results/${result.session_id}`)}
                              className="text-sm font-semibold transition-colors hover:underline"
                              style={{ color: BRAND_COLORS.teal }}
                              data-testid="view-button"
                              title="View detailed session results"
                            >
                              View Details →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    className="px-6 py-4 flex items-center justify-between border-t"
                    style={{ backgroundColor: BRAND_COLORS.light, borderTopColor: BRAND_COLORS.border }}
                  >
                    <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded border text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          borderColor: currentPage === 1 ? BRAND_COLORS.border : BRAND_COLORS.teal,
                          color: currentPage === 1 ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                        }}
                        data-testid="prev-page"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded border text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          borderColor: currentPage === totalPages ? BRAND_COLORS.border : BRAND_COLORS.teal,
                          color: currentPage === totalPages ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                        }}
                        data-testid="next-page"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State - No Results After Search */}
            {!resultsLoading && studentResults.length === 0 && (studentEmail || selectedQuizId) && (
              <div className="text-center py-12 bg-white border rounded-lg" style={{ borderColor: BRAND_COLORS.border }}>
                <p className="text-2xl mb-2">🔍</p>
                <p style={{ color: BRAND_COLORS.navy }} className="font-semibold mb-2">
                  No Results Found
                </p>
                <p style={{ color: BRAND_COLORS.gray }} className="text-sm mb-4 max-w-md mx-auto">
                  {resultsFilterMode === 'by-email'
                    ? `No quiz attempts found for ${studentEmail}. Check the email address and try again.`
                    : 'No students have attempted this quiz yet. Check back later!'}
                </p>
                <button
                  onClick={() => {
                    setStudentEmail('');
                    setSelectedQuizId('');
                    setStudentResults([]);
                  }}
                  className="text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                  style={{ backgroundColor: BRAND_COLORS.light, color: BRAND_COLORS.teal }}
                  data-testid="clear-search"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Empty State - Initial */}
            {!resultsLoading && studentResults.length === 0 && !studentEmail && !selectedQuizId && (
              <div className="text-center py-12 bg-white border rounded-lg" style={{ borderColor: BRAND_COLORS.border }}>
                <p className="text-3xl mb-2">📊</p>
                <p style={{ color: BRAND_COLORS.navy }} className="font-semibold mb-2">
                  Ready to View Results
                </p>
                <p style={{ color: BRAND_COLORS.gray }} className="text-sm max-w-md mx-auto">
                  Select a filter method above and enter a student email or quiz to view their results
                </p>
              </div>
            )}

            {/* Export Option */}
            {studentResults.length > 0 && !resultsLoading && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={resultsLoading}
                  title={`Export ${studentResults.length} result${studentResults.length !== 1 ? 's' : ''} to CSV`}
                  className="px-4 py-2 rounded-lg font-semibold transition-colors border disabled:opacity-50"
                  style={{
                    borderColor: BRAND_COLORS.teal,
                    color: BRAND_COLORS.teal,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!resultsLoading) {
                      e.currentTarget.style.backgroundColor = BRAND_COLORS.light;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  data-testid="export-button"
                >
                  {resultsLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                      Exporting...
                    </span>
                  ) : (
                    <>📥 Export to CSV</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* SHARE MODAL */}
        {shareModal.open && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShareModal({ open: false })}
          >
            <div
              style={{
                backgroundColor: BRAND_COLORS.white,
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ color: BRAND_COLORS.navy, margin: '0 0 8px 0', fontSize: '20px' }}>
                🔗 Share Quiz
              </h2>
              <p style={{ color: BRAND_COLORS.gray, margin: '0 0 24px 0', fontSize: '14px' }}>
                {shareModal.quizTitle}
              </p>

              <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                {/* Practice Mode Link */}
                <div style={{ backgroundColor: BRAND_COLORS.light, padding: '12px', borderRadius: '8px' }}>
                  <p style={{ color: BRAND_COLORS.navy, fontWeight: '600', fontSize: '13px', margin: '0 0 8px 0' }}>
                    📚 Practice Mode
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/learn/quizzes/${shareModal.quizCode}/practice`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `2px solid ${BRAND_COLORS.teal}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      marginBottom: '8px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0' }}>
                    📋 Triple-click to select, then press Ctrl+C (or Cmd+C on Mac) to copy
                  </p>
                </div>

                {/* Mock Test Link */}
                <div style={{ backgroundColor: BRAND_COLORS.light, padding: '12px', borderRadius: '8px' }}>
                  <p style={{ color: BRAND_COLORS.navy, fontWeight: '600', fontSize: '13px', margin: '0 0 8px 0' }}>
                    🎯 Mock Test Mode
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/learn/quizzes/${shareModal.quizCode}/mock-test`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `2px solid ${BRAND_COLORS.teal}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      marginBottom: '8px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0' }}>
                    📋 Triple-click to select, then press Ctrl+C (or Cmd+C on Mac) to copy
                  </p>
                </div>

                {/* Game Mode Link */}
                <div style={{ backgroundColor: BRAND_COLORS.light, padding: '12px', borderRadius: '8px' }}>
                  <p style={{ color: BRAND_COLORS.navy, fontWeight: '600', fontSize: '13px', margin: '0 0 8px 0' }}>
                    🎮 Game Mode (Live)
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/teach/quizzes/${shareModal.quizCode}/game-mode`}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `2px solid ${BRAND_COLORS.teal}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      marginBottom: '8px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0' }}>
                    📋 Triple-click to select, then press Ctrl+C (or Cmd+C on Mac) to copy
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setShareModal({ open: false })}
                  style={{
                    backgroundColor: BRAND_COLORS.light,
                    color: BRAND_COLORS.navy,
                    border: `1px solid ${BRAND_COLORS.border}`,
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FLOATING ACTION BUTTON (FAB) - Mobile Navigation */}
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            zIndex: 40,
          }}
          onMouseEnter={(e) => {
            const label = e.currentTarget.querySelector('[data-fab-label]') as HTMLElement;
            if (label) {
              label.style.opacity = '1';
              label.style.visibility = 'visible';
            }
          }}
          onMouseLeave={(e) => {
            const label = e.currentTarget.querySelector('[data-fab-label]') as HTMLElement;
            if (label) {
              label.style.opacity = '0';
              label.style.visibility = 'hidden';
            }
          }}
        >
          {/* Label - appears on hover */}
          <div
            data-fab-label
            style={{
              backgroundColor: BRAND_COLORS.navy,
              color: BRAND_COLORS.white,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              opacity: 0,
              visibility: 'hidden',
              transition: 'opacity 0.2s ease, visibility 0.2s ease',
            }}
          >
            Full Quiz Management
          </div>

          {/* Button */}
          <button
            onClick={() => router.push('/teach/quiz/management')}
            title="Full Quiz Management"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              boxShadow: '0 4px 12px rgba(8, 145, 178, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BRAND_COLORS.orange;
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(234, 88, 12, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(8, 145, 178, 0.3)';
            }}
          >
            ⚙️
          </button>
        </div>
      </div>
    </div>
  );
}
