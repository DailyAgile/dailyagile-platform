/**
 * Mock API Layer
 * Used when Backend endpoints are not ready
 * Set NEXT_PUBLIC_USE_MOCK_API=true in .env.local to enable
 */

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAuthApi = {
  async sendMagicLink(email: string) {
    await delay(500);

    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: { message: 'Invalid email address' },
        statusCode: 400
      };
    }

    // Simulate rate limiting (max 3 per hour)
    const storedCount = localStorage.getItem(`ml-attempts-${email}`);
    const count = storedCount ? parseInt(storedCount) + 1 : 1;

    if (count > 3) {
      return {
        success: false,
        error: { message: 'Too many login attempts. Please try again in 1 hour.' },
        statusCode: 429
      };
    }

    localStorage.setItem(`ml-attempts-${email}`, String(count));
    localStorage.setItem(`ml-token-${email}`, `mock_token_${Date.now()}`);

    return {
      success: true,
      message: 'Magic link sent to your email',
      data: { email }
    };
  },

  async verifyToken(token: string) {
    await delay(500);

    if (!token || !token.startsWith('mock_token_')) {
      return {
        success: false,
        error: { message: 'Invalid or expired token' },
        statusCode: 401
      };
    }

    // Mock: extract email from token (in real app, validate server-side)
    const email = localStorage.getItem('last-login-email') || 'student@example.com';

    return {
      success: true,
      data: {
        studentId: `student_${Math.random().toString(36).slice(2, 9)}`,
        email
      }
    };
  },

  async resendCode(email: string) {
    await delay(500);
    return {
      success: true,
      message: 'Code sent to your email',
      data: { email }
    };
  }
};

