/**
 * Duplicate Detection Service
 * Detects duplicate or similar questions within a quiz
 * Uses normalized text matching and fuzzy string similarity
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger('DuplicateDetectionService');

export enum DuplicateMatchType {
  EXACT = 'exact',
  NORMALIZED = 'normalized',
  FUZZY = 'fuzzy',
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: DuplicateMatchType;
  matchedQuestion?: {
    id: string;
    text: string;
    quiz_id: string;
    similarity?: number;
  };
  similarity?: number;
}

/**
 * Normalize question text for comparison
 * Lowercase, trim, remove extra whitespace
 * @param text - Question text
 * @returns Normalized text
 */
export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[.,!?;:'-]/g, '') // Remove common punctuation
    .trim();
}

/**
 * Calculate MD5 hash of normalized question
 * @param text - Question text
 * @returns MD5 hash
 */
export function hashQuestion(text: string): string {
  const normalized = normalizeQuestion(text);
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Lower score = more similar
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-100, higher = more similar)
 * Based on Levenshtein distance
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score 0-100
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(str1, str2);
  const similarity = 100 - (distance / maxLen) * 100;

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Check for duplicates in a specific quiz
 * Searches by exact, normalized, and fuzzy matching
 * @param quizId - Quiz ID to check within
 * @param newQuestion - New question text to check
 * @param matchType - 'exact', 'normalized', or 'fuzzy'
 * @returns Result with match details if found
 */
export async function checkDuplicateInQuiz(
  quizId: string,
  newQuestion: string,
  matchType: DuplicateMatchType = DuplicateMatchType.NORMALIZED,
): Promise<DuplicateCheckResult> {
  try {
    const supabase = getSupabaseClient();
    const normalized = normalizeQuestion(newQuestion);
    const hash = hashQuestion(newQuestion);

    // Try exact match first (by hash)
    if (matchType === DuplicateMatchType.EXACT || matchType === DuplicateMatchType.NORMALIZED) {
      const { data: exactMatch } = await supabase
        .from('quiz_questions')
        .select('id, question, quiz_id')
        .eq('quiz_id', quizId)
        .eq('question_hash', hash)
        .limit(1);

      if (exactMatch && exactMatch.length > 0) {
        log.info(`Exact duplicate found: ${exactMatch[0].id}`);
        return {
          isDuplicate: true,
          matchType: DuplicateMatchType.EXACT,
          matchedQuestion: {
            id: exactMatch[0].id,
            text: exactMatch[0].question,
            quiz_id: exactMatch[0].quiz_id,
          },
          similarity: 100,
        };
      }
    }

    // Try normalized text match
    if (
      matchType === DuplicateMatchType.NORMALIZED ||
      matchType === DuplicateMatchType.FUZZY
    ) {
      const { data: normalizedMatches } = await supabase
        .from('quiz_questions')
        .select('id, question, question_normalized, quiz_id')
        .eq('quiz_id', quizId)
        .eq('question_normalized', normalized)
        .limit(1);

      if (normalizedMatches && normalizedMatches.length > 0) {
        log.info(`Normalized duplicate found: ${normalizedMatches[0].id}`);
        return {
          isDuplicate: true,
          matchType: DuplicateMatchType.NORMALIZED,
          matchedQuestion: {
            id: normalizedMatches[0].id,
            text: normalizedMatches[0].question,
            quiz_id: normalizedMatches[0].quiz_id,
          },
          similarity: 100,
        };
      }
    }

    // Try fuzzy matching (only if explicitly requested)
    if (matchType === DuplicateMatchType.FUZZY) {
      const { data: allQuestions } = await supabase
        .from('quiz_questions')
        .select('id, question, quiz_id')
        .eq('quiz_id', quizId);

      if (allQuestions && allQuestions.length > 0) {
        for (const q of allQuestions) {
          const similarity = calculateSimilarity(normalized, normalizeQuestion(q.question));

          // Consider 85% similarity or higher as duplicate
          if (similarity >= 85) {
            log.info(
              `Fuzzy duplicate found: ${q.id} with ${similarity.toFixed(2)}% similarity`,
            );
            return {
              isDuplicate: true,
              matchType: DuplicateMatchType.FUZZY,
              matchedQuestion: {
                id: q.id,
                text: q.question,
                quiz_id: q.quiz_id,
                similarity,
              },
              similarity,
            };
          }
        }
      }
    }

    // No duplicate found
    log.debug(`No duplicates found for question in quiz ${quizId}`);
    return {
      isDuplicate: false,
    };
  } catch (error) {
    log.error('Error checking duplicates:', error);
    throw error;
  }
}

