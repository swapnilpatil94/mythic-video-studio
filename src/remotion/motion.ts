export type CameraPreset =
  | 'push_in'
  | 'slow_push'
  | 'reverse_push'
  | 'pull_back'
  | 'pan'
  | 'tilt_up'
  | 'reveal_from_edge'
  | 'shot_reverse'
  | 'armor_crop'
  | 'static';

export type MotionFrame = {
  scale: number;
  translateX: number;
  translateY: number;
  rotate: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export function cameraMotion(preset: string | undefined, progress: number): MotionFrame {
  const t = easeInOut(progress);
  switch (preset as CameraPreset) {
    case 'push_in':
      return {scale: 1.08 + (1.22 - 1.08) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'slow_push':
      return {scale: 1.04 + (1.14 - 1.04) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'reverse_push':
      return {scale: 1.2 + (1.04 - 1.2) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'pull_back':
      return {scale: 1.22 + (1.00 - 1.22) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'pan':
      return {scale: 1.1, translateX: -70 + 140 * t, translateY: 0, rotate: 0};
    case 'tilt_up':
      return {scale: 1.08, translateX: 0, translateY: 64 - 128 * t, rotate: 0};
    case 'reveal_from_edge':
      return {scale: 1.06, translateX: 110 - 110 * t, translateY: 0, rotate: 0};
    case 'shot_reverse':
      return {scale: 1.12, translateX: 46 - 92 * t, translateY: 0, rotate: 0};
    case 'armor_crop':
      return {scale: 1.3 + (1.4 - 1.3) * t, translateX: 0, translateY: 130 - 55 * t, rotate: 0};
    default:
      return {scale: 1.04, translateX: 0, translateY: 0, rotate: 0};
  }
}

export function parallaxOffset(
  depth: number,
  progress: number,
  direction: {x: number; y: number},
): {x: number; y: number} {
  const t = easeInOut(progress) - 0.5;
  const strength = Math.max(0, Math.min(1, depth));
  return {
    x: direction.x * strength * t,
    y: direction.y * strength * t,
  };
}

export function layerTransform(
  camera: MotionFrame,
  depth: number,
  progress: number,
  direction = {x: 70, y: 38},
): string {
  const offset = parallaxOffset(depth, progress, direction);
  return `translate(${camera.translateX + offset.x}px, ${camera.translateY + offset.y}px) scale(${camera.scale}) rotate(${camera.rotate}deg)`;
}

export function drawRevealProgress(progress: number, hold = 0.18): number {
  const t = clamp01(progress);
  if (t <= hold) return 0;
  return clamp01((t - hold) / Math.max(0.001, 1 - hold));
}

/**
 * Reveal progress that ramps 0->1 over the first `until` fraction of a beat and then holds at 1,
 * used to drive the ink-outline-to-wash settle on a layer so it resolves early and stays sharp
 * for the rest of the beat instead of the whole beat looking unfinished.
 */
export function revealProgress(local: number, until = 0.32): number {
  return clamp01(local / Math.max(0.001, until));
}

/**
 * Opacity envelope giving every layer a real entrance and exit instead of only fading in once and
 * holding: fade in over the first `inEnd` fraction, hold, fade out over the last `1-outStart`.
 */
export function entranceExitOpacity(local: number, inEnd = 0.1, outStart = 0.88): number {
  const t = clamp01(local);
  if (t < inEnd) return easeInOut(t / inEnd);
  if (t > outStart) return 1 - easeInOut((t - outStart) / Math.max(0.001, 1 - outStart));
  return 1;
}

/** Small vertical settle-in / rise-out shift (px) paired with entranceExitOpacity. */
export function entranceExitShiftY(local: number, inEnd = 0.1, outStart = 0.88, distance = 46): number {
  const t = clamp01(local);
  if (t < inEnd) return distance * (1 - easeInOut(t / inEnd));
  if (t > outStart) return -distance * 0.6 * easeInOut((t - outStart) / Math.max(0.001, 1 - outStart));
  return 0;
}