export const mockQuizApi = {
  async getAssignments(studentId: string) {
    await delay(800);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      success: true,
      data: {
        active: [
          {
            id: 'assign_001',
            assignment_code: 'ABC123',
            quiz_id: 'quiz_001',
            quiz_title: 'JavaScript Basics Quiz',
            expires_at: nextWeek.toISOString(),
            status: 'active',
            is_active: true,
            total_questions: 10,
            total_points: 100
          },
          {
            id: 'assign_002',
            assignment_code: 'DEF456',
            quiz_id: 'quiz_002',
            quiz_title: 'React Fundamentals',
            expires_at: tomorrow.toISOString(),
            status: 'active',
            is_active: true,
            total_questions: 15,
            total_points: 150
          }
        ],
        expired: [
          {
            id: 'assign_003',
            assignment_code: 'GHI789',
            quiz_id: 'quiz_003',
            quiz_title: 'TypeScript Advanced',
            expires_at: yesterday.toISOString(),
            status: 'expired',
            is_active: false,
            total_questions: 20,
            total_points: 200
          }
        ],
        archived: []
      }
    };
  },

  async getQuizInfo(quizId: string) {
    await delay(300);
    return {
      success: true,
      data: {
        id: quizId,
        title: 'Sample Quiz',
        description: 'A mock quiz for testing',
        total_questions: 10,
        total_points: 100
      }
    };
  },

  async startQuiz(code: string) {
    await delay(600);

    if (!code || code.length !== 6) {
      return {
        success: false,
        error: { message: 'Invalid quiz code' },
        statusCode: 404
      };
    }

    const sessionId = `session_${Date.now()}`;
    localStorage.setItem(`quiz_session_${code}`, sessionId);

    return {
      success: true,
      data: {
        sessionId,
        quizId: `quiz_${code}`,
        code,
        title: `Quiz ${code}`,
        total_questions: 5,
        time_limit_minutes: 15
      }
    };
  },

  async getQuizQuestions(sessionId: string) {
    await delay(500);

    return {
      success: true,
      data: {
        questions: [
          {
            id: 'q1',
            index: 0,
            type: 'multiple-choice',
            text: 'What does HTML stand for?',
            options: [
              { id: 'a', text: 'Hyper Text Markup Language' },
              { id: 'b', text: 'High Tech Modern Language' },
              { id: 'c', text: 'Home Tool Markup Language' },
              { id: 'd', text: 'Hyperlinks and Text Markup Language' }
            ],
            correct_answer: 'a',
            explanation: 'HTML stands for Hyper Text Markup Language, the standard markup language for creating web pages.'
          },
          {
            id: 'q2',
            index: 1,
            type: 'multiple-choice',
            text: 'Which is a client-side scripting language?',
            options: [
              { id: 'a', text: 'PHP' },
              { id: 'b', text: 'JavaScript' },
              { id: 'c', text: 'Python' },
              { id: 'd', text: 'Java' }
            ],
            correct_answer: 'b',
            explanation: 'JavaScript is the primary client-side scripting language used in web browsers.'
          },
          {
            id: 'q3',
            index: 2,
            type: 'short-answer',
            text: 'What does CSS stand for?',
            correct_answer: 'cascading style sheets',
            pattern: /^(cascading\s+style\s+sheets|css)$/i,
            maxLength: 100,
            explanation: 'CSS stands for Cascading Style Sheets, used for styling web pages.'
          },
          {
            id: 'q4',
            index: 3,
            type: 'code-challenge',
            text: 'Write a JavaScript function that returns the sum of two numbers.',
            language: 'javascript',
            starterCode: 'function sum(a, b) {\n  // Your code here\n}\n\n// Test: sum(5, 3) should return 8',
            solution: 'function sum(a, b) {\n  return a + b;\n}',
            testCases: [
              { input: [5, 3], expected: 8 },
              { input: [10, 20], expected: 30 },
              { input: [-5, 3], expected: -2 }
            ],
            explanation: 'The function should accept two parameters and return their sum.'
          },
          {
            id: 'q5',
            index: 4,
            type: 'essay',
            text: 'Explain the difference between let, const, and var in JavaScript. What are the key characteristics of each?',
            minLength: 100,
            maxLength: 1000,
            rubric: [
              { criterion: 'Explains var scope and hoisting', weight: 25 },
              { criterion: 'Explains let block scope', weight: 25 },
              { criterion: 'Explains const immutability', weight: 25 },
              { criterion: 'Clarity and correctness', weight: 25 }
            ],
            explanation: 'var has function scope and is hoisted, let has block scope, and const prevents reassignment.'
          }
        ]
      }
    };
  },

  async submitAnswer(sessionId: string, questionIndex: number, selectedAnswer: string) {
    await delay(200);

    return {
      success: true,
      data: {
        saved: true
      }
    };
  },

  async getResults(sessionId: string) {
    await delay(500);

    const correctAnswers = ['a', 'b', 'c', 'c', 'a'];
    const studentAnswers = ['a', 'b', 'd', 'c', 'a']; // Simulated answers

    let score = 0;
    studentAnswers.forEach((answer, idx) => {
      if (answer === correctAnswers[idx]) score++;
    });

    const percentage = Math.round((score / correctAnswers.length) * 100);

    return {
      success: true,
      data: {
        sessionId,
        score,
        total_questions: correctAnswers.length,
        percentage,
        answers: studentAnswers,
        correct_answers: correctAnswers,
        explanations: [
          'Correct! HTML stands for Hyper Text Markup Language.',
          'Correct! JavaScript is the primary client-side scripting language.',
          'Incorrect. The correct answer is C - Styling HTML elements.',
          'Correct! Django is a Python framework.',
          'Correct! API stands for Application Programming Interface.'
        ]
      }
    };
  }
};

// Export conditional API
export const getApi = (endpoint: string) => {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

  if (useMock) {
    if (endpoint.includes('auth')) return mockAuthApi;
    if (endpoint.includes('quiz')) return mockQuizApi;
  }

  return null; // Return null if mock not enabled
};
