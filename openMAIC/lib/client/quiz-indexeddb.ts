/**
 * Quiz IndexedDB Management
 * Handles offline storage of quiz data, answers, and submission queue
 * Uses Dexie.js for efficient IndexedDB operations
 */

import Dexie, { Table } from 'dexie';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizIndexedDB');

/**
 * Quiz Data Interfaces
 */
export interface QuizData {
  id: string;
  quizId: string;
  questions: QuizQuestion[];
  cachedAt: string;
  expiresAt?: string;
}

export interface QuizQuestion {
  id: string;
  question_number: number;
  question: string;
  timer_seconds: number;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
  };
  points: number;
}

export interface StoredAnswer {
  id: string;
  quizId: string;
  questionId: string;
  sessionId: string;
  selectedAnswer: string;
  timeTaken: number;
  timestamp: string;
  synced: boolean;
  syncedAt?: string;
  error?: string;
}

export interface SubmissionQueue {
  id: string;
  quizId: string;
  sessionId: string;
  studentId: string;
  sceneId: string;
  answers: Record<string, string>;
  questions: QuizQuestion[];
  createdAt: string;
  synced: boolean;
  syncedAt?: string;
  attempts: number;
  lastError?: string;
}

export interface QuizSession {
  id: string;
  quizId: string;
  studentId: string;
  sceneId: string;
  startedAt: string;
  completedAt?: string;
  answeredCount: number;
  totalQuestions: number;
}

export interface SyncStatus {
  id: string;
  type: 'submission' | 'quiz_data';
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  lastAttempt: string;
  attemptCount: number;
  error?: string;
}

/**
 * Dexie Database Definition
 */
class QuizDatabase extends Dexie {
  quizzes!: Table<QuizData>;
  answers!: Table<StoredAnswer>;
  submissions!: Table<SubmissionQueue>;
  sessions!: Table<QuizSession>;
  syncStatus!: Table<SyncStatus>;

  constructor() {
    super('DailyAgileQuiz');
    this.version(1).stores({
      quizzes: 'quizId, cachedAt',
      answers: '++id, quizId, sessionId, synced, timestamp',
      submissions: '++id, quizId, sessionId, synced, createdAt',
      sessions: '++id, quizId, studentId, startedAt',
      syncStatus: '++id, type, status, lastAttempt',
    });
  }
}

/**
 * Database Instance
 */
let db: QuizDatabase | null = null;

/**
 * Initialize database (call once on app load)
 */
export async function initializeQuizDB(): Promise<QuizDatabase> {
  if (db) return db;

  try {
    db = new QuizDatabase();
    await db.open();
    log.info('Quiz database initialized');
    return db;
  } catch (err) {
    log.error('Failed to initialize quiz database:', err);
    throw err;
  }
}

/**
 * Get database instance (lazy init)
 */
async function getDB(): Promise<QuizDatabase> {
  if (!db) {
    await initializeQuizDB();
  }
  return db!;
}

/**
 * QUIZ DATA OPERATIONS
 */

export async function cacheQuizData(
  quizId: string,
  questions: QuizQuestion[]
): Promise<QuizData> {
  const database = await getDB();
  const quizData: QuizData = {
    id: `${quizId}-${Date.now()}`,
    quizId,
    questions,
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h TTL
  };

  await database.quizzes.put(quizData);
  log.info(`Cached quiz data for ${quizId}`);
  return quizData;
}

export async function getQuizData(quizId: string): Promise<QuizData | null> {
  const database = await getDB();
  const quizData = await database.quizzes.where('quizId').equals(quizId).last();

  if (!quizData) {
    return null;
  }

  // Check if expired
  if (quizData.expiresAt && new Date(quizData.expiresAt) < new Date()) {
    await database.quizzes.delete(quizData.id);
    log.info(`Quiz data expired for ${quizId}`);
    return null;
  }

  return quizData;
}

/**
 * ANSWER OPERATIONS
 */

export async function saveAnswer(
  quizId: string,
  questionId: string,
  sessionId: string,
  selectedAnswer: string,
  timeTaken: number
): Promise<StoredAnswer> {
  const database = await getDB();
  const answer: StoredAnswer = {
    id: `${sessionId}-${questionId}`,
    quizId,
    questionId,
    sessionId,
    selectedAnswer,
    timeTaken,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  await database.answers.put(answer);
  log.debug(`Saved answer for question ${questionId}`);
  return answer;
}

export async function getAnswer(
  sessionId: string,
  questionId: string
): Promise<StoredAnswer | null> {
  const database = await getDB();
  const answer = await database.answers.get(`${sessionId}-${questionId}`);
  return answer || null;
}

export async function getAllAnswers(sessionId: string): Promise<StoredAnswer[]> {
  const database = await getDB();
  return database.answers.where('sessionId').equals(sessionId).toArray();
}

export async function getUnsyncedAnswers(quizId: string): Promise<StoredAnswer[]> {
  const database = await getDB();
  return database.answers
    .where('quizId')
    .equals(quizId)
    .filter((a) => !a.synced)
    .toArray();
}

export async function markAnswerSynced(
  answerId: string,
  syncedAt: string = new Date().toISOString()
): Promise<void> {
  const database = await getDB();
  const answer = await database.answers.get(answerId);
  if (answer) {
    answer.synced = true;
    answer.syncedAt = syncedAt;
    await database.answers.put(answer);
    log.debug(`Marked answer as synced: ${answerId}`);
  }
}

/**
 * SUBMISSION QUEUE OPERATIONS
 */

export async function queueSubmission(
  quizId: string,
  sessionId: string,
  studentId: string,
  sceneId: string,
  answers: Record<string, string>,
  questions: QuizQuestion[]
): Promise<SubmissionQueue> {
  const database = await getDB();
  const submission: SubmissionQueue = {
    id: `${sessionId}-${Date.now()}`,
    quizId,
    sessionId,
    studentId,
    sceneId,
    answers,
    questions,
    createdAt: new Date().toISOString(),
    synced: false,
    attempts: 0,
  };

  await database.submissions.add(submission);
  log.info(`Queued submission for quiz ${quizId}`);

  // Register for background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-quiz-submissions');
      log.info('Registered for background sync');
    } catch (err) {
      log.warn('Background sync registration failed:', err);
    }
  }

  return submission;
}

