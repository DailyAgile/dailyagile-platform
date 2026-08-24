'use client';

import { useState, useEffect, useCallback } from 'react';
import { QuizView } from './quiz-view';
import { EmailVerificationGate } from '../quiz/EmailVerificationGate';
import type { QuizQuestion } from '@/lib/types/stage';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizViewWithGate');

interface QuizViewWithGateProps {
  readonly questions: QuizQuestion[];
  readonly sceneId: string;
}

/**
 * Quiz wrapper that enforces email verification before allowing quiz start
 * Manages student identity via verification token stored in session storage
 */
export function QuizViewWithGate({ questions, sceneId }: QuizViewWithGateProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if student already has a valid session token
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedToken = sessionStorage.getItem('quiz_session_token');
        const storedStudentId = sessionStorage.getItem('quiz_student_id');

        if (storedToken && storedStudentId) {
          // Verify token is still valid by checking if it's recent
          const tokenTimestamp = sessionStorage.getItem('quiz_token_timestamp');
          if (tokenTimestamp) {
            const ageHours = (Date.now() - parseInt(tokenTimestamp)) / (1000 * 60 * 60);
            if (ageHours < 24) {
              // Token is still valid (< 24 hours old)
              setSessionToken(storedToken);
              setStudentId(storedStudentId);
              setIsVerified(true);
              log.debug(`Existing session restored for student: ${storedStudentId}`);
            }
          }
        }
      } catch (error) {
        log.warn('Error checking existing session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const handleVerified = useCallback((token: string, id: string) => {
    // Store verification in session storage for future visits
    sessionStorage.setItem('quiz_session_token', token);
    sessionStorage.setItem('quiz_student_id', id);
    sessionStorage.setItem('quiz_token_timestamp', Date.now().toString());

    setSessionToken(token);
    setStudentId(id);
    setIsVerified(true);

    log.info(`Student verified: ${id}`);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-spin">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return <EmailVerificationGate quizId={sceneId} onVerified={handleVerified} />;
  }

  // Student is verified, render the actual quiz
  return <QuizView questions={questions} sceneId={sceneId} sessionToken={sessionToken} studentId={studentId} />;
}
