/**
 * Snapshot Service
 * Creates frozen copies of quiz definitions at assignment time
 * Enables hard delete of quizzes while preserving historical student data
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger('SnapshotService');

export interface QuizSnapshot {
  id: string;
  original_quiz_id: string;
  assignment_id: string;
  quiz_definition: Record<string, any>;
  snapshot_hash: string;
  created_at: string;
}

/**
 * Calculate MD5 hash of quiz definition for integrity checking
 * @param definition - Quiz definition object
 * @returns MD5 hash
 */
function calculateSnapshotHash(definition: Record<string, any>): string {
  const jsonString = JSON.stringify(definition);
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * Get full quiz definition (quiz + all questions)
 * @param quizId - Quiz ID
 * @returns Quiz definition object
 */
async function getQuizDefinition(quizId: string): Promise<Record<string, any>> {
  try {
    const supabase = getSupabaseClient();

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      throw new Error(`Quiz not found: ${quizId}`);
    }

    // Get all questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_number', { ascending: true });

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    // Combine into definition
    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        total_questions: quiz.total_questions,
        total_points: quiz.total_points,
        settings: quiz.settings,
        created_at: quiz.created_at,
      },
      questions: questions || [],
      snapshot_created_at: new Date().toISOString(),
    };
  } catch (error) {
    log.error('Error getting quiz definition:', error);
    throw error;
  }
}

/**
 * Create snapshot of quiz at assignment time
 * @param quizId - Original quiz ID
 * @param assignmentId - Assignment ID
 * @returns Snapshot object with ID and hash
 */
export async function createSnapshot(quizId: string, assignmentId: string): Promise<QuizSnapshot> {
  try {
    const supabase = getSupabaseClient();

    // Check if snapshot already exists for this assignment
    const { data: existing } = await supabase
      .from('quiz_snapshots')
      .select('id')
      .eq('assignment_id', assignmentId)
      .single();

    if (existing) {
      log.info(`Snapshot already exists for assignment ${assignmentId}`);
      return getSnapshotById(existing.id);
    }

    // Get quiz definition
    const definition = await getQuizDefinition(quizId);
    const hash = calculateSnapshotHash(definition);

    // Create snapshot
    const { data, error } = await supabase
      .from('quiz_snapshots')
      .insert({
        original_quiz_id: quizId,
        assignment_id: assignmentId,
        quiz_definition: definition,
        snapshot_hash: hash,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }

    log.info(`✅ Snapshot created: ${data.id} for assignment ${assignmentId}`);
    return data;
  } catch (error) {
    log.error('Error in createSnapshot:', error);
    throw error;
  }
}

/**
 * Get snapshot by ID
 * @param snapshotId - Snapshot ID
 * @returns Snapshot object
 */
export async function getSnapshotById(snapshotId: string): Promise<QuizSnapshot> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('quiz_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    if (error || !data) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    return data;
  } catch (error) {
    log.error('Error in getSnapshotById:', error);
    throw error;
  }
}

/**
 * Get snapshot definition (quiz + questions)
 * @param snapshotId - Snapshot ID
 * @returns Quiz definition from snapshot
 */
export async function getSnapshotDefinition(
  snapshotId: string,
): Promise<Record<string, any> | null> {
  try {
    const snapshot = await getSnapshotById(snapshotId);

    if (!snapshot) {
      log.warn(`Snapshot definition not found: ${snapshotId}`);
      return null;
    }

    return snapshot.quiz_definition;
  } catch (error) {
    log.error('Error getting snapshot definition:', error);
    return null;
  }
}

/**
 * Validate snapshot integrity by comparing hashes
 * @param snapshotId - Snapshot ID
 * @returns true if hash valid, false if corrupted
 */
export async function validateSnapshotIntegrity(snapshotId: string): Promise<boolean> {
  try {
    const snapshot = await getSnapshotById(snapshotId);

    if (!snapshot) {
      return false;
    }

    // Recalculate hash
    const calculatedHash = calculateSnapshotHash(snapshot.quiz_definition);

    // Compare
    const isValid = calculatedHash === snapshot.snapshot_hash;

    if (!isValid) {
      log.warn(`Snapshot integrity check failed: ${snapshotId}`);
    }

    return isValid;
  } catch (error) {
    log.error('Error validating snapshot integrity:', error);
    return false;
  }
}

/**
 * Get snapshot for assignment
 * @param assignmentId - Assignment ID
 * @returns Snapshot object or null if not found
 */
export async function getSnapshotForAssignment(assignmentId: string): Promise<QuizSnapshot | null> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('quiz_snapshots')
      .select('*')
      .eq('assignment_id', assignmentId)
      .single();

    if (error) {
      log.debug(`No snapshot found for assignment ${assignmentId}`);
      return null;
    }

    return data;
  } catch (error) {
    log.error('Error getting snapshot for assignment:', error);
    return null;
  }
}

/**
 * Get snapshots for quiz (for viewing quiz history)
 * @param quizId - Original quiz ID
 * @returns List of snapshots
 */
export async function getSnapshotsForQuiz(quizId: string): Promise<QuizSnapshot[]> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('quiz_snapshots')
      .select('*')
      .eq('original_quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch snapshots:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error in getSnapshotsForQuiz:', error);
    return [];
  }
}

/**
 * Count snapshots for quiz
 * @param quizId - Original quiz ID
 * @returns Number of snapshots
 */
export async function countSnapshotsForQuiz(quizId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();

    const { count, error } = await supabase
      .from('quiz_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('original_quiz_id', quizId);

    if (error) {
      log.error('Failed to count snapshots:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    log.error('Error counting snapshots:', error);
    return 0;
  }
}

/**
 * Cleanup: Delete snapshots for deleted assignment
 * (Auto-triggered by CASCADE on quiz_snapshots.assignment_id)
 * But this function can be used for manual cleanup if needed
 * @param assignmentId - Assignment ID
 */
export async function deleteSnapshotsForAssignment(assignmentId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('quiz_snapshots')
      .delete()
      .eq('assignment_id', assignmentId);

    if (error) {
      log.warn(`Failed to delete snapshots for assignment ${assignmentId}: ${error.message}`);
    } else {
      log.info(`✅ Snapshots deleted for assignment ${assignmentId}`);
    }
  } catch (error) {
    log.error('Error deleting snapshots:', error);
  }
}

/**
 * Get quiz questions from snapshot
 * @param snapshotId - Snapshot ID
 * @returns List of questions
 */
export async function getQuestionsFromSnapshot(
  snapshotId: string,
): Promise<Array<Record<string, any>>> {
  try {
    const definition = await getSnapshotDefinition(snapshotId);

    if (!definition || !definition.questions) {
      return [];
    }

    return definition.questions;
  } catch (error) {
    log.error('Error getting questions from snapshot:', error);
    return [];
  }
}

/**
 * Get question from snapshot by ID
 * @param snapshotId - Snapshot ID
 * @param questionId - Question ID
 * @returns Question object or null
 */
export async function getQuestionFromSnapshot(
  snapshotId: string,
  questionId: string,
): Promise<Record<string, any> | null> {
  try {
    const questions = await getQuestionsFromSnapshot(snapshotId);
    const question = questions.find((q) => q.id === questionId);

    return question || null;
  } catch (error) {
    log.error('Error getting question from snapshot:', error);
    return null;
  }
}
