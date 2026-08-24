/**
 * Quiz Question Generation API
 *
 * POST /api/quiz/generate-questions
 *
 * Generates quiz questions using Claude AI
 * Instructor can then review and edit before publishing
 *
 * Input:
 * {
 *   "topic": "Neural Networks",
 *   "questionCount": 10,
 *   "difficulty": "intermediate",
 *   "questionTypes": ["multiple", "short_answer", "essay", "code"],
 *   "quizId": "optional-uuid" // If provided, saves to this quiz
 * }
 *
 * Output:
 * {
 *   "questions": [...],
 *   "count": 10,
 *   "savedIds": ["id1", "id2", ...] // If quizId was provided
 * }
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { verifyAndExtractUserId } from '@/lib/server/jwt-utils';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import {
  generateQuestions,
  validateQuestions,
  saveGeneratedQuestions,
  type QuestionGenerationInput,
  type GeneratedQuestion,
} from '@/lib/quiz/question-generator';

const log = createLogger('QuestionGeneration');

// Rate limiting: store request counts per instructor
const generationLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

interface GenerateQuestionsRequest {
  topic: string;
  questionCount: number;
  difficulty: 'easy' | 'intermediate' | 'hard';
  questionTypes: ('multiple' | 'short_answer' | 'essay' | 'code')[];
  quizId?: string;
  language?: string;
}

interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  count: number;
  validationErrors?: string[];
  savedIds?: string[];
  message?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateQuestionsRequest;
    const { topic, questionCount, difficulty, questionTypes, quizId, language } = body;

    // Validate input
    if (!topic || topic.trim().length === 0) {
      return apiError('INVALID_REQUEST', 400, 'topic is required');
    }

    if (!questionCount || questionCount < 1 || questionCount > 50) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'questionCount must be between 1 and 50',
      );
    }

    if (!difficulty || !['easy', 'intermediate', 'hard'].includes(difficulty)) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'difficulty must be one of: easy, intermediate, hard',
      );
    }

    if (!questionTypes || questionTypes.length === 0) {
      return apiError('INVALID_REQUEST', 400, 'At least one questionType must be specified');
    }

    // Verify authentication and get instructor ID
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return apiError('MISSING_REQUIRED_FIELD', 401, 'Authorization header required');
    }

    const instructorId = await verifyAndExtractUserId(authHeader);
    if (!instructorId) {
      return apiError('INVALID_REQUEST', 401, 'Invalid authorization token');
    }

    // Apply rate limiting
    const rateLimitKey = instructorId;
    const now = Date.now();
    const existing = generationLimitMap.get(rateLimitKey);

    if (existing && now < existing.resetTime) {
      if (existing.count >= RATE_LIMIT_PER_MINUTE) {
        return apiError(
          'RATE_LIMITED',
          429,
          `Too many generation requests. Max ${RATE_LIMIT_PER_MINUTE} per minute.`,
        );
      }
      existing.count++;
    } else {
      generationLimitMap.set(rateLimitKey, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      });
    }

    // Verify instructor owns the quiz (if quizId provided)
    if (quizId) {
      const { data: quiz, error: quizError } = await getSupabaseClient()
        .from('quizzes')
        .select('id, instructor_id')
        .eq('id', quizId)
        .single();

      if (quizError || !quiz) {
        return apiError('INVALID_REQUEST', 404, 'Quiz not found');
      }

      if (quiz.instructor_id !== instructorId) {
        return apiError('INVALID_REQUEST', 403, 'You do not have permission to modify this quiz');
      }
    }

    // Generate questions
    log.info(
      `Generating ${questionCount} ${difficulty} questions on "${topic}" (types: ${questionTypes.join(', ')})`,
    );

    const generationInput: QuestionGenerationInput = {
      topic,
      questionCount,
      difficulty,
      questionTypes,
      quizId,
      language,
    };

    const questions = await generateQuestions(generationInput);

    // Validate questions
    const validation = validateQuestions(questions);

    if (!validation.valid) {
      log.warn(
        `Generated questions failed validation: ${validation.errors.join('; ')}`,
      );
      // Still return questions but flag the errors
    }

    // Save to database if quizId provided
    let savedIds: string[] = [];
    if (quizId) {
      try {
        savedIds = await saveGeneratedQuestions(
          quizId,
          questions,
          `Generated on ${new Date().toISOString()} for topic: ${topic}`,
        );
      } catch (saveError) {
        log.error('Failed to save generated questions:', saveError);
        // Return generated questions even if save failed
        return apiSuccess({
          questions,
          count: questions.length,
          validationErrors: validation.errors.length > 0 ? validation.errors : undefined,
          message: 'Questions generated successfully but failed to save to database. Please try again or create manually.',
        });
      }
    }

    log.info(`Generated and validated ${questions.length} questions`);

    return apiSuccess({
      questions,
      count: questions.length,
      validationErrors: validation.errors.length > 0 ? validation.errors : undefined,
      savedIds: quizId ? savedIds : undefined,
    } as GenerateQuestionsResponse);
  } catch (error) {
    log.error('Question generation request failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return apiError('RATE_LIMITED', 429, error.message);
      }
      return apiError('GENERATION_FAILED', 500, error.message);
    }

    return apiError('INTERNAL_ERROR', 500, 'Failed to generate questions');
  }
}
