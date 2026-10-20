'use client';

/**
 * Live Quiz Session Host Page
 * Instructor-only view for launching sessions, advancing questions,
 * and monitoring leaderboard in real-time.
 *
 * Route: /app/teach/quiz/live/[sessionId]
 * Requires: Instructor authentication
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('LiveQuizHost');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  darkGray: '#1E293B',
};

// Types
interface LiveQuizSession {
  id: string;
  status: 'pending' | 'live' | 'paused' | 'ended';
  currentQuestionIndex: number;
  currentQuestion: CurrentQuestion | null;
  totalQuestions: number;
  questionStartedAt: string | null;
  questionDurationSeconds: number;
  timeRemaining: number;
  participantCount: number;
}

interface CurrentQuestion {
  id: string;
  number: number;
  text: string;
  options: Array<{
    id: string;
    label: string;
    text: string;
  }>;
  points?: number;
  explanation?: string;
}

interface Participant {
  student_id: string;
  current_score: number;
  questions_answered: number;
}

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  score: number;
  questionsAnswered: number;
}

interface QuizInfo {
  title: string;
  totalQuestions: number;
}

export default function LiveQuizHostPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  // State: Session & Quiz Data
  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);

  // State: Real-time Data
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // State: UI & Loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [advancing, setAdvancing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);

  // Refs
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const copiedRef = useRef<boolean>(false);

  /**
   * Fetch current session state from API
   */
  // Takes the join code explicitly: right after loading the session, the state
  // in this closure is still empty.
  const fetchSessionState = async (code: string | null = joinCode) => {
    try {
      if (!code) return;

      const response = await fetch(`/api/live-quiz/${code}/state`, {
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Session not found');
          return;
        }
        throw new Error('Failed to fetch session state');
      }

      const data = await response.json();
      if (data.success) {
        // The state endpoint returns its fields at the top level; accept either shape.
        setSession(data.data ?? data);
        setConnectionStatus('connected');
      }
    } catch (err) {
      log.warn('Error fetching session state:', err);
      setConnectionStatus('reconnecting');
    }
  };

  /**
   * Fetch leaderboard data
   */
  const fetchLeaderboard = async () => {
    try {
      if (!joinCode) return;

      const response = await fetch(`/api/live-quiz/${joinCode}/leaderboard`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.data.leaderboard || []);
        setShowLeaderboard(data.data.isVisible || false);
      }
    } catch (err) {
      log.warn('Error fetching leaderboard:', err);
    }
  };

  /**
   * Fetch participants list
   */
  const fetchParticipants = async () => {
    try {
      if (!joinCode) return;

      const response = await fetch(`/api/live-quiz/${joinCode}/state`, {
        method: 'GET',
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.data.participantCount) {
        // Store participant count for display
        // Actual participants will be fetched via leaderboard (has full participant data)
      }
    } catch (err) {
      log.warn('Error fetching participants:', err);
    }
  };

  /**
   * Initial load: Get session info and join code from server
   */
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get session info and join code from API
        const response = await fetch(`/api/live-quiz/sessions/${sessionId}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.status === 404) {
          setError('Session not found. It may have expired or been deleted.');
          setLoading(false);
          return;
        }

        if (response.status === 403) {
          setError('You do not have permission to host this session.');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load session: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
          const sessionData = data.data;
          setJoinCode(sessionData.joinCode);
          setQuizInfo({
            title: sessionData.quizTitle,
            totalQuestions: sessionData.totalQuestions,
          });

          // Now fetch the full session state
          await fetchSessionState(sessionData.joinCode);
        } else {
          setError(data.error?.message || 'Failed to load session');
        }
      } catch (err) {
        log.error('Error initializing session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [sessionId]);

  /**
   * Set up polling for real-time updates
   */
  useEffect(() => {
    if (!joinCode || !session) return;

    // Poll every 500ms for state and leaderboard updates
    pollIntervalRef.current = setInterval(async () => {
      await Promise.all([fetchSessionState(), fetchLeaderboard(), fetchParticipants()]);
    }, 500);

    // Fetch immediately on interval start
    Promise.all([fetchSessionState(), fetchLeaderboard(), fetchParticipants()]);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [joinCode, session]);

  /**
   * Start the session (transition from pending to live)
   */
  const handleStartSession = async () => {
    if (!joinCode || session?.status !== 'pending') return;

    try {
      setStarting(true);
      setError(null);

      const response = await fetch(`/api/live-quiz/${joinCode}/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to start session');
      }

      // Refresh state
      await fetchSessionState();
    } catch (err) {
      log.error('Error starting session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  /**
   * Advance to next question
   */
  const handleNextQuestion = async () => {
    if (!joinCode || !session || advancing) return;

    try {
      setAdvancing(true);
      setError(null);

      const response = await fetch(`/api/live-quiz/${joinCode}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to advance question');
      }

      // Refresh state
      await fetchSessionState();
    } catch (err) {
      log.error('Error advancing question:', err);
      setError(err instanceof Error ? err.message : 'Failed to advance question');
    } finally {
      setAdvancing(false);
    }
  };

  /**
   * Toggle leaderboard visibility
   */
  const handleToggleLeaderboard = async () => {
    if (!joinCode || !session) return;

    try {
      setError(null);

      const response = await fetch(`/api/live-quiz/${joinCode}/toggle-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ show: !showLeaderboard }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle leaderboard');
      }

      setShowLeaderboard(!showLeaderboard);
      await fetchLeaderboard();
    } catch (err) {
      log.error('Error toggling leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle leaderboard');
    }
  };

  /**
   * End the session
   */
  const handleEndSession = async () => {
    if (!joinCode || !session || ending) return;

    const confirmed = window.confirm('Are you sure you want to end this session? Students will no longer be able to submit answers.');
    if (!confirmed) return;

    try {
      setEnding(true);
      setError(null);

      const response = await fetch(`/api/live-quiz/${joinCode}/end-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to end session');
      }

      // Refresh state
      await fetchSessionState();
    } catch (err) {
      log.error('Error ending session:', err);
      setError(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setEnding(false);
    }
  };

  /**
   * Copy join code to clipboard (with fallback)
   */
  const handleCopyJoinCode = async () => {
    if (!joinCode) return;

    try {
      // Try clipboard API first
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(joinCode);
        copiedRef.current = true;
        setTimeout(() => {
          copiedRef.current = false;
        }, 2000);
      }
    } catch (err) {
      log.warn('Clipboard API failed, users can triple-click to select', err);
    }
  };

  // ==================== RENDERING ====================

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: BRAND_COLORS.white,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: `4px solid ${BRAND_COLORS.light}`,
              borderTop: `4px solid ${BRAND_COLORS.teal}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: BRAND_COLORS.gray, fontSize: '16px' }}>Loading session...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div style={{ padding: '32px', backgroundColor: BRAND_COLORS.white, minHeight: '100vh' }}>
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '32px',
            backgroundColor: BRAND_COLORS.light,
            borderRadius: '8px',
            border: `2px solid ${BRAND_COLORS.navy}`,
          }}
        >
          <h1 style={{ color: BRAND_COLORS.navy, marginBottom: '16px' }}>Session Error</h1>
          <p style={{ color: BRAND_COLORS.darkGray, marginBottom: '24px', lineHeight: '1.6' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/teach/quiz/management')}
            style={{
              padding: '12px 24px',
              backgroundColor: BRAND_COLORS.teal,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Back to Quiz Management
          </button>
        </div>
      </div>
    );
  }

  if (!session || !quizInfo || !joinCode) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: BRAND_COLORS.white,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: BRAND_COLORS.gray, fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const isSessionLive = session.status === 'live';
  const isSessionEnded = session.status === 'ended';
  const canAdvance = isSessionLive && session.currentQuestionIndex < session.totalQuestions - 1;
  const questionsAnswered = leaderboard.reduce((sum, entry) => sum + entry.questionsAnswered, 0) / Math.max(1, leaderboard.length);

  return (
    <div style={{ backgroundColor: BRAND_COLORS.white, minHeight: '100vh' }}>
      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: BRAND_COLORS.orange,
            color: BRAND_COLORS.white,
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
        </div>
      )}

      {/* Header Section */}
      <div
        style={{
          padding: '24px',
          backgroundColor: BRAND_COLORS.navy,
          color: BRAND_COLORS.white,
          borderBottom: `2px solid ${BRAND_COLORS.teal}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{ margin: 0, marginBottom: '8px', fontSize: '28px', fontWeight: 'bold' }}>
                {quizInfo.title}
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Live Session Control</p>
            </div>
            <button
              onClick={() => router.push('/teach/quiz/management')}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: BRAND_COLORS.white,
                border: `2px solid ${BRAND_COLORS.white}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            >
              ← Back to List
            </button>
          </div>

          {/* Join Code Section */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              border: `2px dashed ${BRAND_COLORS.teal}`,
            }}
          >
            <p style={{ margin: 0, marginBottom: '8px', fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Share this code with your students:
            </p>
            <input
              type="text"
              value={joinCode}
              readOnly
              onClick={(e) => {
                (e.target as HTMLInputElement).select();
              }}
              title="Click to select, then press Ctrl+C (or Cmd+C) to copy"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '32px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                backgroundColor: BRAND_COLORS.white,
                color: BRAND_COLORS.navy,
                border: `2px solid ${BRAND_COLORS.teal}`,
                borderRadius: '6px',
                textAlign: 'center',
                letterSpacing: '4px',
                cursor: 'text',
                marginBottom: '12px',
              }}
            />
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8, fontStyle: 'italic' }}>
              Triple-click to select, then press Ctrl+C (or Cmd+C on Mac) to copy
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderBottom: '2px solid #DC2626',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#DC2626',
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left Column: Participant List */}
        <div>
          <div
            style={{
              backgroundColor: BRAND_COLORS.light,
              borderRadius: '8px',
              padding: '20px',
              border: `2px solid ${BRAND_COLORS.border}`,
              height: 'fit-content',
            }}
          >
            <h2 style={{ margin: '0 0 16px 0', color: BRAND_COLORS.navy, fontSize: '18px', fontWeight: 'bold' }}>
              Participants
            </h2>

            {/* Participant Count Badge */}
            <div
              style={{
                padding: '12px',
                backgroundColor: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                borderRadius: '6px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                {session.participantCount}
              </p>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                {session.participantCount === 1 ? 'Student' : 'Students'} joined
              </p>
            </div>

            {/* Status & Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ padding: '8px 12px', backgroundColor: BRAND_COLORS.white, borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color:
                      session.status === 'pending'
                        ? BRAND_COLORS.orange
                        : session.status === 'live'
                          ? BRAND_COLORS.teal
                          : session.status === 'paused'
                            ? BRAND_COLORS.gray
                            : BRAND_COLORS.navy,
                  }}
                >
                  {session.status.toUpperCase()}
                </p>
              </div>

              {session.status === 'pending' && session.participantCount > 0 && (
                <button
                  onClick={handleStartSession}
                  disabled={starting}
                  style={{
                    padding: '12px',
                    backgroundColor: starting ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                    color: BRAND_COLORS.white,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: starting ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!starting) e.currentTarget.style.backgroundColor = '#067A8C';
                  }}
                  onMouseLeave={(e) => {
                    if (!starting) e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
                  }}
                >
                  {starting ? 'Starting...' : '▶ Start Session'}
                </button>
              )}
            </div>

            {/* Instructions */}
            {session.status === 'pending' && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: BRAND_COLORS.white,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: BRAND_COLORS.darkGray,
                  lineHeight: '1.5',
                }}
              >
                <p style={{ margin: 0, marginBottom: '8px', fontWeight: 'bold' }}>Ready to start?</p>
                <ol style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>Share the code above with students</li>
                  <li>Wait for them to join (see count above)</li>
                  <li>Click "Start Session" when ready</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Question & Leaderboard */}
        <div>
          {/* Current Question */}
          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '8px',
              padding: '24px',
              border: `2px solid ${BRAND_COLORS.border}`,
              marginBottom: '24px',
            }}
          >
            <h2 style={{ margin: '0 0 16px 0', color: BRAND_COLORS.navy, fontSize: '18px', fontWeight: 'bold' }}>
              Current Question
            </h2>

            {session.status === 'pending' && (
              <div
                style={{
                  padding: '20px',
                  backgroundColor: BRAND_COLORS.light,
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: BRAND_COLORS.darkGray,
                }}
              >
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  Session not started yet
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                  Start the session to display the first question
                </p>
              </div>
            )}

            {isSessionLive && session.currentQuestion && (
              <>
                {/* Question Header */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: BRAND_COLORS.navy, fontSize: '18px', fontWeight: 'bold' }}>
                      Question {session.currentQuestion.number}
                    </h3>
                    {session.currentQuestion.points && (
                      <span
                        style={{
                          padding: '4px 12px',
                          backgroundColor: BRAND_COLORS.orange,
                          color: BRAND_COLORS.white,
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        {session.currentQuestion.points} pts
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: BRAND_COLORS.darkGray, fontSize: '16px', lineHeight: '1.6' }}>
                    {session.currentQuestion.text}
                  </p>
                </div>

                {/* Options */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '24px',
                  }}
                >
                  {session.currentQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: BRAND_COLORS.light,
                        borderRadius: '6px',
                        border: `2px solid ${BRAND_COLORS.border}`,
                        display: 'flex',
                        gap: '12px',
                      }}
                    >
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: BRAND_COLORS.teal,
                          color: BRAND_COLORS.white,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}
                      >
                        {option.label}
                      </span>
                      <p style={{ margin: 0, color: BRAND_COLORS.darkGray, fontSize: '14px', flex: 1, alignSelf: 'center' }}>
                        {option.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Timer */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: BRAND_COLORS.light,
                    borderRadius: '6px',
                    marginBottom: '24px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, marginBottom: '8px', textTransform: 'uppercase' }}>
                    Time Remaining
                  </p>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 'bold',
                      color: session.timeRemaining <= 10 ? BRAND_COLORS.orange : BRAND_COLORS.teal,
                    }}
                  >
                    {Math.max(0, session.timeRemaining)}s
                  </div>
                </div>
              </>
            )}

            {isSessionEnded && session.currentQuestion && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '6px',
                  border: `2px solid ${BRAND_COLORS.teal}`,
                  color: BRAND_COLORS.darkGray,
                }}
              >
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                  <strong>Session Ended</strong> — Last question shown: Question {session.currentQuestion.number}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          {isSessionLive && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <button
                onClick={handleNextQuestion}
                disabled={!canAdvance || advancing}
                style={{
                  padding: '12px 16px',
                  backgroundColor: !canAdvance || advancing ? BRAND_COLORS.gray : BRAND_COLORS.teal,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !canAdvance || advancing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (canAdvance && !advancing) e.currentTarget.style.backgroundColor = '#067A8C';
                }}
                onMouseLeave={(e) => {
                  if (canAdvance && !advancing) e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
                }}
                title={!canAdvance ? 'Quiz is complete — no more questions' : undefined}
              >
                {advancing ? 'Loading...' : '→ Next Question'}
              </button>

              <button
                onClick={handleToggleLeaderboard}
                style={{
                  padding: '12px 16px',
                  backgroundColor: showLeaderboard ? BRAND_COLORS.orange : BRAND_COLORS.gray,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = showLeaderboard ? '#C74312' : '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = showLeaderboard ? BRAND_COLORS.orange : BRAND_COLORS.gray;
                }}
              >
                {showLeaderboard ? '👁 Hide Leaderboard' : '🙈 Show Leaderboard'}
              </button>
            </div>
          )}

          {/* End Session Button */}
          <button
            onClick={handleEndSession}
            disabled={ending || isSessionEnded}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: isSessionEnded ? BRAND_COLORS.gray : BRAND_COLORS.navy,
              color: BRAND_COLORS.white,
              border: `2px solid ${BRAND_COLORS.orange}`,
              borderRadius: '6px',
              cursor: isSessionEnded || ending ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '24px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isSessionEnded && !ending) e.currentTarget.style.backgroundColor = '#0F2438';
            }}
            onMouseLeave={(e) => {
              if (!isSessionEnded && !ending) e.currentTarget.style.backgroundColor = BRAND_COLORS.navy;
            }}
            title={isSessionEnded ? 'Session already ended' : undefined}
          >
            {ending ? 'Ending...' : '⊗ End Session'}
          </button>

          {/* Leaderboard */}
          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '8px',
              padding: '24px',
              border: `2px solid ${BRAND_COLORS.border}`,
            }}
          >
            <h2 style={{ margin: '0 0 16px 0', color: BRAND_COLORS.navy, fontSize: '18px', fontWeight: 'bold' }}>
              Real-time Leaderboard
              {!showLeaderboard && !isSessionEnded && (
                <span style={{ fontSize: '12px', color: BRAND_COLORS.gray, marginLeft: '8px', fontWeight: 'normal' }}>
                  (hidden from students)
                </span>
              )}
            </h2>

            {leaderboard.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  backgroundColor: BRAND_COLORS.light,
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: BRAND_COLORS.gray,
                }}
              >
                <p style={{ margin: 0, fontSize: '14px' }}>No participants yet</p>
              </div>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  borderRadius: '6px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: BRAND_COLORS.navy,
                        color: BRAND_COLORS.white,
                      }}
                    >
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '50px' }}>Rank</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Student</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '100px' }}>Score</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '150px' }}>Answered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr
                        key={entry.studentId}
                        style={{
                          backgroundColor: index % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light,
                          borderBottom: `1px solid ${BRAND_COLORS.border}`,
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E0F2FE';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light;
                        }}
                      >
                        <td
                          style={{
                            padding: '12px',
                            fontWeight: 'bold',
                            color:
                              entry.rank === 1
                                ? BRAND_COLORS.orange
                                : entry.rank === 2
                                  ? BRAND_COLORS.teal
                                  : BRAND_COLORS.gray,
                          }}
                        >
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                        </td>
                        <td style={{ padding: '12px', color: BRAND_COLORS.darkGray }}>
                          {entry.studentId.substring(0, 8)}...
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: BRAND_COLORS.teal,
                            fontSize: '16px',
                          }}
                        >
                          {entry.score}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: BRAND_COLORS.gray }}>
                          {entry.questionsAnswered} / {session.totalQuestions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: BRAND_COLORS.light,
          borderTop: `2px solid ${BRAND_COLORS.border}`,
          marginTop: '40px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', textAlign: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', marginBottom: '4px' }}>
              Progress
            </p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy }}>
              Question {Math.max(1, session.currentQuestionIndex + 1)} of {session.totalQuestions}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', marginBottom: '4px' }}>
              Submission Status
            </p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.teal }}>
              {leaderboard.length}/{session.participantCount} answered
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', marginBottom: '4px' }}>
              Session Status
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 'bold',
                color:
                  session.status === 'pending'
                    ? BRAND_COLORS.orange
                    : session.status === 'live'
                      ? BRAND_COLORS.teal
                      : session.status === 'paused'
                        ? BRAND_COLORS.gray
                        : BRAND_COLORS.navy,
              }}
            >
              {session.status.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
