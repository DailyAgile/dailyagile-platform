import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const log = createLogger('StudentQuizAPI');

// Mock quiz data for development/testing
const MOCK_QUIZZES: Record<string, any> = {
  'AI101': {
    id: 'AI101',
    quiz_code: 'AI101',
    title: 'Introduction to AI',
    description: 'Learn the fundamentals of artificial intelligence',
    required_pass_score: 70,
    total_questions: 20,
    total_points: 100,
    questions: [
      {
        id: 'q1',
        quiz_id: 'AI101',
        question_number: 1,
        question: 'What does AI stand for?',
        option_a: 'Artificial Intelligence',
        option_b: 'Automated Integration',
        option_c: 'Applied Information',
        option_d: 'Adaptive Inputs',
        correct_answer: 'a',
        explanation: 'AI stands for Artificial Intelligence',
        points: 5,
      },
      {
        id: 'q2',
        quiz_id: 'AI101',
        question_number: 2,
        question: 'Which is a type of machine learning?',
        option_a: 'Supervised Learning',
        option_b: 'Unsupervised Learning',
        option_c: 'Reinforcement Learning',
        option_d: 'All of the above',
        correct_answer: 'd',
        explanation: 'All three are valid types of machine learning',
        points: 5,
      },
    ],
  },
  'ML102': {
    id: 'ML102',
    quiz_code: 'ML102',
    title: 'Machine Learning Basics',
    description: 'Explore ML algorithms and concepts',
    required_pass_score: 70,
    total_questions: 25,
    total_points: 100,
    questions: [
      {
        id: 'q1',
        quiz_id: 'ML102',
        question_number: 1,
        question: 'What is the primary goal of machine learning?',
        option_a: 'To write code',
        option_b: 'To enable systems to learn from data',
        option_c: 'To create artificial humans',
        option_d: 'To replace all programming',
        correct_answer: 'b',
        explanation: 'Machine learning aims to enable systems to learn from data and improve performance',
        points: 5,
      },
    ],
  },
  'PY101': {
    id: 'PY101',
    quiz_code: 'PY101',
    title: 'Python Basics Quiz',
    description: 'Test your Python fundamentals knowledge',
    required_pass_score: 70,
    total_questions: 10,
    total_points: 100,
    questions: [
      {
        id: 'q1',
        quiz_id: 'PY101',
        question_number: 1,
        question: 'What is the correct syntax to create a variable in Python?',
        option_a: 'variable: int = 5',
        option_b: 'variable = 5',
        option_c: 'int variable = 5',
        option_d: 'var variable = 5',
        correct_answer: 'b',
        explanation: 'Python uses simple assignment syntax: variable = value',
        points: 10,
      },
    ],
  },
};

/**
 * GET /api/student/quiz/[quizId]
 *
 * Fetches quiz data by ID or code
 * Handles both UUID quiz IDs and quiz codes (like Q006)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
): Promise<Response> {
  try {
    const { quizId } = await params;

    if (!quizId) {
      return apiError('MISSING_PARAM', 400, 'quizId is required');
    }

    // Check mock data first (for development/testing)
    if (MOCK_QUIZZES[quizId]) {
      const mockQuiz = MOCK_QUIZZES[quizId];
      log.info(`Using mock quiz: ${quizId}`);
      return apiSuccess({
        id: mockQuiz.id,
        quiz_code: mockQuiz.quiz_code,
        title: mockQuiz.title,
        description: mockQuiz.description,
        timeLimit: mockQuiz.required_pass_score,
        passingScore: mockQuiz.required_pass_score,
        totalQuestions: mockQuiz.total_questions,
        totalPoints: mockQuiz.total_points,
        questions: mockQuiz.questions.map((q: any) => {
          const options = [];
          if (q.option_a) options.push({ id: 'a', label: 'A', text: q.option_a });
          if (q.option_b) options.push({ id: 'b', label: 'B', text: q.option_b });
          if (q.option_c) options.push({ id: 'c', label: 'C', text: q.option_c });
          if (q.option_d) options.push({ id: 'd', label: 'D', text: q.option_d });
          if (q.option_e) options.push({ id: 'e', label: 'E', text: q.option_e });

          return {
            id: q.id,
            number: q.question_number,
            type: 'single',
            text: q.question,
            description: null,
            options,
            correctAnswer: q.correct_answer?.toLowerCase(),
            explanation: q.explanation,
            points: q.points,
          };
        }),
      });
    }

    const supabase = getSupabaseClient();

    // Check if quizId looks like a UUID or is a code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId);

    // Fetch quiz metadata
    let quizQuery = supabase.from('quizzes').select('*');
    if (isUuid) {
      quizQuery = quizQuery.eq('id', quizId);
    } else {
      quizQuery = quizQuery.ilike('quiz_code', quizId);
    }

    const { data: quiz, error: quizError } = await quizQuery.single();

    if (quizError || !quiz) {
      log.warn(`Quiz not found: ${quizId}`);
      return apiError('QUIZ_NOT_FOUND', 404, `Quiz "${quizId}" not found`);
    }

    // Fetch questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('question_number', { ascending: true });

    if (questionsError) {
      log.warn(`Failed to fetch questions for quiz ${quiz.id}:`, questionsError);
      return apiError('QUESTIONS_FETCH_FAILED', 500, 'Failed to load quiz questions');
    }

    log.info(`Quiz loaded: ${quiz.id} with ${(questions || []).length} questions`);

    return apiSuccess({
      id: quiz.id,
      quiz_code: quiz.quiz_code,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.required_pass_score,
      passingScore: quiz.required_pass_score,
      totalQuestions: quiz.total_questions,
      totalPoints: quiz.total_points,
      questions: (questions || []).map((q: any) => {
        const options = [];
        if (q.option_a) options.push({ id: 'a', label: 'A', text: q.option_a });
        if (q.option_b) options.push({ id: 'b', label: 'B', text: q.option_b });
        if (q.option_c) options.push({ id: 'c', label: 'C', text: q.option_c });
        if (q.option_d) options.push({ id: 'd', label: 'D', text: q.option_d });
        if (q.option_e) options.push({ id: 'e', label: 'E', text: q.option_e });

        return {
          id: q.id,
          number: q.question_number,
          type: 'single', // default to single choice
          text: q.question,
          description: null,
          options,
          correctAnswer: q.correct_answer?.toLowerCase(),
          explanation: q.explanation,
          points: q.points,
        };
      }),
    });
  } catch (error) {
    log.error('Failed to load quiz:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to load quiz');
  }
}
