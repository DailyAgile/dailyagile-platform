/**
 * React Hook: PWA Initialization
 * Registers service worker and handles PWA install prompts
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createLogger } from '@/lib/logger';
import { initializePerformanceMonitoring } from '@/lib/client/performance';

const log = createLogger('usePWA');

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  supportsNotifications: boolean;
  supportsPersistentStorage: boolean;
  installPrompt?: BeforeInstallPromptEvent | null;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;

// Check if app is already installed
function checkIfInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if running as PWA (standalone mode)
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Check display mode
function getDisplayMode(): string {
  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    ? 'standalone'
    : window.matchMedia('(display-mode: fullscreen)').matches
      ? 'fullscreen'
      : 'browser';
  return displayMode;
}

export function usePWA(): PWAState & {
  installApp: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  requestPersistentStorage: () => Promise<boolean>;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
} {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: checkIfInstalled(),
    supportsNotifications: typeof Notification !== 'undefined',
    supportsPersistentStorage: typeof navigator !== 'undefined' && !!navigator.storage,
    installPrompt: deferredPrompt || undefined,
  });

  // Initialize PWA features
  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      setState((prev) => ({
        ...prev,
        isInstallable: true,
        installPrompt: deferredPrompt,
      }));
      log.info('Install prompt available');
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      isInstalled = true;
      deferredPrompt = null;
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: undefined,
      }));
      log.info('App installed');
    };

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: mediaQuery.matches,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Initialize performance monitoring
    initializePerformanceMonitoring();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<
    ServiceWorkerRegistration | null
  > => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update().catch((err) => {
          log.debug('Failed to check for SW updates:', err);
        });
      }, 60 * 1000); // Check every minute

      log.info('Service worker registered');
      return registration;
    } catch (err) {
      log.error('Service worker registration failed:', err);
      return null;
    }
  }, []);

  // Install app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      log.warn('Install prompt not available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        log.info('User accepted install prompt');
        deferredPrompt = null;
        return true;
      } else {
        log.info('User dismissed install prompt');
        return false;
      }
    } catch (err) {
      log.error('Install failed:', err);
      return false;
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') {
      log.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      log.warn('Notifications denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';

      if (granted) {
        log.info('Notification permission granted');

        // Check if SW supports notifications
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;

          // Test notification
          registration.showNotification('DailyAgile', {
            body: 'Push notifications enabled!',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
          });
        }
      }

      return granted;
    } catch (err) {
      log.error('Failed to request notification permission:', err);
      return false;
    }
  }, []);

  // Request persistent storage
  const requestPersistentStorage = useCallback(async (): Promise<boolean> => {
    if (!navigator.storage || !navigator.storage.persist) {
      log.warn('Persistent storage API not supported');
      return false;
    }

    try {
      const persistent = await navigator.storage.persist();

      if (persistent) {
        log.info('Persistent storage granted');
      } else {
        log.info('Persistent storage denied');
      }

      return persistent;
    } catch (err) {
      log.error('Failed to request persistent storage:', err);
      return false;
    }
  }, []);

  return {
    ...state,
    installApp,
    requestNotificationPermission,
    requestPersistentStorage,
    registerServiceWorker,
  };
}

/**
 * Helper hook: Check if app can be installed
 */
export function useInstallPrompt() {
  const pwa = usePWA();
  return {
    canInstall: pwa.isInstallable && !pwa.isInstalled,
    isInstalled: pwa.isInstalled,
    install: pwa.installApp,
  };
}

/**
 * Helper hook: Check display mode
 */
export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<string>('browser');

  useEffect(() => {
    setDisplayMode(getDisplayMode());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => {
      setDisplayMode(getDisplayMode());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return displayMode;
}
