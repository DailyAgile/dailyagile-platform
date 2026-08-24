'use client';

/**
 * Analytics Dashboard - Report Selector with Generate Button
 * Provides tab-based navigation for 5 professional reports
 */

import React, { useState } from 'react';
import { QuizPerformanceReport } from './QuizPerformanceReport';
import { StudentPerformanceReport } from './StudentPerformanceReport';
import { QuestionItemAnalysisReport } from './QuestionItemAnalysisReport';
import { LearningTrendsReport } from './LearningTrendsReport';
import { BenchmarkReport } from './BenchmarkReport';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  white: '#FFFFFF',
  light: '#F0F7FA',
  border: '#E2E8F0',
  gray: '#64748B',
};

interface ReportTab {
  id: 'performance' | 'students' | 'questions' | 'trends' | 'benchmark';
  label: string;
  emoji: string;
  description: string;
}

const REPORT_TABS: ReportTab[] = [
  {
    id: 'performance',
    label: 'Quiz Performance',
    emoji: '📊',
    description: 'Per-quiz metrics: attempts, scores, pass rate, completion, question difficulty',
  },
  {
    id: 'students',
    label: 'Student Tracking',
    emoji: '👥',
    description: 'Leaderboard with scores, status badges, and performance trends',
  },
  {
    id: 'questions',
    label: 'Question Analysis',
    emoji: '🎯',
    description: 'Per-question difficulty, discrimination, answer distribution, recommendations',
  },
  {
    id: 'trends',
    label: 'Learning Trends',
    emoji: '📈',
    description: 'Week-by-week cohort progression and individual student trend analysis',
  },
  {
    id: 'benchmark',
    label: 'Benchmark',
    emoji: '🏆',
    description: 'Compare cohorts and topics to identify strengths and improvements',
  },
];

interface Props {
  quizzes: Array<{ id: string; title: string; quiz_code: string }>;
  students?: Array<{ id: string; email: string; first_name?: string; last_name?: string }>;
}

export function AnalyticsDashboard({ quizzes, students = [] }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTab['id']>('performance');
  const [generated, setGenerated] = useState<ReportTab['id'][]>([]);

  const currentTab = REPORT_TABS.find((tab) => tab.id === activeTab)!;
  const isGenerated = generated.includes(activeTab);

  const handleGenerateReport = () => {
    // Mark report as generated
    if (!generated.includes(activeTab)) {
      setGenerated((prev) => [...prev, activeTab]);
    }
  };

  const handleTabChange = (tabId: ReportTab['id']) => {
    setActiveTab(tabId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold" style={{ color: BRAND_COLORS.navy }}>
          Analytics Dashboard
        </h2>
        <p style={{ color: BRAND_COLORS.gray }} className="text-sm mt-1">
          Select a report below to view detailed insights
        </p>
      </div>

      {/* Report Tabs */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
        style={{ backgroundColor: BRAND_COLORS.light, padding: '12px', borderRadius: '8px' }}
      >
        {REPORT_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const isReady = generated.includes(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                backgroundColor: isActive ? BRAND_COLORS.teal : BRAND_COLORS.white,
                borderColor: isActive ? BRAND_COLORS.teal : BRAND_COLORS.border,
                borderWidth: '2px',
                borderStyle: 'solid',
                color: isActive ? BRAND_COLORS.white : BRAND_COLORS.navy,
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = BRAND_COLORS.white;
                }
              }}
            >
              <div className="flex items-center gap-2 justify-center">
                <span className="text-lg">{tab.emoji}</span>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">{tab.label}</p>
                  {isReady && (
                    <p className="text-xs" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : BRAND_COLORS.gray }}>
                      ✓ Generated
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Container */}
      <div
        className="border rounded-lg p-8"
        style={{ borderColor: BRAND_COLORS.border, backgroundColor: BRAND_COLORS.white }}
      >
        {/* Report Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{currentTab.emoji}</span>
            <div>
              <h3 className="text-2xl font-bold" style={{ color: BRAND_COLORS.navy }}>
                {currentTab.label}
              </h3>
              <p style={{ color: BRAND_COLORS.gray }} className="text-sm mt-1">
                {currentTab.description}
              </p>
            </div>
          </div>

          <hr style={{ borderColor: BRAND_COLORS.border }} className="my-6" />
        </div>

        {/* Report Content */}
        {!isGenerated && (
          <div className="text-center py-12">
            <p style={{ color: BRAND_COLORS.gray }} className="text-lg mb-6">
              Click "Generate Report" below to analyze {currentTab.label.toLowerCase()}
            </p>
            <button
              onClick={handleGenerateReport}
              style={{
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_COLORS.orange;
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {currentTab.emoji} Generate {currentTab.label}
            </button>
          </div>
        )}

        {/* Report 1: Quiz Performance */}
        {isGenerated && activeTab === 'performance' && (
          <QuizPerformanceReport quizzes={quizzes} />
        )}

        {/* Report 2: Student Performance */}
        {isGenerated && activeTab === 'students' && (
          <StudentPerformanceReport />
        )}

        {/* Report 3: Question Analysis */}
        {isGenerated && activeTab === 'questions' && (
          <QuestionItemAnalysisReport quizzes={quizzes} />
        )}

        {/* Report 4: Learning Trends */}
        {isGenerated && activeTab === 'trends' && (
          <div>
            {quizzes.length > 0 ? (
              <LearningTrendsReport
                students={
                  students.length > 0
                    ? students
                    : [{ id: '1', email: 'sample@example.com', first_name: 'Sample', last_name: 'Student' }]
                }
              />
            ) : (
              <div
                className="rounded-lg p-6 text-center"
                style={{ backgroundColor: BRAND_COLORS.light, borderColor: BRAND_COLORS.border }}
              >
                <p style={{ color: BRAND_COLORS.gray }}>Create quizzes first to view learning trends</p>
              </div>
            )}
          </div>
        )}

        {/* Report 5: Benchmark */}
        {isGenerated && activeTab === 'benchmark' && (
          <div>
            {quizzes.length > 0 ? (
              <BenchmarkReport />
            ) : (
              <div
                className="rounded-lg p-6 text-center"
                style={{ backgroundColor: BRAND_COLORS.light, borderColor: BRAND_COLORS.border }}
              >
                <p style={{ color: BRAND_COLORS.gray }}>Create quizzes first to view benchmark data</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: BRAND_COLORS.light, borderColor: BRAND_COLORS.border, borderWidth: '1px', borderStyle: 'solid' }}
      >
        <p style={{ color: BRAND_COLORS.gray }} className="text-sm">
          <strong>💡 Tip:</strong> Each report can be generated independently. Once generated, click another tab to
          generate a different report. All reports update automatically as students complete quizzes.
        </p>
      </div>
    </div>
  );
}
