'use client';

import { useState, useEffect } from 'react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if ((window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember user dismissed it for this session
    sessionStorage.setItem('installPrompt-dismissed', 'true');
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        right: '24px',
        maxWidth: '400px',
        backgroundColor: BRAND_COLORS.white,
        border: `2px solid ${BRAND_COLORS.teal}`,
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '24px',
            marginTop: '4px',
            flexShrink: 0,
          }}
        >
          📱
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 4px 0',
              color: BRAND_COLORS.navy,
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Install DailyAgile Quiz
          </h3>
          <p
            style={{
              margin: '0 0 12px 0',
              color: BRAND_COLORS.gray,
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          >
            Get quick access to your quizzes. Works offline too!
          </p>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={handleInstall}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '36px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0A7E9A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
              }}
            >
              Install Now
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: BRAND_COLORS.gray,
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '36px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = BRAND_COLORS.light;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Later
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          style={{
            backgroundColor: 'transparent',
            color: BRAND_COLORS.gray,
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
