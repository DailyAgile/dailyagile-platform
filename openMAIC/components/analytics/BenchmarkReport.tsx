'use client';

/**
 * Comparative Benchmark Report
 * Compare cohorts, topics, and delivery modes
 */

import React, { useState, useEffect } from 'react';
import {
  CohortComparison,
  TopicPerformance,
} from '@/lib/analytics/quiz-reports';
import { createLogger } from '@/lib/logger';

const log = createLogger('BenchmarkReport');

type ReportType = 'cohorts' | 'topics';

export function BenchmarkReport() {
  const [reportType, setReportType] = useState<ReportType>('cohorts');
  const [cohortData, setCohortData] = useState<CohortComparison[]>([]);
  const [topicData, setTopicData] = useState<TopicPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/analytics/benchmark');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      setCohortData(data.cohorts || []);
      setTopicData(data.topics || []);
    } catch (err) {
      log.error('Failed to load benchmark data:', err);
      setError('Failed to load benchmark data');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'text-green-600',
      moderate: 'text-blue-600',
      hard: 'text-orange-600',
      very_hard: 'text-red-600',
    };
    return colors[difficulty] || 'text-[#64748B]';
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex gap-2">
        {(['cohorts', 'topics'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-4 py-2 rounded font-medium ${
              reportType === type
                ? 'bg-[#0891B2] text-white'
                : 'bg-[#F0F7FA] border border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#E2E8F0]'
            }`}
          >
            {type === 'cohorts' ? 'Cohort Comparison' : 'Topic Performance'}
          </button>
        ))}
      </div>

      {loading && <div className="text-[#64748B]">Loading benchmark data...</div>}

      {error && <div className="text-red-600">{error}</div>}

      {/* Cohort Comparison */}
      {reportType === 'cohorts' && (
        <div className="space-y-4">
          {cohortData.length > 0 ? (
            <>
              {/* Summary Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-[#64748B] text-xs font-medium">Total Cohorts</p>
                  <p className="text-2xl font-bold text-[#1E3A5F] mt-1">{cohortData.length}</p>
                </div>
                <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-[#64748B] text-xs font-medium">Avg Score</p>
                  <p className="text-2xl font-bold text-[#1E3A5F] mt-1">
                    {Math.round(cohortData.reduce((sum, c) => sum + c.averageScore, 0) / cohortData.length)}%
                  </p>
                </div>
                <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-[#64748B] text-xs font-medium">Avg Pass Rate</p>
                  <p className="text-2xl font-bold text-[#1E3A5F] mt-1">
                    {Math.round(cohortData.reduce((sum, c) => sum + c.passRate, 0) / cohortData.length)}%
                  </p>
                </div>
                <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-[#64748B] text-xs font-medium">Total Students</p>
                  <p className="text-2xl font-bold text-[#1E3A5F] mt-1">
                    {cohortData.reduce((sum, c) => sum + c.studentCount, 0)}
                  </p>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto bg-white border border-[#E2E8F0] rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1E3A5F] text-white">
                      <th className="text-left px-6 py-3 font-semibold">Cohort</th>
                      <th className="text-center px-6 py-3 font-semibold">Students</th>
                      <th className="text-center px-6 py-3 font-semibold">Completion Rate</th>
                      <th className="text-center px-6 py-3 font-semibold">Avg Score</th>
                      <th className="text-center px-6 py-3 font-semibold">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortData.map((cohort, idx) => (
                      <tr
                        key={cohort.cohortName}
                        className={`border-b border-[#E2E8F0] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-[#1E3A5F]">{cohort.cohortName}</td>
                        <td className="px-6 py-4 text-center text-sm text-[#64748B]">{cohort.studentCount}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="bg-[#E2E8F0] rounded-full h-2 w-16">
                              <div
                                className="bg-[#0891B2] h-2 rounded-full"
                                style={{ width: `${cohort.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[#64748B]">{cohort.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-[#1E3A5F]">{cohort.averageScore}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-[#1E3A5F]">{cohort.passRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-6">
              <p className="text-[#64748B]">No cohort data available</p>
            </div>
          )}
        </div>
      )}

      {/* Topic Performance */}
      {reportType === 'topics' && (
        <div className="space-y-4">
          {topicData.length > 0 ? (
            <>
              {/* Top Performers */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Top Performing Topics</h3>
                <div className="space-y-3">
                  {topicData.slice(0, 3).map((topic, idx) => (
                    <div key={topic.topicName} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-green-900">{idx + 1}. {topic.topicName}</p>
                        <p className="text-xs text-green-700">{topic.totalAttempts} attempts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">{topic.averageScore}%</p>
                        <p className="text-xs text-green-600">{topic.passRate}% pass rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenging Topics */}
              {topicData.length > 3 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Most Challenging Topics</h3>
                  <div className="space-y-3">
                    {topicData.slice(-3).reverse().map((topic, idx) => (
                      <div key={topic.topicName} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-orange-900">{idx + 1}. {topic.topicName}</p>
                          <p className="text-xs text-orange-700">{topic.totalAttempts} attempts</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-700">{topic.averageScore}%</p>
                          <p className={`text-xs ${getDifficultyColor(topic.difficulty)} font-medium`}>
                            {topic.difficulty.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Table */}
              <div className="overflow-x-auto bg-white border border-[#E2E8F0] rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1E3A5F] text-white">
                      <th className="text-left px-6 py-3 font-semibold">Topic</th>
                      <th className="text-center px-6 py-3 font-semibold">Avg Score</th>
                      <th className="text-center px-6 py-3 font-semibold">Pass Rate</th>
                      <th className="text-center px-6 py-3 font-semibold">Attempts</th>
                      <th className="text-center px-6 py-3 font-semibold">Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicData.map((topic, idx) => (
                      <tr
                        key={topic.topicName}
                        className={`border-b border-[#E2E8F0] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-[#1E3A5F]">{topic.topicName}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-[#1E3A5F]">{topic.averageScore}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-[#1E3A5F]">{topic.passRate}%</span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-[#64748B]">{topic.totalAttempts}</td>
                        <td className={`px-6 py-4 text-center font-medium ${getDifficultyColor(topic.difficulty)}`}>
                          {topic.difficulty.replace(/_/g, ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-6">
              <p className="text-[#64748B]">No topic data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
