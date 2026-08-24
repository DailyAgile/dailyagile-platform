/**
 * AI Quiz Grading Service
 *
 * Handles grading for:
 * - Essay questions (with rubric evaluation)
 * - Code challenges (static analysis)
 * - Scenario questions (choice path evaluation)
 *
 * Integrates with Claude AI for intelligent grading
 */

import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import type { LanguageModel } from 'ai';

const log = createLogger('GradingService');

export interface GradingInput {
  questionType: 'essay' | 'code' | 'scenario' | 'short_answer';
  questionText: string;
  studentAnswer: string;
  maxPoints: number;
  rubric?: string;
  codeLanguage?: string;
  starterCode?: string;
  expectedAnswer?: string;
  model?: LanguageModel;
}

export interface GradingResult {
  score: number;
  feedback: string;
  details?: {
    strengths?: string[];
    improvements?: string[];
    correctnessAssessment?: string;
    styleAssessment?: string;
    suggestions?: string[];
  };
}

/**
 * Grade an essay question using Claude AI
 * Evaluates based on provided rubric (if any)
 */
export async function gradeEssay(input: GradingInput): Promise<GradingResult> {
  const { questionText, studentAnswer, maxPoints, rubric, model } = input;

  if (!studentAnswer.trim()) {
    return {
      score: 0,
      feedback: 'No answer provided',
    };
  }

  try {
    const systemPrompt = `You are an expert educational assessor. Grade essays based on the rubric criteria.
Respond in JSON format only:
{
  "score": <0-${maxPoints}>,
  "feedback": "<brief overall feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"]
}`;

    const rubricSection = rubric
      ? `Rubric: ${rubric}\n`
      : '';

    const userPrompt = `Question: ${questionText}

${rubricSection}
Student Answer: ${studentAnswer}

Grade this essay (max ${maxPoints} points) based on accuracy, clarity, and completeness.`;

    const result = await callLLM(
      {
        model: model || 'claude-haiku-4-5-20251001',
        system: systemPrompt,
        prompt: userPrompt,
      },
      'essay-grading',
      { retries: 1 },
      undefined,
    );

    return parseGradingResponse(result.text, maxPoints, 'essay');
  } catch (error) {
    log.error('Essay grading failed:', error);
    throw new Error(`Failed to grade essay: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Review code statically (no execution)
 * Evaluates for correctness, style, and best practices
 */
export async function gradeCode(input: GradingInput): Promise<GradingResult> {
  const { questionText, studentAnswer, maxPoints, codeLanguage = 'javascript', model, starterCode } = input;

  if (!studentAnswer.trim()) {
    return {
      score: 0,
      feedback: 'No code provided',
    };
  }

  try {
    const systemPrompt = `You are an expert code reviewer. Perform STATIC ANALYSIS ONLY - do NOT execute code.
Review for:
1. Correctness (logic, algorithm soundness)
2. Code quality (readability, maintainability)
3. Best practices (naming, comments, structure)
4. Edge cases handling

Respond in JSON format only:
{
  "score": <0-${maxPoints}>,
  "feedback": "<brief overall assessment>",
  "correctnessAssessment": "<assessment of logic and correctness>",
  "styleAssessment": "<assessment of code quality>",
  "suggestions": ["<suggestion1>", "<suggestion2>"]
}`;

    const starterSection = starterCode
      ? `\nStarter Code:\n\`\`\`${codeLanguage}\n${starterCode}\n\`\`\`\n`
      : '';

    const userPrompt = `Challenge: ${questionText}

Language: ${codeLanguage}
${starterSection}
Student Code:
\`\`\`${codeLanguage}
${studentAnswer}
\`\`\`

Perform static analysis and review. Do NOT execute the code.`;

    const result = await callLLM(
      {
        model: model || 'claude-haiku-4-5-20251001',
        system: systemPrompt,
        prompt: userPrompt,
      },
      'code-grading',
      { retries: 1 },
      undefined,
    );

    return parseGradingResponse(result.text, maxPoints, 'code');
  } catch (error) {
    log.error('Code grading failed:', error);
    throw new Error(`Failed to grade code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Evaluate scenario/branching question responses
 * Compares chosen path against optimal path
 */
export async function gradeScenario(input: GradingInput): Promise<GradingResult> {
  const { questionText, studentAnswer, maxPoints, expectedAnswer, model } = input;

  if (!studentAnswer.trim()) {
    return {
      score: 0,
      feedback: 'No answer provided',
    };
  }

  try {
    const systemPrompt = `You are an expert scenario evaluator. Assess scenario responses based on decision quality.
Respond in JSON format only:
{
  "score": <0-${maxPoints}>,
  "feedback": "<brief assessment>",
  "correctnessAssessment": "<why this choice is/isn't optimal>",
  "suggestions": ["<alternative approach>"]
}`;

    const expectedSection = expectedAnswer
      ? `\nOptimal/Expected Path: ${expectedAnswer}\n`
      : '';

    const userPrompt = `Scenario: ${questionText}
${expectedSection}
Student's Choice/Path: ${studentAnswer}

Evaluate how well this choice addresses the scenario (max ${maxPoints} points).`;

    const result = await callLLM(
      {
        model: model || 'claude-haiku-4-5-20251001',
        system: systemPrompt,
        prompt: userPrompt,
      },
      'scenario-grading',
      { retries: 1 },
      undefined,
    );

    return parseGradingResponse(result.text, maxPoints, 'scenario');
  } catch (error) {
    log.error('Scenario grading failed:', error);
    throw new Error(`Failed to grade scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Claude's grading response JSON
 */
function parseGradingResponse(
  text: string,
  maxPoints: number,
  type: 'essay' | 'code' | 'scenario',
): GradingResult {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clamp score
    let score = Math.round(Number(parsed.score) || 0);
    score = Math.max(0, Math.min(maxPoints, score));

    const feedback = String(parsed.feedback || `Graded as ${type} question`);

    return {
      score,
      feedback,
      details: {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : undefined,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : undefined,
        correctnessAssessment: parsed.correctnessAssessment,
        styleAssessment: parsed.styleAssessment,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : undefined,
      },
    };
  } catch (error) {
    log.warn(`Failed to parse grading response (${type}):`, error);
    // Fallback: partial credit
    return {
      score: Math.round(maxPoints * 0.5),
      feedback: `Attempted. Please review against model answer.`,
    };
  }
}

/**
 * Save AI grading result to database
 */
export async function saveGradingResult(
  submissionId: string,
  questionId: string,
  result: GradingResult,
): Promise<void> {
  try {
    const { error } = await getSupabaseClient()
      .from('quiz_answers')
      .update({
        ai_score: result.score,
        ai_feedback: result.feedback,
        ai_graded_at: new Date().toISOString(),
        grading_status: 'ai_graded',
      })
      .eq('submission_id', submissionId)
      .eq('question_id', questionId);

    if (error) {
      log.error(`Failed to save grading result for ${questionId}:`, error);
      throw error;
    }

    log.info(`Saved AI grade for question ${questionId}: ${result.score} points`);
  } catch (error) {
    log.error('Error saving grading result:', error);
    throw error;
  }
}
