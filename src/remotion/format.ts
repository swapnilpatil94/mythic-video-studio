/**
 * Format-aware tuning: ONE compositor, not separate Short/Long-form pipelines. A manifest's own
 * `duration_seconds` (already required by the schema) tells us which regime it's in — no new
 * manifest field, no branching pipeline. Short beats want a fast, dense, high-energy read (a
 * visual change every ~0.5-2s); long-form beats are already authored with more breathing room per
 * beat (~2-5s) and want gentler, less fatiguing continuous motion sustained over many minutes
 * rather than the same intensity stretched out.
 */
export type FormatProfile = {
  kind: 'short' | 'long';
  /** Fraction of a beat's duration spent on the ink-outline -> wash reveal sweep. */
  revealFraction: number;
  /** Multiplier on the continuous idle/breathing drift amplitude. */
  idleAmpScale: number;
  /** Multiplier on the weapon/hand sway amplitude. */
  swayScale: number;
  /** Multiplier on how much a camera preset's own scale/translate contributes to a shot. */
  cameraIntensity: number;
  /** How long (seconds) the keyword flourish stays fully visible once popped in. */
  keywordHoldSeconds: number;
};

const SHORT_PROFILE: FormatProfile = {
  kind: 'short',
  revealFraction: 0.42,
  idleAmpScale: 1,
  swayScale: 1,
  cameraIntensity: 1,
  keywordHoldSeconds: 1.2,
};

const LONG_PROFILE: FormatProfile = {
  kind: 'long',
  revealFraction: 0.3,
  idleAmpScale: 0.65,
  swayScale: 0.6,
  cameraIntensity: 0.72,
  keywordHoldSeconds: 2.0,
};

/** Short = 60-90s target per the product brief; treat anything over 2 minutes as long-form. */
const SHORT_MAX_SECONDS = 120;

export function profileFor(totalDurationSeconds: number): FormatProfile {
  return totalDurationSeconds > SHORT_MAX_SECONDS ? LONG_PROFILE : SHORT_PROFILE;
}
