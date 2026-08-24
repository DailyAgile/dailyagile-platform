'use client';

/**
 * Manual Quiz Creation
 * Build a quiz question by question, upload CSV, or generate with AI
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
};

export default function ManualCreatePage() {
  const router = useRouter();
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'ai'>('manual');

  const [currentQuestion, setCurrentQuestion] = useState({
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
      alert('Please enter a question');
      return;
    }

    if (
      !currentQuestion.option_a.trim() ||
      !currentQuestion.option_b.trim() ||
      !currentQuestion.option_c.trim() ||
      !currentQuestion.option_d.trim() ||
      !currentQuestion.option_e.trim()
    ) {
      alert('Please fill in all answer options');
      return;
    }

    setQuestions([...questions, currentQuestion]);
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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          alert('❌ CSV must have a header row and at least one question row');
          return;
        }

        const headerValues = parseCSVLine(lines[0]);
        const headers = headerValues.map(h => h.toLowerCase());
        const expectedHeaders = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct_answer', 'explanation', 'source_link', 'timer_seconds'];

        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          alert(`❌ Missing columns: ${missingHeaders.join(', ')}\n\nRequired: ${expectedHeaders.join(', ')}`);
          return;
        }

        // Parse all questions and collect errors
        const successfulQuestions: any[] = [];
        const failedQuestions: Array<{ row: number; error: string }> = [];
        const totalToProcess = lines.length - 1;

        lines.slice(1).forEach((line, idx) => {
          const rowNumber = idx + 2;
          const progressPercent = Math.round(((idx + 1) / totalToProcess) * 100);

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
          alert('❌ No valid questions found in CSV');
        } else if (failedQuestions.length === 0) {
          // Perfect upload - all questions valid
          const message = `🎉 CSV UPLOAD COMPLETE!\n\n` +
            `✅ All ${successfulQuestions.length} question${successfulQuestions.length !== 1 ? 's' : ''} loaded successfully!\n` +
            `📊 Success Rate: 100%\n\n` +
            `📝 Questions Ready:\n` +
            `   • Total: ${successfulQuestions.length}\n` +
            `   • Total Points: ${successfulQuestions.length * 10}\n\n` +
            `🚀 Next Step: Click "🎯 Create Quiz" to finalize`;
          alert(message);
        } else {
          // Partial upload - some questions failed
          const message = `📋 CSV UPLOAD COMPLETE\n\n` +
            `✅ Loaded: ${successfulQuestions.length}/${totalAttempted} questions (${successRate}%)\n\n` +
            `📊 Summary:\n` +
            `   • Successful: ${successfulQuestions.length} ✓\n` +
            `   • Failed: ${failedQuestions.length} ✗\n` +
            `   • Success Rate: ${successRate}%\n\n` +
            `❌ Issues Found:\n\n` +
            `${failedQuestions.map(f => `   • Row ${f.row}: ${f.error}`).join('\n')}\n\n` +
            `💡 Options:\n` +
            `   1️⃣ Click "🎯 Create Quiz" to use ${successfulQuestions.length} loaded questions\n` +
            `   2️⃣ Fix the failed rows and upload again\n` +
            `   3️⃣ Add more questions manually`;
          alert(message);
        }

        event.target.value = '';
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        alert(`❌ Error reading CSV file:\n${errorMsg}`);
      }
    };
    reader.readAsText(file);
  };

  const handleAIGeneration = async () => {
    const topic = prompt('Enter topic or prompt for AI quiz generation (e.g., "Python Basics" or "Write 5 questions about machine learning")');
    if (!topic || !topic.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/instructor/quiz/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count: 5 }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate quiz');
      }

      setQuestions([...questions, ...result.data.questions]);
      alert(`✅ Generated ${result.data.questions.length} questions with AI`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to generate quiz'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setIsCreating(true);

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

      const message = `🎉 QUIZ CREATED SUCCESSFULLY!\n\n` +
        `📌 Quiz Details:\n` +
        `   • Title: ${result.data.title}\n` +
        `   • Quiz Code: ${result.data.quiz_code}\n` +
        `   • Questions: ${result.data.total_questions}\n` +
        `   • Total Points: ${result.data.total_points}\n\n` +
        `🔗 Share These URLs:\n\n` +
        `📚 Practice Mode (Unlimited Attempts):\n` +
        `   ${result.data.shareable_urls.practice}\n\n` +
        `🎮 Game Mode (Live Class):\n` +
        `   ${result.data.shareable_urls.game_mode}\n\n` +
        `📋 Mock Test (Offline Practice):\n` +
        `   ${result.data.shareable_urls.mock_test}\n\n` +
        `💡 Copy any URL above to share with students!\n` +
        `   Or share just the code: ${result.data.quiz_code}`;

      alert(message);
      router.push('/teach/dashboard');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to create quiz'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
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

          {/* UPLOAD AREA */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center mb-6" style={{ borderColor: BRAND_COLORS.teal }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
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
              <div style={{ color: BRAND_COLORS.gray }}>The question text (e.g., "What is 2+2?")</div>

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
              Questions are automatically numbered 1, 2, 3, etc. in the order they appear in your CSV file. You don't need to add a question number column.
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
            Enter a topic and Claude will generate 5 multiple-choice questions with options and explanations.
          </p>
          <button
            onClick={handleAIGeneration}
            disabled={isGenerating}
            style={{ backgroundColor: BRAND_COLORS.orange, color: 'white' }}
            className="w-full px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? '⏳ Generating...' : '🤖 Generate Questions with AI'}
          </button>
          <p style={{ color: BRAND_COLORS.gray }} className="text-xs mt-4">
            Click the button and enter a topic. AI will generate 5 questions for your quiz.
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
