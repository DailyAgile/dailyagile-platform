'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { LiveQuizRealtimeManager } from '@/lib/ilt/live/realtime-manager';
import { createLogger } from '@/lib/logger';

const log = createLogger('JoinLiveQuiz');

interface JoinResponse {
  success: boolean;
  data: {
    sessionId: string;
    joinCode: string;
    quizTitle: string;
    currentQuestionIndex: number;
    totalQuestions: number;
    studentId: string;
    quizId?: string; // Will be populated via realtime subscription or state fetch
  };
}

interface SessionUpdateData {
  id: string;
  status: 'pending' | 'live' | 'paused' | 'ended';
  current_question_index: number;
  quiz_id: string;
}

/**
 * Join Live Quiz Session Page
 *
 * Students enter an 8-character join code from their instructor to join a live quiz session.
 * After successful join, they wait for the instructor to start, then are automatically
 * redirected to the live quiz game mode when the first question begins.
 */
export default function JoinLiveQuizPage() {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const realtimeManagerRef = useRef<LiveQuizRealtimeManager | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<JoinResponse['data'] | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  // Initialize Supabase client
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Configuration error: Missing Supabase credentials');
      return;
    }

    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
    realtimeManagerRef.current = new LiveQuizRealtimeManager(supabaseRef.current);
  }, []);

  /**
   * Get or generate student ID from localStorage
   */
  const getOrGenerateStudentId = (): string => {
    if (typeof window === 'undefined') {
      return '';
    }

    let studentId = localStorage.getItem('student_id');
    if (!studentId) {
      // Generate a new UUID for anonymous student
      studentId = crypto.randomUUID?.() || `student_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem('student_id', studentId);
    }
    return studentId;
  };

  /**
   * Handle join code input change
   * Auto-uppercase and limit to 8 characters
   */
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') // Only alphanumeric
      .slice(0, 8);
    setJoinCode(value);
  };

  /**
   * Fetch current participant count
   */
  const fetchParticipantCount = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/live-quiz/${sessionId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        const participants = data.data || [];
        setParticipantCount(participants.length);
      }
    } catch (err) {
      log.debug('Failed to fetch participant count:', err);
    }
  };

  /**
   * Handle session update via realtime subscription
   */
  const handleSessionUpdate = (sessionData: SessionUpdateData) => {
    log.info('Session update received:', {
      status: sessionData.status,
      currentQuestionIndex: sessionData.current_question_index,
    });

    // If instructor has started the session and first question is available
    if (
      sessionData.status === 'live' &&
      sessionData.current_question_index !== null &&
      sessionData.current_question_index >= 0
    ) {
      log.info('First question available, redirecting to game-mode...');
      // Redirect to game-mode player
      if (sessionInfo) {
        router.push(
          `/student/quiz/${sessionData.quiz_id}/game-mode?session=${sessionData.id}&code=${sessionInfo.joinCode}`
        );
      }
    }
  };

  /**
   * Handle join form submission
   */
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate code format
      if (!joinCode || joinCode.length !== 8) {
        setError('Code must be 8 characters (e.g., AB12CD34)');
        setIsLoading(false);
        return;
      }

      // Get or generate student ID
      const studentId = getOrGenerateStudentId();
      if (!studentId) {
        setError('Failed to generate student ID');
        setIsLoading(false);
        return;
      }

      log.info(`Attempting to join with code ${joinCode}, studentId: ${studentId}`);

      // Call join endpoint
      const response = await fetch(`/api/live-quiz/${joinCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.message || 'Failed to join session';

        // Provide helpful error messages
        if (response.status === 400) {
          if (message.includes('expired')) {
            setError('This code is not active. Check with your instructor.');
          } else if (message.includes('not accepting')) {
            setError('This session has already ended');
          } else {
            setError('Invalid code. Please check and try again.');
          }
        } else if (response.status === 404) {
          setError('No active session with this code');
        } else {
          setError(message);
        }
        setIsLoading(false);
        return;
      }

      const data: JoinResponse = await response.json();
      if (!data.success || !data.data) {
        setError('Failed to join session');
        setIsLoading(false);
        return;
      }

      log.info('Successfully joined session:', data.data.sessionId);

      // Store session info
      setSessionInfo(data.data);
      setIsJoined(true);

      // Fetch initial participant count
      await fetchParticipantCount(data.data.sessionId);

      // Subscribe to session updates
      if (realtimeManagerRef.current) {
        realtimeManagerRef.current.subscribeToSessionUpdates(
          data.data.sessionId,
          (sessionData: any) => {
            // Update session info with quiz_id from realtime subscription
            setSessionInfo(prev => prev ? { ...prev, quizId: sessionData.quiz_id } : null);
            handleSessionUpdate(sessionData);
          },
          (err) => {
            log.error('Realtime subscription error:', err);
            setError('Connection lost. Please refresh to reconnect.');
          }
        );

        // Also subscribe to participant count updates
        realtimeManagerRef.current.subscribeToLeaderboard(
          data.data.sessionId,
          (participants) => {
            setParticipantCount(participants.length);
          },
          (err) => {
            log.debug('Leaderboard subscription error:', err);
          }
        );
      }
    } catch (err) {
      log.error('Error joining session:', err);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cleanup realtime subscriptions on unmount
   */
  useEffect(() => {
    return () => {
      if (sessionInfo && realtimeManagerRef.current) {
        realtimeManagerRef.current.unsubscribe(sessionInfo.sessionId);
      }
    };
  }, [sessionInfo]);

  // Waiting for instructor to start
  if (isJoined && sessionInfo) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: '30px' }}>
            <h1
              style={{
                color: '#1E3A5F',
                fontSize: '28px',
                fontWeight: 'bold',
                margin: '0 0 10px 0',
              }}
            >
              DailyAgile
            </h1>
            <p style={{ color: '#64748B', fontSize: '14px', margin: '0' }}>
              Accelerate Business Agility
            </p>
          </div>

          {/* Success Message */}
          <div style={{ marginBottom: '30px' }}>
            <div
              style={{
                fontSize: '48px',
                marginBottom: '15px',
              }}
            >
              ✅
            </div>
            <h2
              style={{
                color: '#1E3A5F',
                fontSize: '24px',
                fontWeight: '600',
                margin: '0 0 10px 0',
              }}
            >
              You&apos;re Joined!
            </h2>
            <p
              style={{
                color: '#64748B',
                fontSize: '16px',
                margin: '0 0 20px 0',
              }}
            >
              {sessionInfo.quizTitle}
            </p>
          </div>

          {/* Waiting Message */}
          <div
            style={{
              background: '#F0F7FA',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              borderLeft: '4px solid #0891B2',
            }}
          >
            <p
              style={{
                color: '#1E3A5F',
                fontSize: '16px',
                fontWeight: '500',
                margin: '0 0 10px 0',
              }}
            >
              Waiting for instructor to start the quiz...
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: '#0891B2',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: '#0891B2',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite 0.2s',
                }}
              />
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: '#0891B2',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite 0.4s',
                }}
              />
            </div>
          </div>

          {/* Participant Info */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
            }}
          >
            <p style={{ color: '#64748B', fontSize: '14px', margin: '0' }}>
              <strong style={{ color: '#1E3A5F' }}>
                {participantCount === 1 ? 'You are' : `You and ${participantCount - 1} other${participantCount === 2 ? '' : 's'}`}
              </strong>{' '}
              joined
            </p>
          </div>

          {/* Back Button */}
          <button
            onClick={() => {
              setIsJoined(false);
              setSessionInfo(null);
              setJoinCode('');
              if (sessionInfo && realtimeManagerRef.current) {
                realtimeManagerRef.current.unsubscribe(sessionInfo.sessionId);
              }
            }}
            style={{
              background: '#E2E8F0',
              color: '#1E3A5F',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ← Go Back
          </button>

          {/* Pulse animation */}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Initial join code form
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              color: '#1E3A5F',
              fontSize: '28px',
              fontWeight: 'bold',
              margin: '0 0 10px 0',
            }}
          >
            DailyAgile
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '0' }}>
            Accelerate Business Agility
          </p>
        </div>

        {/* Heading */}
        <h2
          style={{
            color: '#1E3A5F',
            fontSize: '24px',
            fontWeight: '600',
            margin: '0 0 10px 0',
          }}
        >
          Join Live Quiz Session
        </h2>

        <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 30px 0' }}>
          Ask your instructor for the 8-digit code
        </p>

        {/* Form */}
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Code Input */}
          <div>
            <label
              style={{
                display: 'block',
                color: '#1E293B',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
              }}
            >
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={handleCodeChange}
              placeholder="e.g. AB12CD34"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '18px',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              maxLength={8}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px',
                color: '#DC2626',
                fontSize: '14px',
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* Join Button */}
          <button
            type="submit"
            disabled={isLoading || joinCode.length !== 8}
            style={{
              background: '#0891B2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading || joinCode.length !== 8 ? 'not-allowed' : 'pointer',
              opacity: isLoading || joinCode.length !== 8 ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? '⏳ Joining...' : '→ Join Session'}
          </button>
        </form>

        {/* Help Text */}
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            background: '#F0F7FA',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#64748B',
            lineHeight: '1.6',
          }}
        >
          <strong style={{ color: '#1E3A5F' }}>Need help?</strong>
          <br />
          Ask your instructor for the 8-digit join code. The code should be displayed in your email or shared in
          class.
        </div>
      </div>
    </div>
  );
}
