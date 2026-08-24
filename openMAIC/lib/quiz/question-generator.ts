/**
 * AI Question Generation Service
 *
 * Generates quiz questions using Claude AI across multiple types:
 * - Multiple choice (5 options)
 * - Short answer (1-2 sentence model answers)
 * - Essay (with rubric)
 * - Code challenges (with starter code and solution)
 *
 * Ensures variety, meaningful content, no duplicates
 */

import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import type { LanguageModel } from 'ai';

const log = createLogger('QuestionGenerator');

export type QuestionType = 'multiple' | 'short_answer' | 'essay' | 'code';
export type DifficultyLevel = 'easy' | 'intermediate' | 'hard';

export interface QuestionGenerationInput {
  topic: string;
  questionCount: number;
  difficulty: DifficultyLevel;
  questionTypes: QuestionType[];
  quizId?: string;
  model?: LanguageModel;
  language?: string;
}

export interface GeneratedQuestion {
  type: QuestionType;
  text: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string; // For multiple choice (A, B, C, D, E)
  modelAnswer?: string; // For short answer
  rubric?: string; // For essay
  codeLanguage?: string; // For code
  starterCode?: string; // For code
  modelSolution?: string; // For code
  explanation?: string; // Explanation of correct answer
  difficulty: DifficultyLevel;
  points: number;
}

/**
 * Generate quiz questions using Claude AI
 */
