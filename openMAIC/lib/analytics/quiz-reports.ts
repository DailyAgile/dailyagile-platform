/**
 * Quiz Analytics Reports Data Layer
 * Comprehensive analytics queries for 5 professional reports:
 * 1. Quiz Performance Summary
 * 2. Student Performance Tracking
 * 3. Question Item Analysis
 * 4. Learning Progression & Trends
 * 5. Comparative Benchmark
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizReports');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface QuizPerformanceMetrics {
  quizId: string;
  quizTitle: string;
  quizCode: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  completionRate: number;
  questionDifficulty: Array<{
    questionId: string;
    questionText: string;
    difficultyPercent: number;
    correctCount: number;
    totalCount: number;
    difficulty: 'too_easy' | 'good' | 'hard';
  }>;
}

export interface StudentPerformanceData {
  studentId: string;
  studentEmail: string;
  studentName: string;
  averageScore: number;
  quizzesCompleted: number;
  quizzesAssigned: number;
  completionRate: number;
  status: 'excellent' | 'good' | 'at_risk' | 'failing';
  trend: 'improving' | 'declining' | 'stable';
  weakestQuiz?: string;
  lastActivityDate?: string;
}

export interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  difficultyIndex: number; // 0-100
  discriminationIndex: number; // -1 to 1
  answerDistribution: Array<{
    option: string;
    percentage: number;
    count: number;
    isCorrect: boolean;
  }>;
  recommendation: 'well_designed' | 'needs_revision' | 'ambiguous' | 'too_easy' | 'too_hard';
}

export interface LearningProgression {
  week: string;
  weekNumber: number;
  averageScore: number;
  studentCount: number;
  trend: 'improving' | 'declining' | 'stable';
  trendPercent: number;
}

export interface StudentTrend {
  studentId: string;
  studentEmail: string;
  studentName: string;
  progressionPath: Array<{
    week: number;
    score: number;
  }>;
  overallTrend: 'improving' | 'declining' | 'stable';
  improvementPercent: number;
}

export interface CohortComparison {
  cohortName: string;
  completionRate: number;
  averageScore: number;
  passRate: number;
  studentCount: number;
}

export interface TopicPerformance {
  topicName: string;
  averageScore: number;
  passRate: number;
  quizCount: number;
  totalAttempts: number;
  difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard';
}

export interface DeliveryModeComparison {
  deliveryMode: 'live_ilt' | 'self_paced' | 'hybrid';
  averageScore: number;
  completionRate: number;
  passRate: number;
  studentCount: number;
}

// ============================================================================
// REPORT 1: QUIZ PERFORMANCE SUMMARY
// ============================================================================

export async function getQuizPerformanceSummary(quizId: string): Promise<QuizPerformanceMetrics | null> {
  try {
    const supabase = getSupabaseClient();

    // Get quiz info
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, quiz_code, total_points')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      log.error('Quiz not found:', quizId);
      return null;
    }

    // Get all quiz sessions (attempts)
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, score, percentage, status')
      .eq('quiz_id', quizId);

    if (sessionsError) {
      log.error('Failed to fetch sessions:', sessionsError);
      return null;
    }

    const totalAttempts = sessions?.length || 0;
    const completedSessions = sessions?.filter((s: any) => s.status === 'completed') || [];
    const completedCount = completedSessions.length;

    // Calculate average score
    const averageScore = completedCount > 0
      ? Math.round(
          completedSessions.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / completedCount
        )
      : 0;

    // Calculate pass rate (assuming 70% is passing)
    const passRate = completedCount > 0
      ? Math.round(
          (completedSessions.filter((s: any) => (s.percentage || 0) >= 70).length / completedCount) * 100
        )
      : 0;

    // Calculate completion rate
    const completionRate = totalAttempts > 0
      ? Math.round((completedCount / totalAttempts) * 100)
      : 0;

    // Get all questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, points')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError) {
      log.error('Failed to fetch questions:', questionsError);
    }

    const questionDifficulty: Array<{
      questionId: string;
      questionText: string;
      difficultyPercent: number;
      correctCount: number;
      totalCount: number;
      difficulty: 'too_easy' | 'good' | 'hard';
    }> = [];

    if (questions && questions.length > 0) {
      const questionIds = questions.map((q: { id: string; question: string; correct_answer: string }) => q.id);

      // BATCH QUERY: Fetch all responses for all questions in ONE query
      const { data: allResponses, error: responsesError } = await supabase
        .from('quiz_responses')
        .select('question_id, is_correct')
        .in('question_id', questionIds);

      if (!responsesError && allResponses) {
        // Group responses by question in-memory
        const responsesByQuestion = new Map<string, any[]>();
        allResponses.forEach((response: any) => {
          if (!responsesByQuestion.has(response.question_id)) {
            responsesByQuestion.set(response.question_id, []);
          }
          responsesByQuestion.get(response.question_id)?.push(response);
        });

        // Process each question using pre-fetched responses
        questions.forEach((question: { id: string; question: string; points?: number }) => {
          const responses = responsesByQuestion.get(question.id) || [];
          const totalResponses = responses.length;
          const correctResponses = responses.filter((r: any) => r.is_correct).length;
          const difficultyPercent = totalResponses > 0
            ? Math.round((correctResponses / totalResponses) * 100)
            : 0;

          let difficulty: 'too_easy' | 'good' | 'hard' = 'good';
          if (difficultyPercent >= 85) difficulty = 'too_easy';
          else if (difficultyPercent <= 40) difficulty = 'hard';

          questionDifficulty.push({
            questionId: question.id,
            questionText: question.question,
            difficultyPercent,
            correctCount: correctResponses,
            totalCount: totalResponses,
            difficulty,
          });
        });
      }
    }

    return {
      quizId,
      quizTitle: quiz.title,
      quizCode: quiz.quiz_code,
      totalAttempts,
      averageScore,
      passRate,
      completionRate,
      questionDifficulty,
    };
  } catch (error) {
    log.error('Error in getQuizPerformanceSummary:', error);
    return null;
  }
}

// ============================================================================
// REPORT 2: STUDENT PERFORMANCE TRACKING
// ============================================================================

export async function getStudentPerformanceTracking(classroomId?: string): Promise<StudentPerformanceData[]> {
  try {
    const supabase = getSupabaseClient();

    // Get students, filtered by classroom if provided
    let studentsData: any[] = [];

    if (classroomId) {
      // Get students enrolled in this specific classroom
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('classroom_enrollments')
        .select('student_id')
        .eq('classroom_id', classroomId);

      if (enrollmentsError) {
        log.error('Failed to fetch classroom enrollments:', enrollmentsError);
        return [];
      }

      if (!enrollments || enrollments.length === 0) {
        return [];
      }

      const studentIds = enrollments.map((e: any) => e.student_id);

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, email, first_name, last_name')
        .in('id', studentIds);

      if (studentsError) {
        log.error('Failed to fetch students:', studentsError);
        return [];
      }

      studentsData = students || [];
    } else {
      // Get all students (instructor scope)
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, email, first_name, last_name');

      if (studentsError) {
        log.error('Failed to fetch students:', studentsError);
        return [];
      }

      studentsData = students || [];
    }

    const students = studentsData;
    if (!students || students.length === 0) {
      return [];
    }

    const studentIds = students.map((s) => s.id);

    // BATCH QUERY 1: Fetch all sessions for all students in ONE query
    const { data: allSessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, student_id, percentage, status, created_at, quiz_id')
      .in('student_id', studentIds);

    if (sessionsError) {
      log.error('Failed to fetch sessions:', sessionsError);
      return [];
    }

    // BATCH QUERY 2: Fetch all assignments for all students in ONE query
    const { data: allAssignments, error: assignmentsError } = await supabase
      .from('quiz_assignments')
      .select('student_id, id')
      .in('student_id', studentIds);

    if (assignmentsError) {
      log.warn('Failed to fetch assignments:', assignmentsError);
    }

    // BATCH QUERY 3: Fetch quiz titles for weakest quiz lookup
    const quizIds = [...new Set((allSessions || []).map((s: any) => s.quiz_id).filter(Boolean))];
    const quizMap = new Map<string, string>();
    if (quizIds.length > 0) {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title')
        .in('id', quizIds);

      quizzes?.forEach((q: any) => {
        quizMap.set(q.id, q.title);
      });
    }

    // Group data in-memory by student
    const sessionsByStudent = new Map<string, any[]>();
    const assignmentsByStudent = new Map<string, any[]>();

    allSessions?.forEach((session: any) => {
      if (!sessionsByStudent.has(session.student_id)) {
        sessionsByStudent.set(session.student_id, []);
      }
      sessionsByStudent.get(session.student_id)?.push(session);
    });

    allAssignments?.forEach((assignment: any) => {
      if (!assignmentsByStudent.has(assignment.student_id)) {
        assignmentsByStudent.set(assignment.student_id, []);
      }
      assignmentsByStudent.get(assignment.student_id)?.push(assignment);
    });

    // Sort sessions by created_at for each student (descending)
    sessionsByStudent.forEach((sessions) => {
      sessions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    const studentPerformance: StudentPerformanceData[] = [];

    // Process each student using pre-fetched data
    for (const student of students) {
      const sessions = sessionsByStudent.get(student.id) || [];
      const completedSessions = sessions.filter((s: any) => s.status === 'completed');
      const completedCount = completedSessions.length;

      if (completedCount === 0) continue; // Skip students with no attempts

      // Calculate average score
      const averageScore = Math.round(
        completedSessions.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / completedCount
      );

      // Get assigned count
      const assignments = assignmentsByStudent.get(student.id) || [];
      const assignedCount = assignments.length || completedCount;

      // Status badge
      let status: 'excellent' | 'good' | 'at_risk' | 'failing' = 'good';
      if (averageScore >= 85) status = 'excellent';
      else if (averageScore < 70 && averageScore >= 50) status = 'at_risk';
      else if (averageScore < 50) status = 'failing';

      // Trend calculation (compare first 3 vs last 3 attempts)
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (completedCount >= 3) {
        const firstThree = completedSessions.slice(-3);
        const lastThree = completedSessions.slice(0, 3);
        const firstAvg = firstThree.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / firstThree.length;
        const lastAvg = lastThree.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / lastThree.length;
        if (lastAvg > firstAvg + 5) trend = 'improving';
        else if (lastAvg < firstAvg - 5) trend = 'declining';
      }

      // Find weakest quiz (lowest score)
      let weakestQuiz: string | undefined;
      if (completedSessions.length > 0) {
        const weakestSession = completedSessions.reduce((min: any, s: any) =>
          (s.percentage || 0) < (min.percentage || 0) ? s : min
        );
        weakestQuiz = weakestSession.quiz_id ? quizMap.get(weakestSession.quiz_id) : undefined;
      }

      // Last activity date
      const lastActivityDate = completedSessions[0]?.created_at
        ? new Date(completedSessions[0].created_at).toISOString().split('T')[0]
        : undefined;

      studentPerformance.push({
        studentId: student.id,
        studentEmail: student.email,
        studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
        averageScore,
        quizzesCompleted: completedCount,
        quizzesAssigned: assignedCount,
        completionRate: assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0,
        status,
        trend,
        weakestQuiz,
        lastActivityDate,
      });
    }

    // Sort by average score descending
    return studentPerformance.sort((a, b) => b.averageScore - a.averageScore);
  } catch (error) {
    log.error('Error in getStudentPerformanceTracking:', error);
    return [];
  }
}

// ============================================================================
// REPORT 3: QUESTION ITEM ANALYSIS
// ============================================================================

export async function getQuestionItemAnalysis(quizId: string): Promise<QuestionAnalysis[]> {
  try {
    const supabase = getSupabaseClient();

    // Get all questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, correct_answer')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError || !questions) {
      log.error('Failed to fetch questions:', questionsError);
      return [];
    }

    if (questions.length === 0) {
      return [];
    }

    const questionIds = questions.map((q: { id: string; question: string; correct_answer: string }) => q.id);

    // BATCH QUERY 1: Fetch all responses for all questions in ONE query
    const { data: allResponses, error: responsesError } = await supabase
      .from('quiz_responses')
      .select('question_id, session_id, selected_answer, is_correct')
      .in('question_id', questionIds);

    if (responsesError) {
      log.error('Failed to fetch responses:', responsesError);
      return [];
    }

    // BATCH QUERY 2: Fetch all sessions for the quiz ONCE
    const { data: allSessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, percentage')
      .eq('quiz_id', quizId)
      .eq('status', 'completed')
      .order('percentage', { ascending: false });

    if (sessionsError) {
      log.error('Failed to fetch sessions:', sessionsError);
      return [];
    }

    // Pre-calculate top/bottom session IDs once
    const topCount = allSessions && allSessions.length >= 4 ? Math.ceil(allSessions.length * 0.25) : 0;
    const topSessionIds = allSessions?.slice(0, topCount).map((s: any) => s.id) || [];
    const bottomSessionIds = allSessions?.slice(-topCount).map((s: any) => s.id) || [];

    // BATCH QUERY 3 & 4: Fetch top and bottom responses for ALL questions in TWO queries
    const { data: topResponsesData } = await supabase
      .from('quiz_responses')
      .select('question_id, is_correct')
      .in('question_id', questionIds)
      .in('session_id', topSessionIds);

    const { data: bottomResponsesData } = await supabase
      .from('quiz_responses')
      .select('question_id, is_correct')
      .in('question_id', questionIds)
      .in('session_id', bottomSessionIds);

    // Group all responses in-memory by question
    const responsesByQuestion = new Map<string, any[]>();
    const topResponsesByQuestion = new Map<string, any[]>();
    const bottomResponsesByQuestion = new Map<string, any[]>();

    allResponses?.forEach((response: any) => {
      if (!responsesByQuestion.has(response.question_id)) {
        responsesByQuestion.set(response.question_id, []);
      }
      responsesByQuestion.get(response.question_id)?.push(response);
    });

    topResponsesData?.forEach((response: any) => {
      if (!topResponsesByQuestion.has(response.question_id)) {
        topResponsesByQuestion.set(response.question_id, []);
      }
      topResponsesByQuestion.get(response.question_id)?.push(response);
    });

    bottomResponsesData?.forEach((response: any) => {
      if (!bottomResponsesByQuestion.has(response.question_id)) {
        bottomResponsesByQuestion.set(response.question_id, []);
      }
      bottomResponsesByQuestion.get(response.question_id)?.push(response);
    });

    const analysis: QuestionAnalysis[] = [];

    // Process each question using pre-fetched data
    for (const question of questions) {
      const responses = responsesByQuestion.get(question.id) || [];
      const totalResponses = responses.length;

      if (totalResponses === 0) continue;

      // Calculate difficulty (% who got it correct)
      const correctCount = responses.filter((r: any) => r.is_correct).length;
      const difficultyIndex = Math.round((correctCount / totalResponses) * 100);

      // Calculate answer distribution
      const answerCounts: Record<string, number> = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
      };

      responses.forEach((r: any) => {
        if (r.selected_answer && answerCounts[r.selected_answer] !== undefined) {
          answerCounts[r.selected_answer]++;
        }
      });

      const answerDistribution = Object.entries(answerCounts).map(([option, count]) => ({
        option,
        percentage: Math.round((count / totalResponses) * 100),
        count,
        isCorrect: option === question.correct_answer,
      }));

      // Calculate discrimination index (how well it separates strong from weak students)
      let discriminationIndex = 0;
      if (topCount > 0) {
        const topResponses = topResponsesByQuestion.get(question.id) || [];
        const bottomResponses = bottomResponsesByQuestion.get(question.id) || [];

        const topCorrect = topResponses.filter((r: any) => r.is_correct).length;
        const bottomCorrect = bottomResponses.filter((r: any) => r.is_correct).length;

        discriminationIndex =
          (topCorrect / (topCount || 1)) - (bottomCorrect / (bottomSessionIds.length || 1));
      }

      // Recommendation based on difficulty and discrimination
      let recommendation: 'well_designed' | 'needs_revision' | 'ambiguous' | 'too_easy' | 'too_hard' =
        'well_designed';
      if (difficultyIndex >= 85) recommendation = 'too_easy';
      else if (difficultyIndex <= 35) recommendation = 'too_hard';
      else if (discriminationIndex < 0.2) recommendation = 'ambiguous';
      else if (answerDistribution.filter((a) => a.percentage > 25).length > 3) recommendation = 'needs_revision';

      analysis.push({
        questionId: question.id,
        questionText: question.question,
        difficultyIndex,
        discriminationIndex,
        answerDistribution,
        recommendation,
      });
    }

    return analysis;
  } catch (error) {
    log.error('Error in getQuestionItemAnalysis:', error);
    return [];
  }
}

// ============================================================================
// REPORT 4: LEARNING PROGRESSION & TRENDS
// ============================================================================

export async function getLearningProgression(instructorId?: string): Promise<LearningProgression[]> {
  try {
    const supabase = getSupabaseClient();

    let sessionsData: any[] = [];

    if (instructorId) {
      // Get all classrooms for this instructor
      const { data: classrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('id')
        .eq('instructor_id', instructorId);

      if (classroomsError) {
        log.error('Failed to fetch instructor classrooms:', classroomsError);
        return [];
      }

      if (!classrooms || classrooms.length === 0) {
        return [];
      }

      const classroomIds = classrooms.map((c: any) => c.id);

      // Get students enrolled in these classrooms
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('classroom_enrollments')
        .select('student_id')
        .in('classroom_id', classroomIds);

      if (enrollmentsError) {
        log.error('Failed to fetch enrollments:', enrollmentsError);
        return [];
      }

      if (!enrollments || enrollments.length === 0) {
        return [];
      }

      const studentIds = enrollments.map((e: any) => e.student_id);

      // Get sessions only for these students
      const { data: sessions, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select('id, percentage, created_at, student_id')
        .eq('status', 'completed')
        .in('student_id', studentIds);

      if (sessionsError) {
        log.error('Failed to fetch sessions:', sessionsError);
        return [];
      }

      sessionsData = sessions || [];
    } else {
      // Get all completed quiz sessions (backward compatibility)
      const { data: sessions, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select('id, percentage, created_at, student_id')
        .eq('status', 'completed');

      if (sessionsError) {
        log.error('Failed to fetch sessions:', sessionsError);
        return [];
      }

      sessionsData = sessions || [];
    }

    // Group by week
    const weekMap = new Map<string, Array<{ percentage: number; studentId: string }>>();

    sessionsData?.forEach((session: any) => {
      const date = new Date(session.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)?.push({
        percentage: session.percentage || 0,
        studentId: session.student_id,
      });
    });

    // Calculate statistics per week
    const progression: LearningProgression[] = [];
    let previousWeekAvg = 0;

    Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach((entry, index) => {
        const [weekStart, data] = entry;
        const uniqueStudents = new Set(data.map((d) => d.studentId)).size;
        const averageScore = Math.round(
          data.reduce((sum, d) => sum + d.percentage, 0) / (data.length || 1)
        );

        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        let trendPercent = 0;
        if (previousWeekAvg > 0) {
          trendPercent = averageScore - previousWeekAvg;
          if (trendPercent > 2) trend = 'improving';
          else if (trendPercent < -2) trend = 'declining';
        }

        progression.push({
          week: weekStart,
          weekNumber: index + 1,
          averageScore,
          studentCount: uniqueStudents,
          trend,
          trendPercent,
        });

        previousWeekAvg = averageScore;
      });

    return progression;
  } catch (error) {
    log.error('Error in getLearningProgression:', error);
    return [];
  }
}

export async function getStudentTrends(studentId: string): Promise<StudentTrend | null> {
  try {
    const supabase = getSupabaseClient();

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, email, first_name, last_name')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      log.error('Student not found:', studentId);
      return null;
    }

    // Get all completed quiz sessions, grouped by week
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, percentage, created_at')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (sessionsError) {
      log.error('Failed to fetch student sessions:', sessionsError);
      return null;
    }

    if (!sessions || sessions.length === 0) {
      return null;
    }

    // Group by week
    const weekMap = new Map<string, number[]>();
    sessions.forEach((session: any) => {
      const date = new Date(session.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)?.push(session.percentage || 0);
    });

    // Calculate weekly averages
    const progressionPath = Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, scores], index) => ({
        week: index + 1,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }));

    // Determine overall trend
    let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
    let improvementPercent = 0;

    if (progressionPath.length >= 2) {
      const firstScore = progressionPath[0].score;
      const lastScore = progressionPath[progressionPath.length - 1].score;
      improvementPercent = lastScore - firstScore;

      if (improvementPercent > 5) overallTrend = 'improving';
      else if (improvementPercent < -5) overallTrend = 'declining';
    }

    return {
      studentId,
      studentEmail: student.email,
      studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
      progressionPath,
      overallTrend,
      improvementPercent,
    };
  } catch (error) {
    log.error('Error in getStudentTrends:', error);
    return null;
  }
}

// ============================================================================
// REPORT 5: COMPARATIVE BENCHMARK
// ============================================================================

export async function getCohortComparison(instructorId?: string): Promise<CohortComparison[]> {
  try {
    const supabase = getSupabaseClient();

    // Get classrooms for this instructor only
    let query = supabase.from('classrooms').select('id, name');

    if (instructorId) {
      query = query.eq('instructor_id', instructorId);
    }

    const { data: classroomData, error: classroomsError } = await query;

    if (classroomsError || !classroomData || classroomData.length === 0) {
      log.error('Failed to fetch classrooms:', classroomsError);
      return [];
    }

    const classroomIds = classroomData.map((c: any) => c.id);

    // Get all enrollments for all classrooms in ONE query
    const { data: allEnrollments, error: enrollmentsError } = await supabase
      .from('student_rosters')
      .select('classroom_id, student_id')
      .in('classroom_id', classroomIds);

    if (enrollmentsError) {
      log.error('Failed to fetch enrollments:', enrollmentsError);
      return [];
    }

    const studentIds = [...new Set((allEnrollments || []).map((e: any) => e.student_id))];
    if (studentIds.length === 0) return [];

    // Get all quiz sessions for all students in ONE query
    const { data: allSessions } = await supabase
      .from('quiz_sessions')
      .select('student_id, percentage, status')
      .in('student_id', studentIds)
      .eq('status', 'completed');

    // Process data in memory (no more database queries)
    const cohorts: CohortComparison[] = classroomData.map((classroom: any) => {
      const classroomStudents = allEnrollments?.filter((e: any) => e.classroom_id === classroom.id).map((e: any) => e.student_id) || [];
      const classroomSessions = allSessions?.filter((s: any) => classroomStudents.includes(s.student_id)) || [];

      if (classroomSessions.length === 0) {
        return null;
      }

      const averageScore = Math.round(
        classroomSessions.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / classroomSessions.length
      );
      const passRate = Math.round(
        (classroomSessions.filter((s: any) => (s.percentage || 0) >= 70).length / classroomSessions.length) * 100
      );

      return {
        cohortName: classroom.name,
        completionRate: 100,
        averageScore,
        passRate,
        studentCount: classroomStudents.length,
      };
    }).filter((c: any) => c !== null);

    return cohorts.sort((a, b) => b.averageScore - a.averageScore);
  } catch (error) {
    log.error('Error in getCohortComparison:', error);
    return [];
  }
}

export async function getTopicPerformance(instructorId?: string): Promise<TopicPerformance[]> {
  try {
    const supabase = getSupabaseClient();

    // Get quizzes for this instructor only
    let query = supabase.from('quizzes').select('id, title, difficulty_level');

    if (instructorId) {
      query = query.eq('instructor_id', instructorId);
    }

    const { data: quizzes, error: quizzesError } = await query;

    if (quizzesError || !quizzes || quizzes.length === 0) {
      log.error('Failed to fetch quizzes:', quizzesError);
      return [];
    }

    const quizIds = quizzes.map((q: any) => q.id);

    // Get ALL quiz sessions for ALL quizzes in ONE query
    const { data: allSessions } = await supabase
      .from('quiz_sessions')
      .select('quiz_id, percentage, status')
      .in('quiz_id', quizIds);

    // Process in memory (no more database queries per quiz)
    const topics: TopicPerformance[] = quizzes
      .map((quiz: any) => {
        const quizSessions = allSessions?.filter((s: any) => s.quiz_id === quiz.id) || [];
        const completedSessions = quizSessions.filter((s: any) => s.status === 'completed');

        if (completedSessions.length === 0) return null;

        const averageScore = Math.round(
          completedSessions.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / completedSessions.length
        );

        const passRate = Math.round(
          (completedSessions.filter((s: any) => (s.percentage || 0) >= 70).length / completedSessions.length) * 100
        );

        let difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard' = 'moderate';
        if (averageScore >= 80) difficulty = 'easy';
        else if (averageScore >= 60) difficulty = 'moderate';
        else if (averageScore >= 40) difficulty = 'hard';
        else difficulty = 'very_hard';

        return {
          topicName: quiz.title,
          averageScore,
          passRate,
          quizCount: 1,
          totalAttempts: completedSessions.length,
          difficulty,
        };
      })
      .filter((t: any) => t !== null);

    return topics.sort((a, b) => b.averageScore - a.averageScore);
  } catch (error) {
    log.error('Error in getTopicPerformance:', error);
    return [];
  }
}

export async function getDeliveryModeComparison(): Promise<DeliveryModeComparison[]> {
  // Note: This requires additional data fields to distinguish delivery modes
  // For now, returning a placeholder structure
  return [
    {
      deliveryMode: 'self_paced',
      averageScore: 0,
      completionRate: 0,
      passRate: 0,
      studentCount: 0,
    },
  ];
}
