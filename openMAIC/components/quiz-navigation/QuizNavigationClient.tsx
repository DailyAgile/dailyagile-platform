/**
 * Quiz Navigation Client Component
 * Client-side component that detects user type and routes to appropriate dashboard
 * Handles authentication state and renders the correct UI
 */

'use client';

import React, { useEffect, useState } from 'react';
import { UserType, User, UserDetectionResult } from '@/lib/quiz-navigation/types';
import {
  detectUserType,
  getInstructorCodeFromStorage,
} from '@/lib/quiz-navigation/user-type-detector';
import InstructorDashboard from './InstructorDashboard';
import StudentDashboard from './StudentDashboard';
import PublicDashboard from './PublicDashboard';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizNavigationClient');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
};

export default function QuizNavigationClient() {
  const [userType, setUserType] = useState<UserType>('public');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, _setError] = useState<string | null>(null);

  useEffect(() => {
    // Detect user type on component mount
    const detectUser = async () => {
      try {
        setLoading(true);
        const result: UserDetectionResult = await detectUserType();

        setUserType(result.userType);
        setUser(result.user);

        if (result.error) {
          log.warn('User detection error:', result.error);
          _setError(result.error);
        }

        log.info(`Detected user type: ${result.userType}`);
      } catch (err) {
        log.error('Error detecting user type:', err);
        setUserType('public');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    detectUser();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid #0891B2',
              borderRadius: '50%',
              borderTop: '3px solid ' + BRAND_COLORS.light,
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <h2 style={{ color: BRAND_COLORS.navy, margin: '0 0 8px 0' }}>Loading...</h2>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (_error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light,
          padding: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            color: '#dc2626',
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', color: '#991b1b' }}>Error Loading Page</h2>
          <p style={{ margin: '0 0 16px 0' }}>{_error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render appropriate dashboard based on user type
  switch (userType) {
    case 'instructor':
      return user ? <InstructorDashboard user={user} /> : null;

    case 'student':
      return user ? <StudentDashboard user={user} /> : null;

    case 'public':
    default:
      return <PublicDashboard initialInstructorCode={getInstructorCodeFromStorage() || undefined} />;
  }
}
