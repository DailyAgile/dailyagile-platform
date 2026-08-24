'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('GameModeQuiz');

interface Question {
  id: string;
  question_number: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
  timer_seconds: number;
}

interface StudentScore {
  id: string;
  name: string;
  score: number;
  answeredCount: number;
  isCurrentUser?: boolean;
  correctCount?: number;
}

interface Props {
  quizCode: string;
  quizTitle: string;
  totalQuestions?: number;
  studentName?: string;
  studentId?: string;
}

type GameState = 'name-entry' | 'quiz' | 'summary';

export default function GameModeQuiz({ quizCode, quizTitle, totalQuestions = 0, studentName: initialName = '', studentId }: Props) {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('name-entry');
  const [studentName, setStudentName] = useState(initialName);
  const [inputName, setInputName] = useState(initialName);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [leaderboard, setLeaderboard] = useState<StudentScore[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isInstructor, setIsInstructor] = useState(true); // Set to true for testing
  const [showInstructorPanel, setShowInstructorPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [summaryTab, setSummaryTab] = useState<'summary' | 'review' | 'leaderboard'>('summary');
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const THEME = {
    navy: '#1E3A5F',
    teal: '#0891B2',
    orange: '#EA580C',
    success: '#10B981',
    error: '#EF4444',
    white: '#FFFFFF',
    dark: '#1E293B',
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;

    setStudentName(inputName);
    setLoading(true);

    try {
      await loadQuiz();
      setGameState('quiz');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
    }
  };

  useEffect(() => {
    if (gameState !== 'quiz') return;

    // Reset timer when question changes
    setTimeLeft(60);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentQuestionIdx, gameState]);

  const playBackgroundMusic = () => {
    const musicUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    if (audioRef.current) {
      audioRef.current.src = musicUrl;
      audioRef.current.volume = 0.3;
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => log.info('Audio autoplay prevented:', err));
    }
  };

  const playSound = (type: 'correct' | 'incorrect' | 'next') => {
    const sounds = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      incorrect: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',
      next: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.5;
    audio.play().catch(err => log.info('Sound play failed:', err));
  };

  const loadQuiz = async () => {
    try {
      const response = await fetch(`/api/quiz/by-code/${quizCode}`);
      if (!response.ok) throw new Error('Quiz not found');

      const data = await response.json();
      const quizId = data.data.id;

      const questionsResponse = await fetch(`/api/quiz/${quizId}/questions`);
      if (!questionsResponse.ok) throw new Error('Failed to load questions');

      const questionsData = await questionsResponse.json();
      setQuestions(questionsData.data || []);

      // Initialize mock leaderboard
      setLeaderboard([
        { id: '1', name: 'Alex Chen', score: 0, answeredCount: 0, isCurrentUser: false, correctCount: 0 },
        { id: '2', name: 'Sarah Kim', score: 0, answeredCount: 0, isCurrentUser: false, correctCount: 0 },
        { id: 'current', name: studentName, score: 0, answeredCount: 0, isCurrentUser: true, correctCount: 0 },
      ]);

      playBackgroundMusic();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
      log.error('Error loading quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = () => {
    if (!answers[currentQuestionIdx]) {
      setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: '' }));
    }
    if (autoAdvance) {
      handleNextQuestion();
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const currentQuestion = questions[currentQuestionIdx];
    const isCorrect = answer === currentQuestion.correct_answer;

    setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: answer }));
    setCorrectAnswers((prev) => ({ ...prev, [currentQuestionIdx]: isCorrect }));
    setFeedbackCorrect(isCorrect);
    setShowFeedback(true);
    setShowExplanation(!isCorrect);

    playSound(isCorrect ? 'correct' : 'incorrect');

    // Update leaderboard if correct
    if (isCorrect) {
      setLeaderboard((prev) =>
        prev.map((student) =>
          student.isCurrentUser
            ? {
                ...student,
                score: student.score + 100,
                answeredCount: student.answeredCount + 1,
                correctCount: (student.correctCount || 0) + 1
              }
            : student
        )
      );
    } else {
      setLeaderboard((prev) =>
        prev.map((student) =>
          student.isCurrentUser
            ? { ...student, answeredCount: student.answeredCount + 1 }
            : student
        )
      );
    }

    // Auto-advance only if enabled
    if (autoAdvance) {
      setTimeout(handleNextQuestion, 3000);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      playSound('next');
      setCurrentQuestionIdx((prev) => prev + 1);
      setShowFeedback(false);
      setShowExplanation(false);
    } else {
      handleQuizEnd();
    }
  };

  const handleSkipQuestion = () => {
    playSound('next');
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: 'SKIPPED' }));
      setShowFeedback(false);
      setShowExplanation(false);
    } else {
      handleQuizEnd();
    }
  };

  const handleJumpToQuestion = (questionIdx: number) => {
    setCurrentQuestionIdx(questionIdx);
    setShowFeedback(false);
    setShowExplanation(false);
  };

  const handleQuizEnd = () => {
    setGameState('summary');
    log.info('Quiz completed');
  };

  const handleNameEntry = () => {
    return (
      <div style={styles.nameEntryContainer}>
        <div style={styles.nameEntryCard}>
          <h1 style={styles.nameEntryTitle}>🎮 Welcome to Game Mode</h1>

          {/* Quiz Name Section */}
          <div style={styles.quizInfoBox}>
            <div style={styles.quizNameSection}>
              <p style={styles.quizLabel}>Quiz:</p>
              <h2 style={styles.quizNameDisplay}>{quizTitle}</h2>
            </div>
            <div style={styles.quizMetaInfo}>
              <div style={styles.quizCodeSection}>
                <p style={styles.quizCodeLabel}>Quiz Code:</p>
                <p style={styles.quizCodeDisplay}>{quizCode}</p>
              </div>
              <div style={styles.quizQuestionsSection}>
                <p style={styles.quizQuestionsLabel}>Questions:</p>
                <p style={styles.quizQuestionsDisplay}>{totalQuestions}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleNameSubmit} style={styles.form}>
            <label style={styles.label}>Enter Your Name or Game Name</label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="e.g., Alex Chen or Phoenix"
              style={styles.input}
              autoFocus
            />
            <button type="submit" style={styles.startButton}>
              Start Game
            </button>
          </form>
        </div>
      </div>
    );
  };

  const handleSummary = () => {
    const yourScore = leaderboard.find(s => s.isCurrentUser);
    const totalPlayers = leaderboard.length;
    const correctAnswersCount = Object.values(correctAnswers).filter(v => v).length;
    const totalQuestions = questions.length;
    const passPercentage = ((correctAnswersCount / totalQuestions) * 100).toFixed(0);

    return (
      <div style={styles.summaryContainer}>
        <div style={styles.summaryCard}>
          {/* Tab Bar */}
          <div style={styles.tabBar}>
            <button
              onClick={() => setSummaryTab('summary')}
              style={{
                ...styles.tabButton,
                backgroundColor: summaryTab === 'summary' ? THEME.teal : 'transparent',
                color: summaryTab === 'summary' ? '#fff' : '#64748B',
              }}
            >
              📊 Summary
            </button>
            <button
              onClick={() => setSummaryTab('review')}
              style={{
                ...styles.tabButton,
                backgroundColor: summaryTab === 'review' ? THEME.teal : 'transparent',
                color: summaryTab === 'review' ? '#fff' : '#64748B',
              }}
            >
              📋 Detailed Review
            </button>
            <button
              onClick={() => setSummaryTab('leaderboard')}
              style={{
                ...styles.tabButton,
                backgroundColor: summaryTab === 'leaderboard' ? THEME.teal : 'transparent',
                color: summaryTab === 'leaderboard' ? '#fff' : '#64748B',
              }}
            >
              🏆 Leaderboard
            </button>
          </div>

          {/* Tab Content */}
          {summaryTab === 'summary' && (
            <>
          <div style={styles.summaryQuizInfo}>
            <p style={styles.summaryQuizLabel}>Quiz:</p>
            <h2 style={styles.summaryQuizName}>{quizTitle}</h2>
            <div style={styles.summaryQuizMeta}>
              <p style={styles.summaryQuizCode}>Code: {quizCode}</p>
              <p style={styles.summaryQuizQuestions}>Questions: {totalQuestions}</p>
            </div>
          </div>

          <h1 style={styles.summaryTitle}>🎉 Quiz Complete!</h1>

          <div style={styles.summaryStats}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Your Score</div>
              <div style={styles.statValue}>{yourScore?.score || 0} pts</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Correct Answers</div>
              <div style={styles.statValue}>{correctAnswersCount}/{totalQuestions}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Pass Rate</div>
              <div style={styles.statValue}>{passPercentage}%</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Total Players</div>
              <div style={styles.statValue}>{totalPlayers}</div>
            </div>
          </div>

          <div style={styles.leaderboardSummary}>
            <h2 style={styles.summaryLeaderboardTitle}>Final Standings</h2>
            {leaderboard.sort((a, b) => b.score - a.score).map((student, idx) => (
              <div key={student.id} style={styles.summaryLeaderboardItem}>
                <span style={styles.summaryRank}>#{idx + 1}</span>
                <span style={styles.summaryName}>{student.name}</span>
                <span style={styles.summaryScore}>{student.score} pts</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => window.location.reload()}
            style={styles.playAgainButton}
          >
            Play Again
          </button>
            </>
          )}

          {/* Detailed Review Tab */}
          {summaryTab === 'review' && (
            <>
              <div style={styles.summaryQuizInfo}>
                <p style={styles.summaryQuizLabel}>Quiz:</p>
                <h2 style={styles.summaryQuizName}>{quizTitle}</h2>
                <div style={styles.summaryQuizMeta}>
                  <p style={styles.summaryQuizCode}>Code: {quizCode}</p>
                  <p style={styles.summaryQuizQuestions}>Questions: {totalQuestions}</p>
                </div>
              </div>

              <h2 style={styles.summaryTitle}>📋 Detailed Review</h2>

              <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                {questions.map((q, idx) => {
                  const userAnswerKey = answers[idx];
                  const isCorrect = correctAnswers[idx];
                  const userAnswerText = userAnswerKey ?
                    q[`option_${userAnswerKey}` as keyof typeof q] : 'Not answered';

                  return (
                    <div
                      key={idx}
                      style={{
                        ...styles.reviewQuestion,
                        borderLeftColor: isCorrect ? '#10B981' : '#EF4444',
                      }}
                    >
                      <p style={styles.reviewQuestionNumber}>Question {idx + 1} {isCorrect ? '✅' : '❌'}</p>
                      <p style={styles.reviewQuestionText}>{q.question}</p>

                      <div style={styles.reviewAnswerRow}>
                        <div style={styles.reviewAnswerLabel}>Your Answer:</div>
                        <div style={{...styles.reviewAnswerValue, color: isCorrect ? '#10B981' : '#EF4444'}}>
                          {userAnswerKey ? `(${userAnswerKey.toUpperCase()}) ${userAnswerText}` : 'Not answered'}
                        </div>
                      </div>

                      {!isCorrect && (
                        <div style={styles.reviewAnswerRow}>
                          <div style={styles.reviewAnswerLabel}>Correct Answer:</div>
                          <div style={{...styles.reviewAnswerValue, color: '#10B981'}}>
                            {`(${q.correct_answer.toUpperCase()}) ${q[`option_${q.correct_answer}` as keyof typeof q]}`}
                          </div>
                          {q.explanation && (
                            <div style={styles.reviewExplanation}>
                              <strong>Explanation:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      )}

                      {isCorrect && q.explanation && (
                        <div style={styles.reviewExplanation}>
                          <strong>💡 Insight:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => window.location.reload()}
                style={styles.playAgainButton}
              >
                Play Again
              </button>
            </>
          )}

          {/* Leaderboard Tab */}
          {summaryTab === 'leaderboard' && (
            <>
              <div style={styles.summaryQuizInfo}>
                <p style={styles.summaryQuizLabel}>Quiz:</p>
                <h2 style={styles.summaryQuizName}>{quizTitle}</h2>
                <div style={styles.summaryQuizMeta}>
                  <p style={styles.summaryQuizCode}>Code: {quizCode}</p>
                  <p style={styles.summaryQuizQuestions}>Players: {totalPlayers}</p>
                </div>
              </div>

              <h2 style={styles.summaryTitle}>🏆 Final Leaderboard</h2>

              <div style={styles.leaderboardSummary}>
                {leaderboard.sort((a, b) => b.score - a.score).map((student, idx) => (
                  <div
                    key={student.id}
                    style={{
                      ...styles.summaryLeaderboardItem,
                      backgroundColor: student.isCurrentUser ? '#F0F7FA' : 'transparent',
                      fontWeight: student.isCurrentUser ? 'bold' : 'normal',
                    }}
                  >
                    <span style={{...styles.summaryRank, fontSize: idx < 3 ? '18px' : '14px'}}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span style={{...styles.summaryName, color: student.isCurrentUser ? THEME.teal : '#1E3A5F'}}>
                      {student.name} {student.isCurrentUser ? ' (You)' : ''}
                    </span>
                    <span style={{...styles.summaryScore, color: student.isCurrentUser ? THEME.teal : '#10B981'}}>
                      {student.score} pts
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => window.location.reload()}
                style={styles.playAgainButton}
              >
                Play Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (gameState === 'name-entry') {
    return handleNameEntry();
  }

  if (gameState === 'summary') {
    return handleSummary();
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loader}>
          <div style={styles.spinnerRing}></div>
          <p>Loading Quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <h2>❌ Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>No questions found</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const options = [
    { key: 'a', label: 'A', text: currentQuestion.option_a },
    { key: 'b', label: 'B', text: currentQuestion.option_b },
    { key: 'c', label: 'C', text: currentQuestion.option_c },
    { key: 'd', label: 'D', text: currentQuestion.option_d },
    { key: 'e', label: 'E', text: currentQuestion.option_e },
  ];

  const selectedAnswer = answers[currentQuestionIdx];
  const timerColor = timeLeft > 20 ? THEME.teal : timeLeft > 10 ? THEME.orange : THEME.error;
  const topStudents = leaderboard.slice(0, 3).sort((a, b) => b.score - a.score);

  return (
    <div style={styles.container}>
      <audio ref={audioRef} />

      {/* NAVIGATION BUTTONS */}
      <div style={{ display: 'flex', gap: '12px', padding: '12px 20px', backgroundColor: '#f5f5f5' }}>
        <button
          onClick={() => router.back()}
          style={{
            backgroundColor: THEME.white,
            color: THEME.teal,
            border: `1px solid ${THEME.teal}`,
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => router.push('/teach/quiz/management')}
          style={{
            backgroundColor: THEME.white,
            color: THEME.navy,
            border: `1px solid #ccc`,
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          📋 Quizzes
        </button>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{quizTitle}</h1>
          <div style={styles.headerSubInfo}>
            <p style={styles.studentNameDisplay}>Player: {studentName}</p>
            <p style={styles.quizCodeHeaderDisplay}>Code: {quizCode}</p>
          </div>
        </div>
        <div style={{ ...styles.timerBox, borderColor: timerColor }}>
          <div style={{ ...styles.timerCircle, borderColor: timerColor }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: timerColor }}>{timeLeft}</div>
            <div style={{ fontSize: '11px', color: '#fff', marginTop: '5px' }}>secs</div>
          </div>
        </div>
      </div>

      <div style={{
        ...styles.mainContent,
        gridTemplateColumns: isMobile ? '1fr' : '240px 1fr 210px',
        gap: isMobile ? '0' : '18px',
      }}>
        {/* Left Column: Leaderboard */}
        {!isMobile && (
        <div style={styles.leftColumn}>
          <div style={styles.leaderboardCard}>
            <h3 style={styles.leaderboardTitle}>🏆 Top Scores</h3>
            <div style={styles.leaderboardList}>
              {leaderboard.sort((a, b) => b.score - a.score).map((student, idx) => (
                <div
                  key={student.id}
                  style={{
                    ...styles.leaderboardItem,
                    backgroundColor: student.isCurrentUser ? THEME.teal : THEME.navy,
                  }}
                >
                  <span style={styles.leaderboardRank}>{idx + 1}</span>
                  <div style={styles.leaderboardInfo}>
                    <div style={styles.leaderboardName}>
                      {student.name} {student.isCurrentUser ? '(You)' : ''}
                    </div>
                    <div style={styles.leaderboardScore}>{student.score} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Center: Question & Answers */}
        <div style={styles.questionArea}>
          {/* Progress */}
          <div style={styles.progressIndicator}>
            <div style={styles.progressText}>
              Question {currentQuestionIdx + 1} of {questions.length}
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((currentQuestionIdx + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div style={styles.questionCard}>
            <h2 style={styles.questionText}>{currentQuestion.question}</h2>

            {/* Answer Options */}
            <div style={styles.optionsGrid}>
              {options.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleAnswerSelect(option.key.toUpperCase())}
                  disabled={showFeedback}
                  style={{
                    ...styles.optionButton,
                    backgroundColor:
                      selectedAnswer === option.key.toUpperCase()
                        ? feedbackCorrect
                          ? THEME.success
                          : THEME.error
                        : selectedAnswer && option.key.toUpperCase() === currentQuestion.correct_answer
                        ? THEME.success
                        : THEME.white,
                    color: selectedAnswer === option.key.toUpperCase() || (selectedAnswer && option.key.toUpperCase() === currentQuestion.correct_answer) ? THEME.white : THEME.dark,
                    border: `2px solid ${
                      selectedAnswer === option.key.toUpperCase()
                        ? feedbackCorrect
                          ? THEME.success
                          : THEME.error
                        : THEME.teal
                    }`,
                    opacity: showFeedback && selectedAnswer !== option.key.toUpperCase() && option.key.toUpperCase() !== currentQuestion.correct_answer ? 0.5 : 1,
                  }}
                >
                  <span style={styles.optionLabel}>{option.label}</span>
                  <span style={styles.optionText}>{option.text}</span>
                </button>
              ))}
            </div>

            {/* Feedback Message */}
            {showFeedback && (
              <div
                style={{
                  ...styles.feedbackBox,
                  backgroundColor: feedbackCorrect ? THEME.success : THEME.error,
                }}
              >
                {feedbackCorrect ? '🎉 Correct!' : '❌ Incorrect'}
              </div>
            )}

            {/* Explanation (shown when incorrect) */}
            {showExplanation && showFeedback && (
              <div style={styles.explanationBox}>
                <h4 style={styles.explanationTitle}>📚 Explanation</h4>
                <p style={styles.explanationText}>{currentQuestion.explanation}</p>
                <div style={styles.readingMaterial}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📖 Additional Reading:</p>
                  <ul style={styles.readingList}>
                    <li>Review the course module for more details</li>
                    <li>Check the supplementary materials section</li>
                    <li>Practice similar questions to strengthen understanding</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Instructor Controls & Next Button */}
            {showFeedback && (
              <div style={styles.controlsSection}>
                <div style={styles.autoAdvanceControl}>
                  <input
                    type="checkbox"
                    id="autoAdvance"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <label htmlFor="autoAdvance" style={styles.checkboxLabel}>
                    Auto-advance to next question
                  </label>
                </div>
                <button
                  onClick={handleNextQuestion}
                  style={styles.nextButton}
                >
                  Next Question →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timer, Progress, Players */}
        <div style={styles.rightColumn}>

          {/* Question Minimap */}
          <div style={styles.minimapCard}>
            <h3 style={styles.minimapTitle}>Questions Progress</h3>
            <div style={{
              ...styles.minimap,
              gridTemplateColumns: isMobile ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)',
            }}>
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.minimapDot,
                    width: isMobile ? '30px' : '40px',
                    height: isMobile ? '30px' : '40px',
                    backgroundColor:
                      idx === currentQuestionIdx
                        ? THEME.orange
                        : correctAnswers[idx]
                        ? THEME.success
                        : answers[idx]
                        ? THEME.error
                        : THEME.teal,
                    opacity: idx === currentQuestionIdx ? 1 : 0.7,
                    transform: idx === currentQuestionIdx ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={`Question ${idx + 1}`}
                >
                  <span style={{
                    ...styles.minimapDotText,
                    fontSize: isMobile ? '8px' : '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%',
                  }}>{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Players */}
          <div style={styles.playersCard}>
            <h3 style={styles.playersTitle}>👥 Players</h3>
            <div style={styles.playersCount}>{leaderboard.length}</div>
            <div style={styles.playersLabel}>Students in Game</div>
          </div>
        </div>
      </div>

      {/* Floating Instructor Testing Panel (Bottom) */}
      {isInstructor && (
        <div style={{
          ...styles.floatingInstructorPanel,
          maxHeight: showInstructorPanel ? '380px' : '50px',
        }}>
          {/* Toggle Bar */}
          <div style={styles.instructorToggleBar}>
            <span style={styles.instructorBadge}>👨‍🏫 INSTRUCTOR MODE - Q{currentQuestionIdx + 1}/{questions.length}</span>
            <button
              onClick={() => setShowInstructorPanel(!showInstructorPanel)}
              style={styles.togglePanelBtn}
            >
              {showInstructorPanel ? '▲ Hide Controls' : '▼ Show Controls'}
            </button>
          </div>

          {/* Expandable Content */}
          {showInstructorPanel && (
            <div style={styles.instructorControlsExpanded}>
              {/* Section 1: Navigation Controls */}
              <div style={styles.controlSection}>
                <div style={styles.sectionLabel}>Navigation</div>
                <div style={styles.controlRowExpanded}>
                  <button
                    onClick={handleSkipQuestion}
                    style={styles.skipBtnExpanded}
                  >
                    ⏭️ Skip
                  </button>
                </div>
              </div>

              {/* Section 2: Jump Controls */}
              <div style={styles.controlSection}>
                <div style={styles.sectionLabel}>Jump to Question</div>

                {/* Quick Jump Buttons */}
                <div style={styles.jumpSectionExpanded}>
                  <div style={{
                    ...styles.jumpButtonsGridExpanded,
                    gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(40px, 1fr))' : 'repeat(auto-fit, minmax(50px, 1fr))',
                  }}>
                    {[1, 5, 10, 15, 20].map((qNum) => (
                      questions.length >= qNum && (
                        <button
                          key={qNum}
                          onClick={() => handleJumpToQuestion(qNum - 1)}
                          style={{
                            ...styles.jumpBtnExpanded,
                            backgroundColor: currentQuestionIdx === qNum - 1 ? THEME.orange : THEME.teal,
                            transform: currentQuestionIdx === qNum - 1 ? 'scale(1.1)' : 'scale(1)',
                            fontSize: isMobile ? '10px' : '11px',
                            padding: isMobile ? '6px 8px' : '8px 10px',
                          }}
                        >
                          Q{qNum}
                        </button>
                      )
                    ))}
                  </div>
                </div>

                {/* Jump to Any */}
                <select
                  onChange={(e) => handleJumpToQuestion(parseInt(e.target.value) - 1)}
                  value={currentQuestionIdx + 1}
                  style={styles.jumpSelectExpanded}
                >
                  {questions.map((_, idx) => (
                    <option key={idx} value={idx + 1}>
                      Q{idx + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 3: Settings */}
              <div style={styles.controlSection}>
                <div style={styles.sectionLabel}>Settings</div>
                <div style={styles.autoAdvanceControl}>
                  <input
                    type="checkbox"
                    id="autoAdvanceInstructor"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    style={{...styles.checkbox, accentColor: '#EA580C'}}
                  />
                  <label htmlFor="autoAdvanceInstructor" style={{fontSize: '13px', color: '#fff', fontWeight: 'bold', cursor: 'pointer'}}>
                    Auto-advance questions
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
    padding: '20px 20px 250px 20px',
    fontFamily: 'Calibri, sans-serif',
  },
  nameEntryContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
    padding: '20px',
  },
  nameEntryCard: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '60px 40px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  nameEntryTitle: {
    fontSize: '40px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 10px 0',
  },
  nameEntrySubtitle: {
    fontSize: '16px',
    color: '#0891B2',
    margin: '0 0 40px 0',
  },
  quizInfoBox: {
    backgroundColor: '#F0F7FA',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '30px',
    border: '2px solid #0891B2',
  },
  quizNameSection: {
    marginBottom: '15px',
  },
  quizLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  quizNameDisplay: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0',
    lineHeight: '1.4',
  },
  quizMetaInfo: {
    paddingTop: '15px',
    borderTop: '1px solid #0891B2',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  quizCodeSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  quizCodeLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  quizCodeDisplay: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#EA580C',
    margin: '0',
    fontFamily: 'monospace',
    letterSpacing: '1px',
  },
  quizQuestionsSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  quizQuestionsLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  quizQuestionsDisplay: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#10B981',
    margin: '0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'left',
  },
  input: {
    padding: '15px 20px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid #0891B2',
    fontFamily: 'Calibri, sans-serif',
  },
  startButton: {
    padding: '15px 30px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#0891B2',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  summaryContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
    padding: '20px',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '60px 40px',
    maxWidth: '700px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  summaryQuizInfo: {
    backgroundColor: '#F0F7FA',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '30px',
    borderLeft: '4px solid #0891B2',
  },
  summaryQuizLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
  },
  summaryQuizName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 12px 0',
  },
  summaryQuizMeta: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  summaryQuizCode: {
    fontSize: '13px',
    color: '#EA580C',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    margin: '0',
  },
  summaryQuizQuestions: {
    fontSize: '13px',
    color: '#10B981',
    fontWeight: 'bold',
    margin: '0',
  },
  summaryTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 40px 0',
    textAlign: 'center',
  },
  summaryStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '40px',
  },
  statBox: {
    backgroundColor: '#F0F7FA',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748B',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#0891B2',
  },
  leaderboardSummary: {
    backgroundColor: '#F0F7FA',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
  },
  summaryLeaderboardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 15px 0',
  },
  summaryLeaderboardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #E2E8F0',
    fontSize: '14px',
  },
  summaryRank: {
    fontWeight: 'bold',
    color: '#0891B2',
    minWidth: '40px',
  },
  summaryName: {
    flex: 1,
    color: '#1E3A5F',
  },
  summaryScore: {
    fontWeight: 'bold',
    color: '#10B981',
  },
  playAgainButton: {
    width: '100%',
    padding: '15px 30px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#0891B2',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  tabBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    borderBottom: '2px solid #E2E8F0',
    paddingBottom: '0px',
  },
  tabButton: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  reviewQuestion: {
    backgroundColor: '#F0F7FA',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    borderLeft: '4px solid #0891B2',
  },
  reviewQuestionNumber: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
  },
  reviewQuestionText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 15px 0',
  },
  reviewAnswerRow: {
    marginBottom: '12px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  reviewAnswerIncorrect: {
    borderLeft: '4px solid #EF4444',
  },
  reviewAnswerCorrect: {
    borderLeft: '4px solid #10B981',
  },
  reviewAnswerLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '6px',
    color: '#1E3A5F',
  },
  reviewAnswerValue: {
    fontSize: '13px',
    color: '#64748B',
    marginBottom: '8px',
  },
  reviewExplanation: {
    fontSize: '13px',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: '10px',
    borderRadius: '6px',
    marginTop: '8px',
    borderLeft: '3px solid #D97706',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: '#fff',
  },
  spinnerRing: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid #fff',
    borderRadius: '50%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    marginTop: '20px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 0 8px 0',
    lineHeight: '1.3',
  },
  headerSubInfo: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  studentNameDisplay: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.9)',
    margin: '0',
  },
  quizCodeHeaderDisplay: {
    fontSize: '13px',
    color: 'rgba(255,165,0,0.95)',
    margin: '0',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timerBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    border: '4px solid #EA580C',
    boxShadow: '0 0 30px rgba(234,88,12,0.6)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timerCircle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '125px',
    height: '125px',
    borderRadius: '50%',
    border: '3px solid',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, auto)',
    gap: '30px',
    marginBottom: '40px',
  },
  questionArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  progressIndicator: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  progressText: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  progressBar: {
    height: '8px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    transition: 'width 0.3s ease',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '25px 30px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  questionText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 30px 0',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    marginBottom: '15px',
  },
  optionButton: {
    padding: '16px 18px',
    borderRadius: '10px',
    border: '2px solid #0891B2',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
    minHeight: 'auto',
  },
  optionLabel: {
    backgroundColor: '#0891B2',
    color: '#fff',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  optionText: {
    textAlign: 'left',
    color: 'inherit',
  },
  feedbackBox: {
    padding: '15px 20px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    animation: 'slideIn 0.3s ease',
    marginBottom: '15px',
  },
  explanationBox: {
    backgroundColor: '#FEF3C7',
    border: '2px solid #F59E0B',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  explanationTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#D97706',
    margin: '0 0 10px 0',
  },
  explanationText: {
    fontSize: '14px',
    color: '#92400E',
    margin: '0 0 15px 0',
    lineHeight: '1.6',
  },
  readingMaterial: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400E',
  },
  readingList: {
    margin: '0',
    paddingLeft: '20px',
  },
  controlsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #E2E8F0',
  },
  autoAdvanceControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#EA580C',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#1E3A5F',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  nextButton: {
    padding: '15px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#0891B2',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  leaderboardCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  leaderboardTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 10px 0',
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 10px',
    borderRadius: '8px',
    color: '#fff',
  },
  leaderboardRank: {
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '24px',
  },
  leaderboardInfo: {
    flex: 1,
    minWidth: 0,
  },
  leaderboardName: {
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  leaderboardScore: {
    fontSize: '11px',
    opacity: 0.85,
  },
  minimapCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  minimapTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 15px 0',
  },
  minimap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  minimapDot: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  },
  minimapDotText: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: '1',
    margin: '0',
    padding: '0',
  },
  playersCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  playersTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1E3A5F',
    margin: '0 0 10px 0',
  },
  playersCount: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#0891B2',
  },
  playersLabel: {
    fontSize: '12px',
    color: '#64748B',
    marginTop: '5px',
  },
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    color: '#1E3A5F',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  floatingInstructorPanel: {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    backgroundColor: '#EA580C',
    boxShadow: '0 -4px 20px rgba(234,88,12,0.4)',
    zIndex: 1000,
    transition: 'max-height 0.3s ease',
    overflow: 'hidden',
  },
  instructorToggleBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
    minHeight: '50px',
  },
  instructorBadge: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
  togglePanelBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  instructorControlsExpanded: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '330px',
    overflowY: 'auto',
  },
  controlSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.9,
  },
  controlRowExpanded: {
    display: 'flex',
    gap: '10px',
  },
  skipBtnExpanded: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    color: '#EA580C',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  jumpSectionExpanded: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  jumpLabelExpanded: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  jumpButtonsGridExpanded: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))',
    gap: '6px',
  },
  jumpBtnExpanded: {
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  jumpSelectExpanded: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    color: '#EA580C',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'Calibri, sans-serif',
    maxWidth: '100%',
  },
  instructorControls: {
    marginTop: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  controlRow: {
    display: 'flex',
    gap: '10px',
  },
  skipBtn: {
    flex: 1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    color: '#EA580C',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  jumpSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  jumpLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
  },
  jumpButtonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  jumpBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  jumpSelect: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    color: '#EA580C',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'Calibri, sans-serif',
  },
  testingInfo: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.2)',
  },
};
