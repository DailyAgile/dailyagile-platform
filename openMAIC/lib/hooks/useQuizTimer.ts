'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseQuizTimerProps {
  totalSeconds: number;
  enabled: boolean;
  onTimeUp?: () => void;
  onTick?: (secondsLeft: number) => void;
}

export function useQuizTimer({
  totalSeconds,
  enabled,
  onTimeUp,
  onTick,
}: UseQuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(enabled);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledTimeUpRef = useRef(false);

  useEffect(() => {
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    setIsActive(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;

        if (newTime <= 0) {
          setIsActive(false);
          if (!hasCalledTimeUpRef.current && onTimeUp) {
            hasCalledTimeUpRef.current = true;
            onTimeUp();
          }
          return 0;
        }

        onTick?.(newTime);
        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onTimeUp, onTick]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    setIsActive(true);
  }, []);

  const reset = useCallback(() => {
    setTimeLeft(totalSeconds);
    hasCalledTimeUpRef.current = false;
    setIsActive(enabled);
  }, [totalSeconds, enabled]);

  const addTime = useCallback((seconds: number) => {
    setTimeLeft(prev => Math.max(0, prev + seconds));
  }, []);

  // Format time as MM:SS
  const formattedTime = useCallback(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  // Get time status: 'critical' (< 10s), 'warning' (< 30s), 'normal'
  const timeStatus = useCallback(() => {
    if (timeLeft <= 10) return 'critical';
    if (timeLeft <= 30) return 'warning';
    return 'normal';
  }, [timeLeft]);

  return {
    timeLeft,
    isActive,
    pause,
    resume,
    reset,
    addTime,
    formattedTime,
    timeStatus,
    isTimeUp: timeLeft === 0,
  };
}
