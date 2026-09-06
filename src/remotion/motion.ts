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
      return {scale: 1.08 + (1.16 - 1.08) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'slow_push':
      return {scale: 1.04 + (1.10 - 1.04) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'reverse_push':
      return {scale: 1.13 + (1.04 - 1.13) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'pull_back':
      return {scale: 1.14 + (1.00 - 1.14) * t, translateX: 0, translateY: 0, rotate: 0};
    case 'pan':
      return {scale: 1.06, translateX: -42 + 84 * t, translateY: 0, rotate: 0};
    case 'tilt_up':
      return {scale: 1.05, translateX: 0, translateY: 42 - 84 * t, rotate: 0};
    case 'reveal_from_edge':
      return {scale: 1.04, translateX: 70 - 70 * t, translateY: 0, rotate: 0};
    case 'shot_reverse':
      return {scale: 1.08, translateX: 28 - 56 * t, translateY: 0, rotate: 0};
    case 'armor_crop':
      return {scale: 1.22 + (1.28 - 1.22) * t, translateX: 0, translateY: 90 - 35 * t, rotate: 0};
    default:
      return {scale: 1.02, translateX: 0, translateY: 0, rotate: 0};
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
