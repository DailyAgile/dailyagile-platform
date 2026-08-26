'use client';

import React, { useState } from 'react';
import PublicDashboard from './PublicDashboard';
import InstructorCodeModal from './InstructorCodeModal';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizHub');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  dark: '#1E293B',
  gray: '#64748B',
  white: '#FFFFFF',
};

interface HubChoice {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  color: string;
}

export default function QuizHub() {
  const [showPublicQuizzes, setShowPublicQuizzes] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [instructorCode, setInstructorCode] = useState<string | null>(null);

  const handleNavigateToAuth = (redirect: string) => {
    window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
  };

  const handleCodeSubmit = async (code: string) => {
    try {
      // Verify the code is valid by fetching quizzes
      const response = await fetch(`/api/quizzes/by-code/${code}`);
      if (!response.ok) {
        throw new Error('Invalid instructor code or no quizzes found');
      }
      const data = await response.json();
      if (data.success) {
        setInstructorCode(code);
        setShowCodeModal(false);
        log.info(`Loaded quizzes for instructor code: ${code}`);
      } else {
        throw new Error(data.error?.message || 'Failed to load quizzes');
      }
    } catch (error) {
      log.error('Error loading quizzes by code:', error);
      throw error;
    }
  };

  const choices: HubChoice[] = [
    {
      id: 'instructor',
      title: "I'm an Instructor",
      description: 'Log in to manage your quizzes and track student progress',
      icon: '👨‍🏫',
      action: () => handleNavigateToAuth('/quizzes/instructor'),
      color: '#0891B2',
    },
    {
      id: 'student',
      title: 'I Bought a Course',
      description: 'Log in to access your purchased courses and quizzes',
      icon: '👩‍💼',
      action: () => handleNavigateToAuth('/quizzes/student'),
      color: '#1E3A5F',
    },
    {
      id: 'code',
      title: 'I Have a Code',
      description: 'Enter an instructor code to access free quizzes',
      icon: '🔑',
      action: () => setShowCodeModal(true),
      color: '#EA580C',
    },
    {
      id: 'public',
      title: 'Browse Public Quizzes',
      description: 'Explore free and sample quizzes without signing up',
      icon: '🔍',
      action: () => setShowPublicQuizzes(true),
      color: '#64748B',
    },
  ];

  // If user entered instructor code or selected browse public, show dashboard
  if (showPublicQuizzes || instructorCode) {
    return (
      <PublicDashboard initialInstructorCode={instructorCode || undefined} />
    );
  }

  // Default: Show hub with 4 choice cards (with optional code modal overlay)
  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: BRAND_COLORS.white,
          padding: '40px 20px',
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #0f172a; color: #f1f5f9; }
          }
        `}</style>

        {/* Header */}
        <div style={{ maxWidth: '1200px', margin: '0 auto 60px' }}>
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 16px 0',
              fontFamily: 'Cambria, serif',
            }}
          >
            Quiz Navigation Hub
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: BRAND_COLORS.gray,
              margin: '0',
              maxWidth: '600px',
              lineHeight: '1.6',
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Choose how you'd like to access quizzes. Whether you're an instructor managing courses,
            a student exploring purchases, or someone with an instructor code, we have a path for
            you.
          </p>
        </div>

        {/* 4-Choice Grid */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {choices.map((choice) => (
            <button
              key={choice.id}
              onClick={choice.action}
              style={{
                backgroundColor: BRAND_COLORS.white,
                border: `2px solid ${choice.color}`,
                borderRadius: '12px',
                padding: '32px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.boxShadow = `0 8px 24px ${choice.color}20`;
                target.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                target.style.transform = 'translateY(0)';
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{choice.icon}</div>

              {/* Title */}
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: choice.color,
                  margin: '0 0 8px 0',
                  fontFamily: 'Cambria, serif',
                }}
              >
                {choice.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: '14px',
                  color: BRAND_COLORS.gray,
                  margin: '0',
                  lineHeight: '1.5',
                  fontFamily: 'Calibri, sans-serif',
                }}
              >
                {choice.description}
              </p>

              {/* CTA Arrow */}
              <div
                style={{
                  marginTop: '16px',
                  color: choice.color,
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Get Started <span style={{ fontSize: '18px' }}>→</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '80px auto 0',
            textAlign: 'center',
            paddingTop: '40px',
            borderTop: `1px solid ${BRAND_COLORS.light}`,
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: BRAND_COLORS.gray,
              margin: '0',
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            All quizzes are secure and support multiple attempt modes: Practice, Mock Test, and
            Live Game.
          </p>
        </div>
      </div>

      {/* Instructor Code Modal (overlaid) */}
      <InstructorCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onSubmit={handleCodeSubmit}
      />
    </>
  );
}
