'use client';

/**
 * Learning Progression & Trends Report
 * Week-by-week cohort progression and individual student trends
 */

import React, { useState, useEffect } from 'react';
import { LearningProgression, StudentTrend } from '@/lib/analytics/quiz-reports';
import { createLogger } from '@/lib/logger';

const log = createLogger('LearningTrendsReport');

interface Props {
  students: Array<{ id: string; email: string; first_name?: string; last_name?: string }>;
}

export function LearningTrendsReport({ students }: Props) {
  const [progressionData, setProgressionData] = useState<LearningProgression[]>([]);
  const [studentTrendData, setStudentTrendData] = useState<StudentTrend | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgression();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentTrend();
    }
  }, [selectedStudentId]);

  const loadProgression = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/analytics/learning-trends');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProgressionData(data.progressions || []);
    } catch (err) {
      log.error('Failed to load progression:', err);
      setError('Failed to load progression data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentTrend = async () => {
    try {
      const res = await fetch(`/api/analytics/learning-trends?studentId=${selectedStudentId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStudentTrendData(data.studentTrend || null);
    } catch (err) {
      log.error('Failed to load student trend:', err);
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    const colors: Record<string, string> = {
      improving: 'text-green-600',
      declining: 'text-red-600',
      stable: 'text-blue-600',
    };
    return colors[trend];
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    const icons: Record<string, string> = {
      improving: '↑',
      declining: '↓',
      stable: '→',
    };
    return icons[trend];
  };

  return (
    <div className="space-y-6">
      {/* Cohort Learning Curve */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">Cohort Learning Curve</h3>

        {loading ? (
          <p className="text-[#64748B]">Loading progression data...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : progressionData.length > 0 ? (
          <div>
            {/* Chart-like visualization */}
            <div className="space-y-4">
              {progressionData.map((week) => {
                const maxScore = Math.max(...progressionData.map((w) => w.averageScore));
                const barWidth = (week.averageScore / maxScore) * 100;

                return (
                  <div key={week.week}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-sm font-medium text-[#1E3A5F]">Week {week.weekNumber}</p>
                        <p className="text-xs text-[#64748B]">{week.studentCount} students</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#1E3A5F]">{week.averageScore}%</p>
                        <span className={`text-xs ${getTrendColor(week.trend)} font-bold`}>
                          {getTrendIcon(week.trend)} {week.trendPercent > 0 ? '+' : ''}{week.trendPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#E2E8F0] rounded-full h-3">
                      <div
                        className="bg-[#0891B2] h-3 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall assessment */}
            {progressionData.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                <p className="text-sm font-semibold text-[#1E3A5F] mb-2">Overall Assessment</p>
                <p className="text-sm text-[#64748B]">
                  {progressionData.every((w) => w.trend === 'improving' || w.trend === 'stable')
                    ? '✅ Strong cohort progression. Students are learning consistently.'
                    : progressionData.some((w) => w.trend === 'declining')
                      ? '⚠️ Mixed results. Some weeks show declining performance. Consider additional support.'
                      : '→ Stable performance. Monitor engagement levels.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#64748B]">No progression data available</p>
        )}
      </div>

      {/* Individual Student Trends */}
      {students.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">Individual Student Progress</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1E3A5F] mb-2">Select Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg p-2 text-[#1E3A5F] bg-white"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} ({student.email})
                </option>
              ))}
            </select>
          </div>

          {studentTrendData ? (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="bg-[#F0F7FA] rounded-lg p-4">
                <p className="text-sm font-medium text-[#1E3A5F]">{studentTrendData.studentName}</p>
                <p className="text-xs text-[#64748B]">{studentTrendData.studentEmail}</p>
              </div>

              {/* Trend Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-xs text-[#64748B] font-medium">Overall Trend</p>
                  <p className={`text-xl font-bold mt-1 ${getTrendColor(studentTrendData.overallTrend)}`}>
                    {getTrendIcon(studentTrendData.overallTrend)} {studentTrendData.overallTrend}
                  </p>
                </div>
                <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
                  <p className="text-xs text-[#64748B] font-medium">Total Improvement</p>
                  <p
                    className={`text-xl font-bold mt-1 ${
                      studentTrendData.improvementPercent > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {studentTrendData.improvementPercent > 0 ? '+' : ''}
                    {studentTrendData.improvementPercent}%
                  </p>
                </div>
              </div>

              {/* Progression Path */}
              {studentTrendData.progressionPath.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#1E3A5F] mb-3">Weekly Progression</p>
                  <div className="space-y-2">
                    {studentTrendData.progressionPath.map((point) => {
                      const isImproving =
                        point.week > 1 && studentTrendData.progressionPath[point.week - 2]
                          ? point.score >= studentTrendData.progressionPath[point.week - 2].score
                          : true;

                      return (
                        <div key={point.week} className="flex items-center gap-4">
                          <div className="w-16">
                            <span className="text-sm font-medium text-[#1E3A5F]">Week {point.week}</span>
                          </div>
                          <div className="flex-1 bg-[#E2E8F0] rounded-full h-8 flex items-center">
                            <div
                              className="bg-[#0891B2] h-8 rounded-full flex items-center justify-end px-2"
                              style={{ width: `${point.score}%` }}
                            >
                              <span className="text-white text-xs font-bold">{point.score}%</span>
                            </div>
                          </div>
                          <div className="w-12 text-right">
                            {point.week > 1 && (
                              <span className={isImproving ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                {isImproving ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#64748B]">No progression data available for this student</p>
          )}
        </div>
      )}
    </div>
  );
}
