/**
 * Quiz Submission Sync Queue
 * Handles background persistence of quiz submissions to Supabase
 * Buffers submissions and retries on connection loss
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('QuizSyncQueue');

interface PendingSubmission {
  id: string;
  sceneId: string;
  questions: any[];
  answers: Record<string, string | string[]>;
  sessionToken?: string;
  studentId?: string;
  timestamp: number;
  retryCount: number;
}

interface SyncResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

const SYNC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  MAX_OFFLINE_BUFFER: 10,
};

export class QuizSyncQueue {
  private pending: PendingSubmission[] = [];
  private isSyncing = false;

  /**
   * Queue a quiz submission for sync to Supabase
   */
  async enqueueSubmission(request: {
    sceneId: string;
    questions: any[];
    answers: Record<string, string | string[]>;
    sessionToken?: string;
    studentId?: string;
  }): Promise<SyncResult> {
    const submission: PendingSubmission = {
      id: `submit-${Date.now()}-${Math.random()}`,
      sceneId: request.sceneId,
      questions: request.questions,
      answers: request.answers,
      sessionToken: request.sessionToken,
      studentId: request.studentId,
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Add to pending queue (fire-and-forget)
    if (this.pending.length < SYNC_CONFIG.MAX_OFFLINE_BUFFER) {
      this.pending.push(submission);
      log.debug(`[QuizSync] Submission queued: ${submission.id} (queue length: ${this.pending.length})`);
    } else {
      log.warn(`[QuizSync] Queue buffer full; dropping oldest submission`);
      this.pending.shift();
      this.pending.push(submission);
    }

    // Trigger sync (async, don't wait)
    this.processQueue().catch((error) => {
      log.error('[QuizSync] Sync failed:', error);
    });

    return {
      success: true,
      submissionId: submission.id,
    };
  }

  /**
   * Process all pending submissions
   */
  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.pending.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      while (this.pending.length > 0) {
        const submission = this.pending[0];
        const result = await this.syncWithRetry(submission);

        if (result.success) {
          // Remove from pending queue
          this.pending.shift();
          log.info(`[QuizSync] Submission synced: ${submission.id}`);
        } else {
          // Retry limit exceeded; keep in queue but stop processing
          log.warn(`[QuizSync] Submission ${submission.id} failed; will retry later`);
          break;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Attempt to sync a submission with retries
   */
  private async syncWithRetry(submission: PendingSubmission): Promise<SyncResult> {
    for (let attempt = 0; attempt <= SYNC_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('/api/quiz-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId: submission.sceneId,
            questions: submission.questions,
            answers: submission.answers,
            sessionToken: submission.sessionToken,
            studentId: submission.studentId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return { success: true, submissionId: data.submissionId };
      } catch (error) {
        const isLastAttempt = attempt === SYNC_CONFIG.MAX_RETRIES;
        const delay = SYNC_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);

        log.warn(
          `[QuizSync] Attempt ${attempt + 1}/${SYNC_CONFIG.MAX_RETRIES + 1} failed for ${submission.id}: ${error instanceof Error ? error.message : 'unknown'}`,
        );

        if (!isLastAttempt) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          submission.retryCount++;
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${SYNC_CONFIG.MAX_RETRIES} retries`,
    };
  }

  /**
   * Get pending submission count
   */
  getPendingCount(): number {
    return this.pending.length;
  }

  /**
   * Drain queue (for shutdown/cleanup)
   */
  async drain(): Promise<void> {
    log.info('[QuizSync] Draining queue...');
    while (this.pending.length > 0) {
      await this.processQueue();
      if (this.pending.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    log.info('[QuizSync] Queue drained');
  }
}

// Singleton instance
let instance: QuizSyncQueue | null = null;

export function getQuizSyncQueue(): QuizSyncQueue {
  if (!instance) {
    instance = new QuizSyncQueue();
  }
  return instance;
}
