'use client';

/**
 * Student Performance Tracking Report
 * Leaderboard-style view with student scores, status, and trends
 */

import React, { useState, useEffect } from 'react';
import { StudentPerformanceData } from '@/lib/analytics/quiz-reports';
import { createLogger } from '@/lib/logger';

const log = createLogger('StudentPerformanceReport');

interface Props {
  classroomId?: string;
}

export function StudentPerformanceReport({ classroomId }: Props) {
  const [students, setStudents] = useState<StudentPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'score' | 'completion' | 'status'>('score');

  useEffect(() => {
    loadStudentData();
  }, [classroomId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/analytics/student-performance');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      log.error('Failed to load student performance:', err);
      setError('Failed to load student performance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: string; color: string }> = {
      excellent: { icon: '✅', color: 'text-green-600' },
      good: { icon: '✅', color: 'text-blue-600' },
      at_risk: { icon: '⚠️', color: 'text-yellow-600' },
      failing: { icon: '🔴', color: 'text-red-600' },
    };
    const badge = badges[status] || badges.good;
    return <span className={badge.color}>{badge.icon}</span>;
  };

  const getTrendIcon = (trend: string) => {
    const icons: Record<string, string> = {
      improving: '↑',
      declining: '↓',
      stable: '→',
    };
    return icons[trend] || '→';
  };

  const sortedStudents = [...students].sort((a, b) => {
    switch (sortKey) {
      case 'completion':
        return b.completionRate - a.completionRate;
      case 'status':
        const statusOrder = { excellent: 0, good: 1, at_risk: 2, failing: 3 };
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      case 'score':
      default:
        return b.averageScore - a.averageScore;
    }
  });

  if (loading) {
    return <div className="text-[#64748B]">Loading student performance data...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (students.length === 0) {
    return (
      <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-6">
        <p className="text-[#64748B]">No student performance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex gap-2">
        {(['score', 'completion', 'status'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              sortKey === key
                ? 'bg-[#0891B2] text-white'
                : 'bg-[#F0F7FA] border border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#E2E8F0]'
            }`}
          >
            {key === 'score' ? 'Sort by Score' : key === 'completion' ? 'Sort by Completion' : 'Sort by Status'}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1E3A5F] text-white">
              <th className="text-left px-4 py-3 font-semibold">Rank</th>
              <th className="text-left px-4 py-3 font-semibold">Student</th>
              <th className="text-center px-4 py-3 font-semibold">Avg Score</th>
              <th className="text-center px-4 py-3 font-semibold">Quizzes</th>
              <th className="text-center px-4 py-3 font-semibold">Completion</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-center px-4 py-3 font-semibold">Trend</th>
              <th className="text-left px-4 py-3 font-semibold">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student, idx) => (
              <tr
                key={student.studentId}
                className={`border-b border-[#E2E8F0] hover:bg-[#F0F7FA] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              >
                <td className="px-4 py-3 text-[#1E3A5F] font-semibold">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-[#1E3A5F]">{student.studentName}</div>
                  <div className="text-xs text-[#64748B]">{student.studentEmail}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-bold text-[#1E3A5F]">{student.averageScore}%</span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-[#64748B]">
                  {student.quizzesCompleted}/{student.quizzesAssigned}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="bg-[#E2E8F0] rounded-full h-2 w-24">
                      <div
                        className="bg-[#0891B2] h-2 rounded-full"
                        style={{ width: `${student.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[#64748B]">{student.completionRate}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{getStatusBadge(student.status)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-lg">{getTrendIcon(student.trend)}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[#64748B]">
                  {student.lastActivityDate || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-[#64748B] text-xs font-medium">Excellent Students</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {students.filter((s) => s.status === 'excellent').length}
          </p>
        </div>
        <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-[#64748B] text-xs font-medium">At Risk</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {students.filter((s) => s.status === 'at_risk').length}
          </p>
        </div>
        <div className="bg-[#F0F7FA] border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-[#64748B] text-xs font-medium">Failing</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {students.filter((s) => s.status === 'failing').length}
          </p>
        </div>
      </div>
    </div>
  );
}