/**
 * Validate array of questions for duplicates
 * @param quizId - Quiz ID
 * @param questions - Array of question objects with 'question' property
 * @returns Array of results for each question
 */
export async function validateQuestionsForDuplicates(
  quizId: string,
  questions: Array<{ question: string }>,
): Promise<DuplicateCheckResult[]> {
  try {
    const results: DuplicateCheckResult[] = [];

    for (const q of questions) {
      const result = await checkDuplicateInQuiz(quizId, q.question, DuplicateMatchType.NORMALIZED);
      results.push(result);
    }

    return results;
  } catch (error) {
    log.error('Error validating questions:', error);
    throw error;
  }
}

/**
 * Get all questions in a quiz for duplicate comparison
 * @param quizId - Quiz ID
 * @returns Array of question objects
 */
export async function getQuizQuestions(
  quizId: string,
): Promise<Array<Record<string, any>>> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (error) {
      log.error('Failed to fetch quiz questions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error getting quiz questions:', error);
    return [];
  }
}

/**
 * Find all duplicates within a quiz (O(n²) complexity)
 * Use with caution on large quizzes
 * @param quizId - Quiz ID
 * @returns Map of duplicate groups
 */
export async function findAllDuplicatesInQuiz(quizId: string): Promise<Map<string, string[]>> {
  try {
    const questions = await getQuizQuestions(quizId);
    const duplicateGroups = new Map<string, string[]>();

    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const similarity = calculateSimilarity(
          normalizeQuestion(questions[i].question),
          normalizeQuestion(questions[j].question),
        );

        if (similarity >= 85) {
          const groupKey = `${questions[i].id}|${questions[j].id}`;

          if (!duplicateGroups.has(groupKey)) {
            duplicateGroups.set(groupKey, [questions[i].id, questions[j].id]);
          }
        }
      }
    }

    log.info(`Found ${duplicateGroups.size} duplicate groups in quiz ${quizId}`);
    return duplicateGroups;
  } catch (error) {
    log.error('Error finding duplicates:', error);
    return new Map();
  }
}

/**
 * Update question normalized and hash fields
 * Call this after adding new questions to ensure they're indexed for duplicate detection
 * @param questionId - Question ID
 * @param questionText - Question text
 */
export async function updateQuestionNormalizedFields(
  questionId: string,
  questionText: string,
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const normalized = normalizeQuestion(questionText);
    const hash = hashQuestion(questionText);

    const { error } = await supabase
      .from('quiz_questions')
      .update({
        question_normalized: normalized,
        question_hash: hash,
      })
      .eq('id', questionId);

    if (error) {
      log.error('Failed to update question fields:', error);
      throw error;
    }

    log.debug(`Updated normalized fields for question ${questionId}`);
  } catch (error) {
    log.error('Error updating question fields:', error);
    throw error;
  }
}

/**
 * Batch update normalized and hash fields for multiple questions
 * @param questions - Array of {id, question} objects
 */
export async function batchUpdateQuestionFields(
  questions: Array<{ id: string; question: string }>,
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    const updates = questions.map((q) => ({
      id: q.id,
      question_normalized: normalizeQuestion(q.question),
      question_hash: hashQuestion(q.question),
    }));

    // Supabase doesn't support batch update, so update individually
    for (const update of updates) {
      await supabase
        .from('quiz_questions')
        .update({
          question_normalized: update.question_normalized,
          question_hash: update.question_hash,
        })
        .eq('id', update.id);
    }

    log.info(`Updated ${updates.length} questions with normalized fields`);
  } catch (error) {
    log.error('Error batch updating questions:', error);
    throw error;
  }
}
