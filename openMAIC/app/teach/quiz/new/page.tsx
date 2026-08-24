'use client';

/**
 * New Quiz Creation Page
 * Choose how to create a new quiz
 */

import { useRouter } from 'next/navigation';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
};

export default function NewQuizPage() {
  const router = useRouter();

  const handleNavigate = (tab: string) => {
    // Store the tab in localStorage so dashboard can read it
    localStorage.setItem('activeTab', tab);
    // Navigate back to dashboard
    router.push('/teach/dashboard');
  };

  const options = [
    {
      id: 'csv',
      title: '📤 Upload CSV',
      description: 'Create a quiz by uploading a CSV file with questions',
      icon: '📁',
      action: () => handleNavigate('create-csv'),
    },
    {
      id: 'ai',
      title: '🤖 Generate with AI',
      description: 'Let Claude generate questions for your quiz',
      icon: '✨',
      action: () => handleNavigate('create-ai'),
    },
    {
      id: 'manual',
      title: '✍️ Create Manually',
      description: 'Build your quiz question by question',
      icon: '📝',
      action: () => handleNavigate('create-manual'),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div style={{ backgroundColor: BRAND_COLORS.navy }} className="text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-300 hover:text-white mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold">Create New Quiz</h1>
          <p style={{ color: BRAND_COLORS.gray }} className="mt-2">
            Choose how you'd like to create your new quiz
          </p>
        </div>
      </div>

      {/* OPTIONS */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={option.action}
              style={{ borderColor: BRAND_COLORS.border }}
              className="border rounded-lg p-8 text-left hover:shadow-lg transition-all hover:border-opacity-50"
            >
              <div className="text-5xl mb-4">{option.icon}</div>
              <h2 style={{ color: BRAND_COLORS.navy }} className="text-2xl font-bold mb-2">
                {option.title}
              </h2>
              <p style={{ color: BRAND_COLORS.gray }} className="text-sm mb-6">
                {option.description}
              </p>
              <div
                style={{ backgroundColor: BRAND_COLORS.light, color: BRAND_COLORS.teal }}
                className="inline-block px-4 py-2 rounded-lg font-semibold text-sm"
              >
                Get Started →
              </div>
            </button>
          ))}
        </div>

        {/* INFO SECTION */}
        <div
          style={{ backgroundColor: BRAND_COLORS.light, borderColor: BRAND_COLORS.border }}
          className="border rounded-lg p-6 mt-12"
        >
          <h3 style={{ color: BRAND_COLORS.navy }} className="font-bold text-lg mb-3">
            📋 Quiz Format Requirements
          </h3>
          <ul style={{ color: BRAND_COLORS.gray }} className="space-y-2 text-sm">
            <li>✅ Each quiz needs at least 1 question</li>
            <li>✅ Questions must have 5 answer options (A-E)</li>
            <li>✅ Specify the correct answer (A, B, C, D, or E)</li>
            <li>✅ Include an explanation for each question</li>
            <li>✅ Optional: Set timer and point value per question</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
