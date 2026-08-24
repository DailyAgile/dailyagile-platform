/**
 * Offline Database Utilities
 * Uses IndexedDB to persist quiz answers when offline
 */

const DB_NAME = 'DailyAgileQuiz';
const DB_VERSION = 1;

export interface PendingAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  answer: string;
  timestamp: number;
  synced?: boolean;
}

export interface QuizSession {
  sessionId: string;
  quizId: string;
  startTime: number;
  answers: Record<string, string>;
}

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('pendingAnswers')) {
          db.createObjectStore('pendingAnswers', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('quizSessions')) {
          db.createObjectStore('quizSessions', { keyPath: 'sessionId' });
        }

        if (!db.objectStoreNames.contains('quizCache')) {
          db.createObjectStore('quizCache', { keyPath: 'quizId' });
        }
      };
    });
  }

  async savePendingAnswer(answer: PendingAnswer): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingAnswers'], 'readwrite');
      const store = transaction.objectStore('pendingAnswers');
      const request = store.put(answer);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPendingAnswers(): Promise<PendingAnswer[]> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingAnswers'], 'readonly');
      const store = transaction.objectStore('pendingAnswers');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async removePendingAnswer(id: string): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingAnswers'], 'readwrite');
      const store = transaction.objectStore('pendingAnswers');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveQuizSession(session: QuizSession): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizSessions'], 'readwrite');
      const store = transaction.objectStore('quizSessions');
      const request = store.put(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getQuizSession(sessionId: string): Promise<QuizSession | null> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizSessions'], 'readonly');
      const store = transaction.objectStore('quizSessions');
      const request = store.get(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async removeQuizSession(sessionId: string): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizSessions'], 'readwrite');
      const store = transaction.objectStore('quizSessions');
      const request = store.delete(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveQuizCache(quizId: string, data: any): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizCache'], 'readwrite');
      const store = transaction.objectStore('quizCache');
      const request = store.put({ quizId, data, timestamp: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getQuizCache(quizId: string): Promise<any | null> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizCache'], 'readonly');
      const store = transaction.objectStore('quizCache');
      const request = store.get(quizId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  async clearOldCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const db = this.db || (await this.init());
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizCache'], 'readwrite');
      const store = transaction.objectStore('quizCache');
      const request = store.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (now - cursor.value.timestamp > maxAge) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

// Singleton instance
let db: OfflineDB | null = null;

export async function getOfflineDB(): Promise<OfflineDB> {
  if (!db) {
    db = new OfflineDB();
    await db.init();
  }
  return db;
}

// Helper functions for quiz answer persistence
export async function savePendingAnswer(
  sessionId: string,
  questionId: string,
  answer: string
): Promise<void> {
  if (!('indexedDB' in window)) {
    console.warn('IndexedDB not available');
    return;
  }

  try {
    const offlineDb = await getOfflineDB();
    const id = `${sessionId}-${questionId}`;

    await offlineDb.savePendingAnswer({
      id,
      sessionId,
      questionId,
      answer,
      timestamp: Date.now(),
    });

    console.log('[Offline] Answer saved:', id);

    // Request background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      (registration as any).sync.register('sync-quiz-answers').catch(console.error);
    }
  } catch (error) {
    console.error('[Offline] Failed to save answer:', error);
  }
}

export async function getPendingAnswers(): Promise<PendingAnswer[]> {
  if (!('indexedDB' in window)) {
    return [];
  }

  try {
    const offlineDb = await getOfflineDB();
    return await offlineDb.getPendingAnswers();
  } catch (error) {
    console.error('[Offline] Failed to get pending answers:', error);
    return [];
  }
}

export async function removePendingAnswer(id: string): Promise<void> {
  if (!('indexedDB' in window)) {
    return;
  }

  try {
    const offlineDb = await getOfflineDB();
    await offlineDb.removePendingAnswer(id);
  } catch (error) {
    console.error('[Offline] Failed to remove answer:', error);
  }
}
