/**
 * Generate Quiz with AI
 * POST /api/instructor/quiz/generate-ai
 * 🚩 Feature Flag: ai_quiz_generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('GenerateAI');

interface GenerateRequest {
  topic: string;
  count?: number;
}

// Demo questions for when API key is not available
const generateDemoQuestions = (topic: string, count: number) => {
  const demoQuestions = [
    {
      question: `What is the primary goal of studying ${topic}?`,
      option_a: 'To pass a test',
      option_b: 'To apply knowledge in practical situations',
      option_c: 'To memorize facts',
      option_d: 'To impress others',
      option_e: 'None of the above',
      correct_answer: 'B',
      explanation: `The primary goal of learning ${topic} is to apply this knowledge to solve real-world problems and challenges.`,
      source_link: '',
      timer_seconds: '60',
    },
    {
      question: `What is a key concept in ${topic}?`,
      option_a: 'Repetition',
      option_b: 'Understanding fundamentals',
      option_c: 'Memorization',
      option_d: 'Speed',
      option_e: 'All of the above',
      correct_answer: 'B',
      explanation: `Understanding the fundamental concepts is crucial for mastery of ${topic}.`,
      source_link: '',
      timer_seconds: '60',
    },
    {
      question: `How can you best improve in ${topic}?`,
      option_a: 'By studying theory alone',
      option_b: 'By practicing regularly',
      option_c: 'By reading books',
      option_d: 'By listening to lectures',
      option_e: 'By watching videos',
      correct_answer: 'B',
      explanation: `Regular practice is one of the most effective ways to improve skills in ${topic}.`,
      source_link: '',
      timer_seconds: '60',
    },
    {
      question: `What role does feedback play in learning ${topic}?`,
      option_a: 'It is not important',
      option_b: 'It helps identify areas for improvement',
      option_c: 'It slows down learning',
      option_d: 'It is only for beginners',
      option_e: 'It confuses the learner',
      correct_answer: 'B',
      explanation: `Feedback is essential in the learning process as it helps learners understand their mistakes and improve.`,
      source_link: '',
      timer_seconds: '60',
    },
    {
      question: `Which approach is most effective for mastering ${topic}?`,
      option_a: 'Passive reading',
      option_b: 'Active learning and problem-solving',
      option_c: 'Memorization only',
      option_d: 'Listening without practice',
      option_e: 'Studying in isolation',
      correct_answer: 'B',
      explanation: `Active learning involving problem-solving and practical application is the most effective way to master ${topic}.`,
      source_link: '',
      timer_seconds: '60',
    },
  ];

  return demoQuestions.slice(0, Math.min(count, demoQuestions.length));
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { topic, count = 5 } = body;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json(
        { error: { message: 'Topic is required' } },
        { status: 400 }
      );
    }

    log.info(`Generating ${count} quiz questions for topic: "${topic}"`);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // If API key is not available, use demo questions
    if (!apiKey) {
      log.warn('ANTHROPIC_API_KEY not configured, using demo questions');
      const demoQuestions = generateDemoQuestions(topic, count);
      return NextResponse.json({
        success: true,
        data: {
          questions: demoQuestions,
          isDemoMode: true,
        },
      });
    }

    // Call Anthropic Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Generate exactly ${count} multiple-choice quiz questions about: ${topic}

For each question, provide:
- A clear question
- 5 answer options (A, B, C, D, E)
- The correct answer (A-E)
- A brief explanation

Format as JSON array:
[
  {
    "question": "Question text?",
    "option_a": "Option A",
    "option_b": "Option B",
    "option_c": "Option C",
    "option_d": "Option D",
    "option_e": "Option E",
    "correct_answer": "A",
    "explanation": "Why A is correct",
    "source_link": "",
    "timer_seconds": "60"
  }
]

Return ONLY the JSON array, no other text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      log.error('Claude API error:', error);
      // Fallback to demo questions on API error
      const demoQuestions = generateDemoQuestions(topic, count);
      return NextResponse.json({
        success: true,
        data: {
          questions: demoQuestions,
          isDemoMode: true,
        },
      });
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI did not generate valid questions');
    }

    // Ensure all questions have required fields
    const validatedQuestions = questions.map((q: any) => ({
      question: q.question || '',
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      option_e: q.option_e || '',
      correct_answer: (q.correct_answer || 'A').toUpperCase(),
      explanation: q.explanation || '',
      source_link: q.source_link || '',
      timer_seconds: q.timer_seconds || '60',
    }));

    log.info(`Successfully generated ${validatedQuestions.length} questions`);

    return NextResponse.json({
      success: true,
      data: {
        questions: validatedQuestions,
      },
    });
  } catch (error) {
    log.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Failed to generate quiz' } },
      { status: 500 }
    );
  }
}