export async function getPendingSubmissions(): Promise<SubmissionQueue[]> {
  const database = await getDB();
  return database.submissions.where('synced').equals(false as any).toArray();
}

export async function updateSubmissionStatus(
  submissionId: string,
  synced: boolean,
  error?: string
): Promise<void> {
  const database = await getDB();
  const submission = await database.submissions.get(submissionId);
  if (submission) {
    submission.synced = synced;
    if (synced) {
      submission.syncedAt = new Date().toISOString();
    }
    if (error) {
      submission.lastError = error;
    }
    submission.attempts += 1;
    await database.submissions.put(submission);
    log.debug(`Updated submission ${submissionId}: synced=${synced}`);
  }
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  const database = await getDB();
  await database.submissions.delete(submissionId);
  log.debug(`Deleted submission ${submissionId}`);
}

/**
 * SESSION OPERATIONS
 */

export async function createSession(
  quizId: string,
  studentId: string,
  sceneId: string,
  totalQuestions: number
): Promise<QuizSession> {
  const database = await getDB();
  const session: QuizSession = {
    id: `${quizId}-${studentId}-${Date.now()}`,
    quizId,
    studentId,
    sceneId,
    startedAt: new Date().toISOString(),
    answeredCount: 0,
    totalQuestions,
  };

  await database.sessions.put(session);
  log.info(`Created session ${session.id}`);
  return session;
}

export async function updateSessionProgress(
  sessionId: string,
  answeredCount: number
): Promise<void> {
  const database = await getDB();
  const session = await database.sessions.get(sessionId);
  if (session) {
    session.answeredCount = answeredCount;
    await database.sessions.put(session);
  }
}

export async function completeSession(sessionId: string): Promise<void> {
  const database = await getDB();
  const session = await database.sessions.get(sessionId);
  if (session) {
    session.completedAt = new Date().toISOString();
    await database.sessions.put(session);
    log.info(`Completed session ${sessionId}`);
  }
}

/**
 * SYNC STATUS TRACKING
 */

export async function trackSyncAttempt(
  type: 'submission' | 'quiz_data',
  status: 'pending' | 'syncing' | 'synced' | 'failed',
  error?: string
): Promise<void> {
  const database = await getDB();
  const id = `${type}-${Date.now()}`;
  const syncRecord: SyncStatus = {
    id,
    type,
    status,
    lastAttempt: new Date().toISOString(),
    attemptCount: 1,
    error,
  };

  await database.syncStatus.put(syncRecord);
}

/**
 * CLEANUP OPERATIONS
 */

export async function cleanupExpiredData(): Promise<void> {
  const database = await getDB();
  const now = new Date();

  // Remove expired quiz data
  const allQuizzes = await database.quizzes.toArray();
  const expiredQuizzes = allQuizzes.filter(
    (q) => q.expiresAt && new Date(q.expiresAt) < now
  );

  for (const quiz of expiredQuizzes) {
    await database.quizzes.delete(quiz.id);
  }

  // Remove synced submissions older than 7 days
  const allSubmissions = await database.submissions.toArray();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oldSubmissions = allSubmissions.filter(
    (s) => s.synced && new Date(s.createdAt) < sevenDaysAgo
  );

  for (const submission of oldSubmissions) {
    await database.submissions.delete(submission.id);
  }

  log.info(
    `Cleaned up ${expiredQuizzes.length} expired quizzes and ${oldSubmissions.length} old submissions`
  );
}

/**
 * STORAGE QUOTA MONITORING
 */

export async function getStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? (estimate.usage! / estimate.quota) * 100 : 0,
    };
  } catch (err) {
    log.warn('Failed to estimate storage:', err);
    return null;
  }
}

/**
 * REQUEST PERSISTENT STORAGE
 */

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const persistent = await navigator.storage.persist();
    if (persistent) {
      log.info('Persistent storage granted');
    }
    return persistent;
  } catch (err) {
    log.warn('Failed to request persistent storage:', err);
    return false;
  }
}

/**
 * DEBUG: Export database state
 */
export async function exportDatabaseState(): Promise<{
  quizzes: QuizData[];
  answers: StoredAnswer[];
  submissions: SubmissionQueue[];
  sessions: QuizSession[];
}> {
  const database = await getDB();
  return {
    quizzes: await database.quizzes.toArray(),
    answers: await database.answers.toArray(),
    submissions: await database.submissions.toArray(),
    sessions: await database.sessions.toArray(),
  };
}

/**
 * DEBUG: Clear all data
 */
export async function clearAllData(): Promise<void> {
  const database = await getDB();
  await database.quizzes.clear();
  await database.answers.clear();
  await database.submissions.clear();
  await database.sessions.clear();
  await database.syncStatus.clear();
  log.warn('Cleared all quiz database data');
}
