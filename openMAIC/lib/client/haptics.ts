/**
 * Haptic Feedback Utilities
 * Vibration feedback for mobile devices
 * Only works on devices with vibration support (most Android + some iOS)
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('Haptics');

/**
 * Check if device supports haptic feedback
 */
export function supportsHaptics(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // Check for Vibration API
  return !!(
    navigator.vibrate ||
    (navigator as any).webkitVibrate ||
    (navigator as any).mozVibrate ||
    (navigator as any).msVibrate
  );
}

/**
 * Get vibrate function (cross-browser)
 */
function getVibrateFunction(): ((pattern: number | number[]) => boolean) | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return (
    navigator.vibrate ||
    (navigator as any).webkitVibrate ||
    (navigator as any).mozVibrate ||
    (navigator as any).msVibrate ||
    null
  );
}

/**
 * Simple vibration - single pulse
 * @param duration - Milliseconds (typically 10-100)
 */
export function hapticPulse(duration: number = 50): boolean {
  const vibrate = getVibrateFunction();
  if (!vibrate) {
    log.debug('Haptics not supported');
    return false;
  }

  try {
    vibrate.call(navigator, duration);
    return true;
  } catch (err) {
    log.warn('Haptic feedback failed:', err);
    return false;
  }
}

/**
 * Double tap haptic - two quick pulses
 */
export function hapticDouble(pulseDuration: number = 30, gap: number = 20): void {
  hapticPulse(pulseDuration);
  setTimeout(() => {
    hapticPulse(pulseDuration);
  }, pulseDuration + gap);
}

/**
 * Success haptic - gentle pulse
 */
export function hapticSuccess(): boolean {
  return hapticPulse(40);
}

/**
 * Error haptic - stronger pulse
 */
export function hapticError(): boolean {
  return hapticPulse(100);
}

/**
 * Warning haptic - three short pulses
 */
export function hapticWarning(): void {
  hapticPulse(30);
  setTimeout(() => hapticPulse(30), 60);
  setTimeout(() => hapticPulse(30), 120);
}

/**
 * Selection/click haptic - light feedback
 */
export function hapticSelection(): boolean {
  return hapticPulse(20);
}

/**
 * Heavy haptic - strong feedback
 */
export function hapticHeavy(): boolean {
  return hapticPulse(150);
}

/**
 * Medium haptic - medium feedback
 */
export function hapticMedium(): boolean {
  return hapticPulse(80);
}

/**
 * Light haptic - very light feedback
 */
export function hapticLight(): boolean {
  return hapticPulse(30);
}

/**
 * Complex haptic pattern - arbitrary vibration sequence
 * @param pattern - Array of durations: [vibrate, pause, vibrate, pause, ...]
 * @example hapticPattern([50, 30, 50]) -> 50ms vibrate, 30ms pause, 50ms vibrate
 */
export function hapticPattern(pattern: number[]): boolean {
  const vibrate = getVibrateFunction();
  if (!vibrate) {
    return false;
  }

  try {
    vibrate.call(navigator, pattern);
    return true;
  } catch (err) {
    log.warn('Haptic pattern failed:', err);
    return false;
  }
}

/**
 * Cancel ongoing vibration
 */
export function hapticCancel(): boolean {
  const vibrate = getVibrateFunction();
  if (!vibrate) {
    return false;
  }

  try {
    vibrate.call(navigator, 0);
    return true;
  } catch (err) {
    log.warn('Failed to cancel haptics:', err);
    return false;
  }
}

/**
 * Quiz-specific haptics
 */
export const QuizHaptics = {
  /**
   * User selects an answer
   */
  answerSelected: () => hapticSelection(),

  /**
   * User submits an answer
   */
  answerSubmitted: () => hapticSuccess(),

  /**
   * Quiz submitted/completed
   */
  quizCompleted: () => hapticPattern([50, 50, 100]),

  /**
   * Timer is running out (< 10 seconds)
   */
  timerWarning: () => hapticWarning(),

  /**
   * Time is up
   */
  timeUp: () => hapticError(),

  /**
   * Navigation (next/previous question)
   */
  navigate: () => hapticLight(),

  /**
   * Sync started
   */
  syncStarted: () => hapticSelection(),

  /**
   * Sync completed
   */
  syncCompleted: () => hapticSuccess(),

  /**
   * Sync failed
   */
  syncFailed: () => hapticError(),

  /**
   * Long press detected
   */
  longPress: () => hapticDouble(50, 30),
};

/**
 * React Hook for haptics support
 */
export function useHaptics() {
  return {
    supported: supportsHaptics(),
    pulse: hapticPulse,
    success: hapticSuccess,
    error: hapticError,
    warning: hapticWarning,
    selection: hapticSelection,
    cancel: hapticCancel,
    quiz: QuizHaptics,
  };
}
