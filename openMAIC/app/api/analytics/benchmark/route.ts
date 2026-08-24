/**
 * Comparative Benchmark Analytics Endpoint
 * GET /api/analytics/benchmark
 * Returns: BenchmarkData
 * Requires: Instructor authentication + scoped to instructor's cohorts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireInstructor } from '@/lib/server/auth-middleware';
import { getCohortComparison, getTopicPerformance } from '@/lib/analytics/quiz-reports';

export async function GET(req: NextRequest) {
  try {
    // Verify instructor authentication
    const instructor = await requireInstructor(req);

    // Pass instructor ID to ensure data is scoped to their classrooms
    const [cohorts, topics] = await Promise.all([
      getCohortComparison(instructor.id),
      getTopicPerformance(instructor.id),
    ]);
    return NextResponse.json({ cohorts, topics });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmark data' },
      { status: 500 }
    );
  }
}
