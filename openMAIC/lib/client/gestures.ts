/**
 * Mobile Gesture Support
 * Swipe detection for quiz navigation
 */

'use client';

import React from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('Gestures');

export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  angle: number;
  velocity: number;
}

export interface GestureConfig {
  minSwipeDistance?: number; // pixels, default 50
  maxSwipeAngle?: number; // degrees from horizontal, default 30
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  longPressDuration?: number; // ms, default 500
}

/**
 * Swipe detector using touch events
 */
export class GestureDetector {
  private element: HTMLElement;
  private config: Required<GestureConfig>;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  private longPressTimer: NodeJS.Timeout | null = null;

  constructor(element: HTMLElement, config: GestureConfig = {}) {
    this.element = element;
    this.config = {
      minSwipeDistance: config.minSwipeDistance ?? 50,
      maxSwipeAngle: config.maxSwipeAngle ?? 30,
      onSwipeLeft: config.onSwipeLeft ?? (() => {}),
      onSwipeRight: config.onSwipeRight ?? (() => {}),
      onSwipeUp: config.onSwipeUp ?? (() => {}),
      onSwipeDown: config.onSwipeDown ?? (() => {}),
      onLongPress: config.onLongPress ?? (() => {}),
      longPressDuration: config.longPressDuration ?? 500,
    };

    this.attachListeners();
  }

  private attachListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), false);
  }

  private handleTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].clientX;
    this.touchStartY = e.changedTouches[0].clientY;
    this.touchStartTime = Date.now();

    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      this.config.onLongPress();
    }, this.config.longPressDuration);

    log.debug('Touch start:', { x: this.touchStartX, y: this.touchStartY });
  }

  private handleTouchMove(e: TouchEvent): void {
    // Cancel long press if moving
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    this.touchEndX = e.changedTouches[0].clientX;
    this.touchEndY = e.changedTouches[0].clientY;

    // Cancel long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    this.detectSwipe();
  }

  private handleTouchCancel(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private detectSwipe(): void {
    const distanceX = this.touchEndX - this.touchStartX;
    const distanceY = this.touchEndY - this.touchStartY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    const timeTaken = Date.now() - this.touchStartTime;
    const velocity = distance / (timeTaken + 1); // pixels per ms

    // Check if swipe distance is sufficient
    if (distance < this.config.minSwipeDistance) {
      log.debug('Swipe distance too short:', distance);
      return;
    }

    // Calculate angle (0° = right, 90° = down, 180° = left, -90° = up)
    const angle = Math.atan2(distanceY, distanceX) * (180 / Math.PI);

    // Determine swipe direction based on angle
    if (Math.abs(angle) < this.config.maxSwipeAngle) {
      // Horizontal swipe
      if (distanceX > 0) {
        log.info('Swipe right detected');
        this.config.onSwipeRight();
      } else {
        log.info('Swipe left detected');
        this.config.onSwipeLeft();
      }
    } else if (Math.abs(angle - 90) < this.config.maxSwipeAngle) {
      // Downward swipe
      log.info('Swipe down detected');
      this.config.onSwipeDown();
    } else if (Math.abs(angle + 90) < this.config.maxSwipeAngle) {
      // Upward swipe
      log.info('Swipe up detected');
      this.config.onSwipeUp();
    } else {
      log.debug('Swipe angle not recognized:', angle);
    }

    log.debug('Swipe detected:', {
      distance,
      angle,
      velocity,
      timeTaken,
    });
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this), false);
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this), false);
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this), false);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this), false);

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
}

/**
 * React hook for swipe detection
 */
export function useSwipeDetector(
  ref: React.RefObject<HTMLElement>,
  config: GestureConfig
): void {
  const [detector, setDetector] = React.useState<GestureDetector | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    const newDetector = new GestureDetector(ref.current, config);
    setDetector(newDetector);

    return () => {
      newDetector.destroy();
    };
  }, [ref, config]);
}

/**
 * Detect pinch zoom (for optional zoom prevention)
 */
export function disablePinchZoom(element: HTMLElement): () => void {
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  element.addEventListener('touchmove', handleTouchMove, { passive: false });

  return () => {
    element.removeEventListener('touchmove', handleTouchMove);
  };
}

/**
 * Detect double-tap zoom
 */
export class DoubleTapDetector {
  private element: HTMLElement;
  private lastTapTime = 0;
  private tapCount = 0;
  private onDoubleTap: () => void;
  private doubleTapThreshold = 300; // ms

  constructor(element: HTMLElement, onDoubleTap: () => void) {
    this.element = element;
    this.onDoubleTap = onDoubleTap;
    this.attachListeners();
  }

  private attachListeners(): void {
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
  }

  private handleTouchEnd(e: TouchEvent): void {
    const now = Date.now();
    const tapDuration = now - this.lastTapTime;

    if (tapDuration < this.doubleTapThreshold) {
      this.tapCount++;
      if (this.tapCount === 2) {
        log.info('Double tap detected');
        this.onDoubleTap();
        this.tapCount = 0;
      }
    } else {
      this.tapCount = 1;
    }

    this.lastTapTime = now;
  }

  public destroy(): void {
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this), false);
  }
}