export async function generateQuestions(
  input: QuestionGenerationInput,
): Promise<GeneratedQuestion[]> {
  const { topic, questionCount, difficulty, questionTypes, model, language } = input;

  if (questionCount < 1 || questionCount > 50) {
    throw new Error('Question count must be between 1 and 50');
  }

  if (questionTypes.length === 0) {
    throw new Error('At least one question type must be specified');
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      topic,
      questionCount,
      difficulty,
      questionTypes,
      language,
    );

    const result = await callLLM(
      {
        model: model || 'claude-haiku-4-5-20251001',
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 4000,
      },
      'question-generation',
      { retries: 2 },
      undefined,
    );

    const questions = parseQuestionResponse(result.text, questionCount, difficulty);

    if (questions.length === 0) {
      throw new Error('No valid questions generated');
    }

    log.info(
      `Generated ${questions.length}/${questionCount} questions on "${topic}" (${difficulty})`,
    );

    return questions;
  } catch (error) {
    log.error('Question generation failed:', error);
    throw new Error(
      `Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validate generated questions for quality
 */
export function validateQuestions(questions: GeneratedQuestion[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (questions.length === 0) {
    errors.push('No questions provided');
    return { valid: false, errors };
  }

  // Check for duplicates
  const questionTexts = new Set<string>();
  questions.forEach((q, idx) => {
    const normalizedText = q.text.toLowerCase().trim();
    if (questionTexts.has(normalizedText)) {
      errors.push(`Question ${idx + 1} is a duplicate`);
    }
    questionTexts.add(normalizedText);
  });

  // Check each question type
  questions.forEach((q, idx) => {
    const questionNum = idx + 1;

    // Text must exist and be non-empty
    if (!q.text || q.text.trim().length === 0) {
      errors.push(`Question ${questionNum}: Empty text`);
    }

    // Type-specific validation
    if (q.type === 'multiple') {
      if (!q.options || q.options.length !== 5) {
        errors.push(`Question ${questionNum}: Must have exactly 5 options`);
      }
      if (!q.correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(q.correctAnswer)) {
        errors.push(`Question ${questionNum}: Invalid correct answer`);
      }
    } else if (q.type === 'short_answer') {
      if (!q.modelAnswer || q.modelAnswer.trim().length === 0) {
        errors.push(`Question ${questionNum}: Must have a model answer`);
      }
    } else if (q.type === 'essay') {
      if (!q.rubric || q.rubric.trim().length === 0) {
        errors.push(`Question ${questionNum}: Must have a rubric`);
      }
    } else if (q.type === 'code') {
      if (!q.starterCode) {
        errors.push(`Question ${questionNum}: Must have starter code`);
      }
      if (!q.modelSolution) {
        errors.push(`Question ${questionNum}: Must have a model solution`);
      }
    }

    // Points must be positive
    if (!q.points || q.points <= 0) {
      errors.push(`Question ${questionNum}: Invalid points value`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Save generated questions to database
 */
export async function saveGeneratedQuestions(
  quizId: string,
  questions: GeneratedQuestion[],
  generationPrompt?: string,
): Promise<string[]> {
  if (!quizId) {
    throw new Error('quizId is required to save questions');
  }

  try {
    const client = getSupabaseClient();
    const savedIds: string[] = [];

    // Get the current max question number for this quiz
    const { data: existing } = await client
      .from('quiz_questions')
      .select('question_number')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: false })
      .limit(1);

    let nextQuestionNumber = (existing?.[0]?.question_number || 0) + 1;

    for (const question of questions) {
      // Convert question type and build insert payload
      const payload: any = {
        quiz_id: quizId,
        question_number: nextQuestionNumber++,
        question: question.text,
        explanation: question.explanation,
        ai_generated: true,
        generated_at: new Date().toISOString(),
        generation_prompt: generationPrompt,
        points: question.points,
        difficulty: question.difficulty,
        timer_seconds: 60,
      };

      // Handle type-specific fields
      if (question.type === 'multiple' && question.options) {
        payload.option_a = question.options[0] || '';
        payload.option_b = question.options[1] || '';
        payload.option_c = question.options[2] || '';
        payload.option_d = question.options[3] || '';
        payload.option_e = question.options[4] || '';
        payload.correct_answer = question.correctAnswer || 'A';
      } else if (question.type === 'short_answer') {
        payload.model_answer = question.modelAnswer;
        payload.question_type = 'short_answer';
      } else if (question.type === 'essay') {
        payload.rubric = question.rubric;
        payload.question_type = 'essay';
      } else if (question.type === 'code') {
        payload.code_language = question.codeLanguage || 'javascript';
        payload.starter_code = question.starterCode;
        payload.model_solution = question.modelSolution;
        payload.question_type = 'code';
      }

      const { data: inserted, error } = await client
        .from('quiz_questions')
        .insert(payload)
        .select('id')
        .single();

      if (error || !inserted) {
        log.warn(`Failed to save question (${question.type}):`, error);
        continue;
      }

      savedIds.push(inserted.id);
    }

    log.info(`Saved ${savedIds.length}/${questions.length} generated questions to quiz ${quizId}`);
    return savedIds;
  } catch (error) {
    log.error('Error saving generated questions:', error);
    throw error;
  }
}

/**
 * Build system prompt for Claude
 */
function buildSystemPrompt(): string {
  return `You are an expert educational content creator specializing in quiz question generation.
Generate high-quality, varied quiz questions that test deep understanding and critical thinking.

IMPORTANT REQUIREMENTS:
1. Questions must be substantive and meaningful (not generic)
2. Each question type has specific structure (see below)
3. Ensure variety in difficulty levels within each question type
4. Avoid duplicate concepts
5. All responses must be valid JSON arrays

QUESTION TYPE FORMATS:

Multiple Choice (5 options):
{
  "type": "multiple",
  "text": "Question text here",
  "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
  "correctAnswer": "A",
  "explanation": "Why A is correct..."
}

Short Answer:
{
  "type": "short_answer",
  "text": "Question text",
  "modelAnswer": "1-2 sentence answer",
  "explanation": "Additional context"
}

Essay:
{
  "type": "essay",
  "text": "Question text",
  "rubric": "Criteria for grading: Accuracy (40%), Clarity (30%), Examples (30%)",
  "explanation": "Context"
}

Code Challenge:
{
  "type": "code",
  "text": "Challenge description",
  "codeLanguage": "javascript",
  "starterCode": "function solve() {\\n  // TODO: implement\\n}",
  "modelSolution": "function solve() {\\n  return implementation;\\n}",
  "explanation": "What to implement"
}`;
}

/**
 * Build user prompt for Claude
 */
function buildUserPrompt(
  topic: string,
  questionCount: number,
  difficulty: DifficultyLevel,
  questionTypes: QuestionType[],
  language?: string,
): string {
  const typeDistribution = distributeQuestionTypes(questionCount, questionTypes);

  const typeList = Object.entries(typeDistribution)
    .map(([type, count]) => `  - ${type}: ${count} question(s)`)
    .join('\n');

  return `Generate ${questionCount} quiz questions on: "${topic}"

DIFFICULTY LEVEL: ${difficulty} (easy = basic concepts, intermediate = application, hard = analysis/synthesis)

QUESTION TYPE DISTRIBUTION:
${typeList}

INSTRUCTIONS:
1. Generate questions that test different aspects of "${topic}"
2. Difficulty must be ${difficulty} - ensure consistency
3. Each question type has different structure (see system prompt)
4. For multiple choice: make all 5 options plausible
5. For essays: provide clear rubric criteria
6. For code: include starter code and expect a working solution
7. Avoid repetition of concepts
8. Points: 10 for most questions, 15 for harder code/essay
${language ? `9. Generate questions in: ${language}` : ''}

RESPONSE: Return ONLY a valid JSON array of questions. No explanations before/after.
[
  { "type": "multiple", "text": "...", ... },
  { "type": "short_answer", "text": "...", ... },
  ...
]`;
}

/**
 * Distribute question count across types
 */
function distributeQuestionTypes(
  total: number,
  types: QuestionType[],
): Record<QuestionType, number> {
  const distribution: Record<QuestionType, number> = {
    multiple: 0,
    short_answer: 0,
    essay: 0,
    code: 0,
  };

  if (types.length === 0) {
    distribution.multiple = total;
    return distribution;
  }

  // Try to distribute evenly across specified types
  const baseCount = Math.floor(total / types.length);
  const remainder = total % types.length;

  types.forEach((type, idx) => {
    distribution[type] = baseCount + (idx < remainder ? 1 : 0);
  });

  return distribution;
}

/**
 * Parse Claude's question generation response
 */
function parseQuestionResponse(
  text: string,
  expectedCount: number,
  difficulty: DifficultyLevel,
): GeneratedQuestion[] {
  try {
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuestion[];

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    // Validate and normalize each question
    return parsed
      .filter((q): q is GeneratedQuestion => {
        // Basic validation
        if (!q.type || !q.text) return false;
        if (q.type === 'multiple' && (!q.options || q.options.length !== 5)) return false;
        if ((q.type === 'short_answer' || q.type === 'essay') && !q.modelAnswer && !q.rubric) {
          return false;
        }
        if (q.type === 'code' && (!q.starterCode || !q.modelSolution)) return false;
        return true;
      })
      .map((q) => ({
        ...q,
        difficulty: q.difficulty || difficulty,
        points: q.points || (q.type === 'code' ? 15 : 10),
      }))
      .slice(0, expectedCount);
  } catch (error) {
    log.warn('Failed to parse question generation response:', error);
    return [];
  }
}
