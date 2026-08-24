'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  answeredAt: number;
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>;
  flaggedQuestions: Set<string>;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
}

interface UseQuizPlayerProps {
  totalQuestions: number;
  onAutoSave?: (answers: Record<string, string | string[]>) => Promise<void>;
  autoSaveDelay?: number;
}

export function useQuizPlayer({
  totalQuestions,
  onAutoSave,
  autoSaveDelay = 500,
}: UseQuizPlayerProps) {
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    flaggedQuestions: new Set(),
    autoSaveStatus: 'idle',
    lastSavedAt: null,
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Auto-save debounced
  useEffect(() => {
    if (!onAutoSave || isSavingRef.current) return;

    const doAutoSave = async () => {
      try {
        isSavingRef.current = true;
        setState(prev => ({ ...prev, autoSaveStatus: 'saving' }));
        await onAutoSave(state.answers);
        setState(prev => ({
          ...prev,
          autoSaveStatus: 'saved',
          lastSavedAt: Date.now(),
        }));
        // Reset status after 2 seconds
        setTimeout(() => {
          setState(prev =>
            prev.autoSaveStatus === 'saved' ? { ...prev, autoSaveStatus: 'idle' } : prev
          );
        }, 2000);
      } catch (error) {
        setState(prev => ({ ...prev, autoSaveStatus: 'error' }));
      } finally {
        isSavingRef.current = false;
      }
    };

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(doAutoSave, autoSaveDelay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state.answers, onAutoSave, autoSaveDelay]);

  const setAnswer = useCallback(
    (questionIndex: number, answer: string | string[]) => {
      setState(prev => ({
        ...prev,
        answers: {
          ...prev.answers,
          [questionIndex]: answer,
        },
      }));
    },
    []
  );

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: index,
      }));
    }
  }, [totalQuestions]);

  const nextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: Math.min(
        prev.currentQuestionIndex + 1,
        totalQuestions - 1
      ),
    }));
  }, [totalQuestions]);

  const previousQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(prev.currentQuestionIndex - 1, 0),
    }));
  }, []);

  const toggleFlag = useCallback((questionIndex: number) => {
    setState(prev => {
      const newFlagged = new Set(prev.flaggedQuestions);
      if (newFlagged.has(String(questionIndex))) {
        newFlagged.delete(String(questionIndex));
      } else {
        newFlagged.add(String(questionIndex));
      }
      return {
        ...prev,
        flaggedQuestions: newFlagged,
      };
    });
  }, []);

  const isQuestionAnswered = useCallback(
    (index: number): boolean => {
      const answer = state.answers[index];
      if (Array.isArray(answer)) {
        return answer.length > 0;
      }
      return !!answer;
    },
    [state.answers]
  );

  const isQuestionFlagged = useCallback(
    (index: number): boolean => {
      return state.flaggedQuestions.has(String(index));
    },
    [state.flaggedQuestions]
  );

  const getAnswerProgress = useCallback((): { answered: number; total: number } => {
    const answered = Object.keys(state.answers).filter(key => {
      const answer = state.answers[key];
      if (Array.isArray(answer)) return answer.length > 0;
      return !!answer;
    }).length;
    return { answered, total: totalQuestions };
  }, [state.answers, totalQuestions]);

  return {
    ...state,
    setAnswer,
    goToQuestion,
    nextQuestion,
    previousQuestion,
    toggleFlag,
    isQuestionAnswered,
    isQuestionFlagged,
    getAnswerProgress,
  };
}
