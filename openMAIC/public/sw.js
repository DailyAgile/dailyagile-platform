/**
 * Service Worker for DailyAgile Quiz Platform
 * Enables offline support and optimized caching
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  RUNTIME: `dailyagile-runtime-${CACHE_VERSION}`,
  STATIC: `dailyagile-static-${CACHE_VERSION}`,
  DYNAMIC: `dailyagile-dynamic-${CACHE_VERSION}`,
  API: `dailyagile-api-${CACHE_VERSION}`,
};

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Gracefully handle missing assets
        console.warn('[SW] Some static assets could not be cached');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete caches that don't match current version
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests: Network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const cache = caches.open(CACHE_NAMES.API);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then((cached) => {
            return cached || createOfflineResponse();
          });
        })
    );
    return;
  }

  // HTML pages: Network first
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAMES.RUNTIME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || createOfflineResponse();
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): Cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAMES.STATIC).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: Network first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Background sync for quiz submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-quiz-answers') {
    event.waitUntil(syncQuizAnswers());
  }
});

async function syncQuizAnswers() {
  try {
    const db = await openIndexedDB();
    const pendingAnswers = await getAllPendingAnswers(db);

    for (const answer of pendingAnswers) {
      try {
        await fetch('/api/student/quiz/submit-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(answer),
        });

        // Remove from pending after successful sync
        await removePendingAnswer(db, answer.id);

        // Notify clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'QUIZ_SYNC_SUCCESS',
              answerId: answer.id,
            });
          });
        });
      } catch (error) {
        console.error('[SW] Failed to sync answer:', error);
        // Retry next time
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DailyAgileQuiz', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingAnswers')) {
        db.createObjectStore('pendingAnswers', { keyPath: 'id' });
      }
    };
  });
}

function getAllPendingAnswers(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingAnswers'], 'readonly');
    const store = transaction.objectStore('pendingAnswers');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingAnswer(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingAnswers'], 'readwrite');
    const store = transaction.objectStore('pendingAnswers');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>DailyAgile - Offline</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #F0F7FA;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        h1 {
          color: #1E3A5F;
          margin-bottom: 8px;
          font-size: 24px;
        }
        p {
          color: #64748B;
          margin-bottom: 16px;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          background-color: #0891B2;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 16px;
        }
        .button:hover {
          background-color: #0a7e9a;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🌐</div>
        <h1>You're Offline</h1>
        <p>Check your internet connection and try again.</p>
        <p>Your quiz answers are saved locally and will sync automatically when you're back online.</p>
        <button class="button" onclick="location.reload()">Retry</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' },
    }
  );
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_BUST') {
    // Bust cache for specific URL
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.open(cacheName).then((cache) => {
          cache.delete(event.data.url);
        });
      });
    });
  }
});
