import { interpolate, Easing } from 'remotion';

/**
 * Smooth fade in animation
 * @param frame Current frame number
 * @param startFrame Frame to start animation
 * @param duration Duration in frames
 */
export const fadeIn = (
  frame: number,
  startFrame: number,
  duration: number = 30
): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );
};

/**
 * Smooth fade out animation
 */
export const fadeOut = (
  frame: number,
  startFrame: number,
  duration: number = 30
): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    }
  );
};

/**
 * Slide in from left
 */
export const slideInLeft = (
  frame: number,
  startFrame: number,
  duration: number = 40
): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [-200, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );
};

/**
 * Slide in from right
 */
export const slideInRight = (
  frame: number,
  startFrame: number,
  duration: number = 40
): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [200, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );
};

/**
 * Scale up animation
 */
export const scaleUp = (
  frame: number,
  startFrame: number,
  duration: number = 30
): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0.8, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );
};

/**
 * Pulse animation (scale bounce effect)
 */
export const pulse = (
  frame: number,
  startFrame: number,
  duration: number = 20
): number => {
  const progress = (frame - startFrame) / duration;
  const bounced = progress - Math.floor(progress); // 0 to 1
  const scale = 1 + Math.sin(bounced * Math.PI) * 0.1;
  return scale;
};
