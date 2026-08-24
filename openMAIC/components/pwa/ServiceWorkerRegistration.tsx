'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegistration() {
  const [swReady, setSwReady] = useState(false);
  const [swUpdating, setSwUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('[App] Service workers not supported');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[App] Service Worker registered:', registration);
        setSwReady(true);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New service worker installed');
              setSwUpdating(true);

              // Notify user about update (optional)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('DailyAgile Quiz Updated', {
                  body: 'A new version is available. Refresh to update.',
                  icon: '/icon-192x192.png',
                });
              }
            }
          });
        });
      } catch (error) {
        console.error('[App] Service Worker registration failed:', error);
      }
    };

    // Delay registration to avoid blocking initial load
    const timeout = setTimeout(registerServiceWorker, 2000);

    return () => clearTimeout(timeout);
  }, []);

  // Listen for messages from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'QUIZ_SYNC_SUCCESS') {
        console.log('[App] Quiz answer synced:', event.data.answerId);
        // Dispatch custom event that components can listen to
        window.dispatchEvent(
          new CustomEvent('quizAnswerSynced', { detail: { answerId: event.data.answerId } })
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  return null;
}
