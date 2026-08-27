'use client';

/**
 * Manual Quiz Creation
 * Build a quiz question by question, upload CSV, or generate with AI
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Copy URL to clipboard with graceful fallback
 * Returns true if copy succeeded, false if fallback instructions shown
 */
const copyToClipboard = async (text: string, onSuccess: () => void, onFallback: () => void) => {
  try {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      onSuccess();
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      onFallback();
      return false;
    }
  } catch (_err) {
    // If Clipboard API fails, show fallback instructions
    onFallback();
    return false;
  }
};

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
};

/**
 * Toast Notification Component
 * Displays temporary notifications at the top of the page
 */
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: '400px' }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            marginBottom: '12px',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor:
              toast.type === 'success'
                ? '#D1FAE5'
                : toast.type === 'error'
                ? '#FEE2E2'
                : '#DBEAFE',
            borderLeft: `4px solid ${
              toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#3B82F6'
            }`,
            color:
              toast.type === 'success'
                ? '#065F46'
                : toast.type === 'error'
                ? '#7F1D1D'
                : '#1E40AF',
            fontSize: '14px',
            fontWeight: '500',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span>{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginLeft: '12px',
                fontSize: '18px',
                opacity: '0.6',
                padding: '0',
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

interface Question {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
  source_link: string;
  timer_seconds: string;
}

interface CreatedQuizData {
  title: string;
  quiz_code: string;
  total_questions: number;
  total_points: number;
  shareable_urls: {
    practice: string;
    game_mode: string;
    mock_test: string;
  };
}

export default function ManualCreatePage() {
  const router = useRouter();
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsingCSV, setIsParsingCSV] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'ai'>('manual');
  const [aiTopic, setAiTopic] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null); // Track which URL was copied

  // Toast notification state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add toast notification
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  // Remove toast notification
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    correct_answer: 'A',
    explanation: '',
    source_link: '',
    timer_seconds: '60',
  });

  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim()) {
      showToast('Please enter a question', 'error');
      return;
    }

    if (
      !currentQuestion.option_a.trim() ||
      !currentQuestion.option_b.trim() ||
      !currentQuestion.option_c.trim() ||
      !currentQuestion.option_d.trim() ||
      !currentQuestion.option_e.trim()
    ) {
      showToast('Please fill in all answer options', 'error');
      return;
    }

    setQuestions([...questions, currentQuestion]);
    showToast(`✅ Question ${questions.length + 1} added successfully`, 'success');
    setCurrentQuestion({
      question: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      correct_answer: 'A',
      explanation: '',
      source_link: '',
      timer_seconds: '60',
    });
  };

  // Parse CSV with proper handling of quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsingCSV(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          showToast('CSV must have a header row and at least one question row', 'error');
          setIsParsingCSV(false);
          return;
        }

        const headerValues = parseCSVLine(lines[0]);
        const headers = headerValues.map(h => h.toLowerCase());
        const expectedHeaders = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct_answer', 'explanation', 'source_link', 'timer_seconds'];

        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          showToast(`Missing columns: ${missingHeaders.join(', ')}\n\nRequired: ${expectedHeaders.join(', ')}`, 'error');
          setIsParsingCSV(false);
          return;
        }

        // Parse all questions and collect errors
        const successfulQuestions: Question[] = [];
        const failedQuestions: Array<{ row: number; error: string }> = [];

        lines.slice(1).forEach((line, idx) => {
          const rowNumber = idx + 2;

          try {
            const values = parseCSVLine(line);

            const question = values[headers.indexOf('question')] || '';
            const optionA = values[headers.indexOf('option_a')] || '';
            const optionB = values[headers.indexOf('option_b')] || '';
            const optionC = values[headers.indexOf('option_c')] || '';
            const optionD = values[headers.indexOf('option_d')] || '';
            const optionE = values[headers.indexOf('option_e')] || '';
            const correctAnswer = (values[headers.indexOf('correct_answer')] || 'A').toUpperCase();
            const timerSeconds = values[headers.indexOf('timer_seconds')] || '60';

            // Validation
            const errors: string[] = [];

            if (!question.trim()) {
              errors.push('Question text is empty');
            }
            if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim() || !optionE.trim()) {
              errors.push('All 5 options (A-E) must be filled');
            }
            if (!['A', 'B', 'C', 'D', 'E'].includes(correctAnswer)) {
              errors.push(`Correct answer must be A-E (got "${correctAnswer}")`);
            }
            if (isNaN(parseInt(timerSeconds))) {
              errors.push(`Timer must be a number (got "${timerSeconds}")`);
            }

            if (errors.length > 0) {
              failedQuestions.push({
                row: rowNumber,
                error: errors.join('; '),
              });
              return;
            }

            successfulQuestions.push({
              question,
              option_a: optionA,
              option_b: optionB,
              option_c: optionC,
              option_d: optionD,
              option_e: optionE,
              correct_answer: correctAnswer,
              explanation: values[headers.indexOf('explanation')] || '',
              source_link: values[headers.indexOf('source_link')] || '',
              timer_seconds: timerSeconds,
            });
          } catch (err) {
            failedQuestions.push({
              row: rowNumber,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        });

        // Show results with rich formatting
        const totalAttempted = successfulQuestions.length + failedQuestions.length;
        const successRate = Math.round((successfulQuestions.length / totalAttempted) * 100);

        if (successfulQuestions.length > 0) {
          setQuestions([...questions, ...successfulQuestions]);
        }

        if (successfulQuestions.length === 0 && failedQuestions.length === 0) {
          showToast('No valid questions found in CSV', 'error');
        } else if (failedQuestions.length === 0) {
          // Perfect upload - all questions valid
          showToast(
            `✅ All ${successfulQuestions.length} question${successfulQuestions.length !== 1 ? 's' : ''} loaded successfully!\n📊 Success Rate: 100%\n\n📝 Ready to create quiz with ${successfulQuestions.length} questions.`,
            'success'
          );
        } else {
          // Partial upload - some questions failed
          const failureDetails = failedQuestions
            .slice(0, 3)
            .map(f => `Row ${f.row}: ${f.error}`)
            .join('\n');
          const moreFailures = failedQuestions.length > 3 ? `\n...and ${failedQuestions.length - 3} more` : '';

          showToast(
            `✅ Loaded: ${successfulQuestions.length}/${totalAttempted} questions (${successRate}%)\n\n❌ Issues:\n${failureDetails}${moreFailures}`,
            'error'
          );
        }

        event.target.value = '';
        setIsParsingCSV(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        showToast(`Error reading CSV file: ${errorMsg}`, 'error');
        setIsParsingCSV(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAIGeneration = async () => {
    if (!aiTopic.trim()) {
      showToast('Please enter a topic or prompt', 'error');
      return;
    }

    setIsGenerating(true);
    setShowAIModal(false);
    showToast('Generating questions with AI...', 'info');

    try {
      const response = await fetch('/api/instructor/quiz/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, count: 5 }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate quiz');
      }

      setQuestions([...questions, ...result.data.questions]);
      setAiTopic('');
      showToast(`✅ Generated ${result.data.questions.length} questions with AI`, 'success');
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to generate quiz'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const [createdQuizData, setCreatedQuizData] = useState<CreatedQuizData | null>(null);

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      showToast('Please enter a quiz title', 'error');
      return;
    }

    if (questions.length === 0) {
      showToast('Please add at least one question', 'error');
      return;
    }

    setIsCreating(true);
    showToast('Creating quiz...', 'info');

    try {
      // Create quiz via API
      const response = await fetch('/api/instructor/quiz/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle,
          questions: questions.map((q, idx) => ({
            question_number: idx + 1,
            ...q,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create quiz');
      }

      setCreatedQuizData(result.data);
      showToast(`🎉 Quiz "${result.data.title}" created successfully!`, 'success');
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to create quiz'}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Show success screen after quiz creation
  if (createdQuizData) {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* SUCCESS HEADER */}
        <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold">🎉 Quiz Created Successfully!</h1>
          </div>
        </div>

        {/* SUCCESS CONTENT */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Quiz Details Card */}
          <div className="mb-8 border rounded-lg p-6" style={{ borderColor: BRAND_COLORS.border }}>
            <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-4">
              📌 Quiz Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '16px' }}>
              <div>
                <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', marginBottom: '4px' }}>TITLE</p>
                <p style={{ color: BRAND_COLORS.navy, fontWeight: 'bold' }}>{createdQuizData.title}</p>
              </div>
              <div>
                <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', marginBottom: '4px' }}>QUIZ CODE</p>
                <p style={{ color: BRAND_COLORS.teal, fontWeight: 'bold', fontSize: '18px' }}>
                  {createdQuizData.quiz_code}
                </p>
              </div>
              <div>
                <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', marginBottom: '4px' }}>QUESTIONS</p>
                <p style={{ color: BRAND_COLORS.navy, fontWeight: 'bold' }}>
                  {createdQuizData.total_questions} questions
                </p>
              </div>
              <div>
                <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', marginBottom: '4px' }}>TOTAL POINTS</p>
                <p style={{ color: BRAND_COLORS.navy, fontWeight: 'bold' }}>
                  {createdQuizData.total_points} points
                </p>
              </div>
            </div>
          </div>

          {/* Share Links */}
          <div className="mb-8 border rounded-lg p-6" style={{ borderColor: BRAND_COLORS.border }}>
            <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-6">
              🔗 Share with Students
            </h2>

            {/* Practice Mode */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border" style={{ borderColor: '#93C5FD' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-1">
                    📚 Practice Mode
                  </p>
                  <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0', fontWeight: 'normal' }}>
                    Students retake unlimited times • See correct answers immediately • Learn at their pace
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#F0F7FA', padding: '12px', borderRadius: '4px', marginBottom: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={createdQuizData.shareable_urls.practice}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: `2px solid ${BRAND_COLORS.teal}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'text',
                  }}
                />
                <button
                  onClick={() =>
                    copyToClipboard(
                      createdQuizData.shareable_urls.practice,
                      () => {
                        setCopiedUrl('practice');
                        setTimeout(() => setCopiedUrl(null), 2000);
                      },
                      () => {
                        showToast('Copy failed. Triple-click the URL and press Ctrl+C (or Cmd+C on Mac)', 'error');
                      }
                    )
                  }
                  style={{
                    backgroundColor: copiedUrl === 'practice' ? '#10B981' : BRAND_COLORS.teal,
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedUrl === 'practice' ? '✅ Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '11px', margin: '0' }}>
                💡 Can&apos;t copy? Triple-click the URL, then press Ctrl+C (or Cmd+C on Mac)
              </p>
            </div>

            {/* Game Mode */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg border" style={{ borderColor: '#86EFAC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-1">
                    🎮 Game Mode
                  </p>
                  <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0', fontWeight: 'normal' }}>
                    60-second timer per question • Live leaderboard • Competitive scoring • Perfect for live classes
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#F0F7FA', padding: '12px', borderRadius: '4px', marginBottom: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={createdQuizData.shareable_urls.game_mode}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: `2px solid ${BRAND_COLORS.teal}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'text',
                  }}
                />
                <button
                  onClick={() =>
                    copyToClipboard(
                      createdQuizData.shareable_urls.game_mode,
                      () => {
                        setCopiedUrl('game');
                        setTimeout(() => setCopiedUrl(null), 2000);
                      },
                      () => {
                        showToast('Copy failed. Triple-click the URL and press Ctrl+C (or Cmd+C on Mac)', 'error');
                      }
                    )
                  }
                  style={{
                    backgroundColor: copiedUrl === 'game' ? '#10B981' : BRAND_COLORS.teal,
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedUrl === 'game' ? '✅ Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '11px', margin: '0' }}>
                💡 Can&apos;t copy? Triple-click the URL, then press Ctrl+C (or Cmd+C on Mac)
              </p>
            </div>

            {/* Mock Test */}
            <div className="mb-6 p-4 bg-orange-50 rounded-lg border" style={{ borderColor: '#FDBA74' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-1">
                    📋 Mock Test
                  </p>
                  <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '0', fontWeight: 'normal' }}>
                    Timed assessment • Single attempt • Get score & feedback when done • Realistic exam format
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#F0F7FA', padding: '12px', borderRadius: '4px', marginBottom: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={createdQuizData.shareable_urls.mock_test}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: `2px solid ${BRAND_COLORS.teal}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'text',
                  }}
                />
                <button
                  onClick={() =>
                    copyToClipboard(
                      createdQuizData.shareable_urls.mock_test,
                      () => {
                        setCopiedUrl('mock');
                        setTimeout(() => setCopiedUrl(null), 2000);
                      },
                      () => {
                        showToast('Copy failed. Triple-click the URL and press Ctrl+C (or Cmd+C on Mac)', 'error');
                      }
                    )
                  }
                  style={{
                    backgroundColor: copiedUrl === 'mock' ? '#10B981' : BRAND_COLORS.teal,
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedUrl === 'mock' ? '✅ Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '11px', margin: '0' }}>
                💡 Can&apos;t copy? Triple-click the URL, then press Ctrl+C (or Cmd+C on Mac)
              </p>
            </div>

            {/* Quiz Code Alternative */}
            <div className="p-4 bg-purple-50 rounded-lg border" style={{ borderColor: '#D8B4FE' }}>
              <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-2">
                💡 Or Share Just the Code
              </p>
              <div style={{ backgroundColor: '#F0F7FA', padding: '12px', borderRadius: '4px' }}>
                <p style={{ color: BRAND_COLORS.teal, fontWeight: 'bold', fontSize: '18px', textAlign: 'center', margin: '0' }}>
                  {createdQuizData.quiz_code}
                </p>
              </div>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '12px', margin: '8px 0 0 0' }}>
                Students can enter this code on the quiz player to join
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => router.push('/teach/dashboard')}
              style={{ borderColor: BRAND_COLORS.gray, color: BRAND_COLORS.gray }}
              className="px-6 py-3 border rounded-lg font-semibold hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push(`/teach/quiz/management?code=${createdQuizData.quiz_code}`)}
              style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
              className="px-6 py-3 rounded-lg font-semibold hover:opacity-90"
            >
              📊 Manage Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* AI GENERATION MODAL */}
      {showAIModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowAIModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: BRAND_COLORS.navy, fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              🤖 Generate Quiz with AI
            </h2>
            <p style={{ color: BRAND_COLORS.gray, marginBottom: '20px', fontSize: '14px' }}>
              Enter a topic or prompt and Claude will generate 5 multiple-choice questions for your quiz.
            </p>
            <textarea
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g., &quot;Python Basics&quot; or &quot;Write 5 questions about machine learning fundamentals&quot;"
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${BRAND_COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                marginBottom: '20px',
                minHeight: '100px',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAIModal(false)}
                style={{ borderColor: BRAND_COLORS.gray, color: BRAND_COLORS.gray }}
                className="px-4 py-2 border rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAIGeneration}
                disabled={isGenerating}
                style={{
                  backgroundColor: BRAND_COLORS.orange,
                  color: 'white',
                  opacity: isGenerating ? 0.5 : 1,
                }}
                className="px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:cursor-not-allowed"
              >
                {isGenerating ? '⏳ Generating...' : '✨ Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-300 hover:text-white mb-4"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold">Create Quiz Manually</h1>
          <p style={{ color: BRAND_COLORS.gray }} className="mt-2">
            Build your quiz question by question
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Quiz Title */}
        <div className="mb-8 border rounded-lg p-6" style={{ borderColor: BRAND_COLORS.border }}>
          <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
            Quiz Title
          </label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="e.g., Python Basics"
            style={{ borderColor: BRAND_COLORS.border }}
            className="w-full px-4 py-2 rounded-lg border bg-white focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]"
          />
        </div>

        {/* TABS */}
        <div className="mb-8 flex gap-2 border-b" style={{ borderColor: BRAND_COLORS.border }}>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              borderBottomColor: activeTab === 'manual' ? BRAND_COLORS.navy : 'transparent',
              borderBottomWidth: '2px',
              color: activeTab === 'manual' ? BRAND_COLORS.navy : BRAND_COLORS.gray,
            }}
            className="px-4 py-2 font-semibold"
          >
            ✏️ Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            style={{
              borderBottomColor: activeTab === 'csv' ? BRAND_COLORS.navy : 'transparent',
              borderBottomWidth: '2px',
              color: activeTab === 'csv' ? BRAND_COLORS.navy : BRAND_COLORS.gray,
            }}
            className="px-4 py-2 font-semibold"
          >
            📄 Upload CSV
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              borderBottomColor: activeTab === 'ai' ? BRAND_COLORS.navy : 'transparent',
              borderBottomWidth: '2px',
              color: activeTab === 'ai' ? BRAND_COLORS.navy : BRAND_COLORS.gray,
            }}
            className="px-4 py-2 font-semibold"
          >
            🤖 AI Generate
          </button>
        </div>

        {/* MANUAL TAB */}
        {activeTab === 'manual' && (
        <div className="mb-8 border rounded-lg p-6 bg-[#F0F7FA]" style={{ borderColor: BRAND_COLORS.border }}>
          <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-6">
            Question {questions.length + 1}
          </h2>

          <div className="space-y-4">
            {/* Question Text */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Question Text
              </label>
              <textarea
                value={currentQuestion.question}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                rows={2}
                placeholder="Enter your question here"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:border-[#0891B2]"
              />
            </div>

            {/* Answer Options */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-3">
                Answer Options
              </label>
              <div className="space-y-2">
                {['a', 'b', 'c', 'd', 'e'].map((letter) => (
                  <div key={letter} className="flex gap-2 items-center">
                    <label className="w-8 font-semibold" style={{ color: BRAND_COLORS.navy }}>
                      {letter.toUpperCase()}.
                    </label>
                    <input
                      type="text"
                      value={currentQuestion[`option_${letter}` as keyof typeof currentQuestion] || ''}
                      onChange={(e) =>
                        setCurrentQuestion({ ...currentQuestion, [`option_${letter}`]: e.target.value })
                      }
                      placeholder={`Option ${letter.toUpperCase()}`}
                      style={{ borderColor: BRAND_COLORS.border }}
                      className="flex-1 px-4 py-2 rounded-lg border bg-white focus:border-[#0891B2]"
                    />
                    <input
                      type="radio"
                      name="correct_answer"
                      value={letter.toUpperCase()}
                      checked={currentQuestion.correct_answer === letter.toUpperCase()}
                      onChange={(e) =>
                        setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Explanation (optional)
              </label>
              <textarea
                value={currentQuestion.explanation}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                rows={2}
                placeholder="Explain why this answer is correct"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:border-[#0891B2]"
              />
            </div>

            {/* Source Link */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Source Link (optional)
              </label>
              <input
                type="url"
                value={currentQuestion.source_link}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, source_link: e.target.value })}
                placeholder="https://example.com"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:border-[#0891B2]"
              />
            </div>

            {/* Timer */}
            <div>
              <label style={{ color: BRAND_COLORS.navy }} className="block text-sm font-semibold mb-2">
                Timer (seconds)
              </label>
              <input
                type="number"
                value={currentQuestion.timer_seconds}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, timer_seconds: e.target.value })}
                min="10"
                max="300"
                style={{ borderColor: BRAND_COLORS.border }}
                className="w-full px-4 py-2 rounded-lg border bg-white focus:border-[#0891B2]"
              />
            </div>

            {/* Add Question Button */}
            <button
              onClick={handleAddQuestion}
              style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
              className="w-full px-6 py-3 rounded-lg font-semibold hover:opacity-90"
            >
              ✅ Add Question {questions.length + 1}
            </button>
          </div>
        </div>
        )}

        {/* CSV TAB */}
        {activeTab === 'csv' && (
        <div className="mb-8 border rounded-lg p-6 bg-[#F0F7FA]" style={{ borderColor: BRAND_COLORS.border }}>
          <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-4">
            📄 Upload Quiz from CSV
          </h2>
          <p style={{ color: BRAND_COLORS.gray }} className="mb-6 text-sm">
            Upload a CSV file with one question per row. Question numbers are automatically assigned in order.
          </p>

          {/* LOADING STATE */}
          {isParsingCSV && (
            <div style={{ padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: BRAND_COLORS.navy, fontWeight: 'bold' }}>Parsing CSV...</p>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '13px' }}>Processing your file, please wait</p>
            </div>
          )}

          {/* UPLOAD AREA */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center mb-6"
            style={{
              borderColor: BRAND_COLORS.teal,
              opacity: isParsingCSV ? 0.5 : 1,
              pointerEvents: isParsingCSV ? 'none' : 'auto',
            }}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={isParsingCSV}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div style={{ color: BRAND_COLORS.teal }} className="text-4xl mb-2">📁</div>
              <p style={{ color: BRAND_COLORS.navy }} className="font-semibold">
                Click to upload CSV or drag and drop
              </p>
              <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
                CSV file (max 10MB)
              </p>
            </label>
          </div>

          {/* FORMAT GUIDE */}
          <div className="mb-6 p-4 bg-white rounded-lg border" style={{ borderColor: BRAND_COLORS.border }}>
            <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-3">📋 Required Column Headers (First Row):</p>
            <code style={{ color: BRAND_COLORS.teal, backgroundColor: '#F0F7FA', padding: '8px', borderRadius: '4px', display: 'block', overflowX: 'auto' }} className="text-xs mb-4">
              question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link,timer_seconds
            </code>
          </div>

          {/* EXAMPLE DATA ROWS */}
          <div className="mb-6 p-4 bg-white rounded-lg border" style={{ borderColor: BRAND_COLORS.border }}>
            <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-3">📝 Example Data Rows:</p>
            <div style={{ backgroundColor: '#F0F7FA', padding: '12px', borderRadius: '4px', overflowX: 'auto', marginBottom: '8px' }}>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '11px', margin: '0 0 6px 0' }}>Row 1 (Question 1):</p>
              <code style={{ color: BRAND_COLORS.navy, display: 'block', fontSize: '12px', wordBreak: 'break-all' }}>
                What is 2+2?,3,4,5,6,7,B,4 is correct,https://example.com,60
              </code>
            </div>
            <div style={{ backgroundColor: '#F0F7FA', padding: '12px', borderRadius: '4px', overflowX: 'auto', marginBottom: '8px' }}>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '11px', margin: '0 0 6px 0' }}>Row 2 (Question 2):</p>
              <code style={{ color: BRAND_COLORS.navy, display: 'block', fontSize: '12px', wordBreak: 'break-all' }}>
                What is Python?,A programming language,A snake,A movie,A tool,None of above,A,Python is a programming language,https://python.org,60
              </code>
            </div>
            <div style={{ backgroundColor: '#F0F7FA', padding: '12px', borderRadius: '4px', overflowX: 'auto' }}>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '11px', margin: '0 0 6px 0' }}>Row 3 (Question 3):</p>
              <code style={{ color: BRAND_COLORS.navy, display: 'block', fontSize: '12px', wordBreak: 'break-all' }}>
                What does AI stand for?,Automated Input,Artificial Intelligence,Adaptive Interface,Analog Integration,Algorithm Improvement,B,AI means Artificial Intelligence,https://en.wikipedia.org,60
              </code>
            </div>
          </div>

          {/* COLUMN EXPLANATION */}
          <div className="p-4 bg-white rounded-lg border" style={{ borderColor: BRAND_COLORS.border }}>
            <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-3">📌 What Each Column Means:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', fontSize: '13px' }}>
              <div><strong style={{ color: BRAND_COLORS.navy }}>question</strong></div>
              <div style={{ color: BRAND_COLORS.gray }}>The question text (e.g., &quot;What is 2+2?&quot;)</div>

              <div><strong style={{ color: BRAND_COLORS.navy }}>option_a to option_e</strong></div>
              <div style={{ color: BRAND_COLORS.gray }}>The 5 answer choices</div>

              <div><strong style={{ color: BRAND_COLORS.navy }}>correct_answer</strong></div>
              <div style={{ color: BRAND_COLORS.gray }}>Which option is correct (A, B, C, D, or E)</div>

              <div><strong style={{ color: BRAND_COLORS.navy }}>explanation</strong></div>
              <div style={{ color: BRAND_COLORS.gray }}>Why the answer is correct (students see this)</div>

              <div><strong style={{ color: BRAND_COLORS.navy }}>source_link</strong></div>
              <div style={{ color: BRAND_COLORS.gray }}>Reference URL (optional, can be empty)</div>

              <div><strong style={{ color: BRAND_COLORS.navy }}>timer_seconds</strong></div>
              <div style={{ color: BRAND_COLORS.gray }}>Time limit per question (e.g., 60 seconds)</div>
            </div>
          </div>

          {/* NUMBERING EXPLANATION */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border" style={{ borderColor: '#FCD34D' }}>
            <p style={{ color: BRAND_COLORS.navy }} className="text-sm font-semibold mb-2">ℹ️ Question Numbering:</p>
            <p style={{ color: BRAND_COLORS.gray, fontSize: '13px', margin: 0 }}>
              Questions are automatically numbered 1, 2, 3, etc. in the order they appear in your CSV file. You don&apos;t need to add a question number column.
            </p>
          </div>
        </div>
        )}

        {/* AI TAB */}
        {activeTab === 'ai' && (
        <div className="mb-8 border rounded-lg p-6 bg-[#F0F7FA]" style={{ borderColor: BRAND_COLORS.border }}>
          <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-4">
            🤖 Generate Quiz with AI
          </h2>
          <p style={{ color: BRAND_COLORS.gray }} className="mb-6 text-sm">
            Enter a topic or prompt and Claude will generate 5 multiple-choice questions with options and explanations.
          </p>

          {isGenerating && (
            <div style={{ padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>✨</div>
              <p style={{ color: BRAND_COLORS.navy, fontWeight: 'bold' }}>Generating quiz with AI...</p>
              <p style={{ color: BRAND_COLORS.gray, fontSize: '13px' }}>This may take a moment</p>
            </div>
          )}

          <button
            onClick={() => setShowAIModal(true)}
            disabled={isGenerating}
            style={{ backgroundColor: BRAND_COLORS.orange, color: 'white' }}
            className="w-full px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? '✨ Generating...' : '🤖 Generate Questions with AI'}
          </button>
          <p style={{ color: BRAND_COLORS.gray }} className="text-xs mt-4">
            Click the button, enter a topic, and AI will generate 5 questions for your quiz.
          </p>
        </div>
        )}

        {/* Questions List */}
        {questions.length > 0 && (
          <div className="mb-8 border rounded-lg p-6" style={{ borderColor: BRAND_COLORS.border }}>
            <h3 style={{ color: BRAND_COLORS.navy }} className="text-xl font-bold mb-4">
              Questions Added: {questions.length}
            </h3>
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-[#F0F7FA] rounded">
                  <p style={{ color: BRAND_COLORS.navy }}>
                    Q{idx + 1}: {q.question.substring(0, 50)}
                    {q.question.length > 50 ? '...' : ''}
                  </p>
                  <button
                    onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-800 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => router.back()}
            style={{ borderColor: BRAND_COLORS.teal, color: BRAND_COLORS.teal }}
            className="px-6 py-2 border rounded-lg font-semibold hover:bg-opacity-10"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateQuiz}
            disabled={isCreating}
            style={{ backgroundColor: BRAND_COLORS.teal, color: 'white' }}
            className="px-6 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {isCreating ? '⏳ Creating...' : '🎯 Create Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}
