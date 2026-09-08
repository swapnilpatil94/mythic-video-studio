/**
 * Format-aware tuning: ONE compositor, not separate Short/Long-form pipelines.
 * Both formats share the same Story Psychology vocabulary, but use different attention regimes:
 * Shorts are dense and fast-paying; long-form uses nested curiosity, emotional investment and
 * deliberate breathing room. The renderer consumes this profile instead of hard-coding Shorts
 * behaviour into every visual primitive.
 */
import {attentionPlan, beatPsychology, visualBeatRange, type StoryFormat, type BeatPsychology, type NeuromarketingPlan} from '../story/psychology';

export type FormatProfile = {
  kind: 'short' | 'long';
  revealFraction: number;
  idleAmpScale: number;
  swayScale: number;
  cameraIntensity: number;
  keywordHoldSeconds: number;
  attention: NeuromarketingPlan;
  visualBeatRange: {minSeconds: number; maxSeconds: number};
};

const SHORT_PROFILE: FormatProfile = {
  kind: 'short', revealFraction: 0.42, idleAmpScale: 1, swayScale: 1, cameraIntensity: 1,
  keywordHoldSeconds: 1.2, attention: attentionPlan('SHORT'), visualBeatRange: visualBeatRange('SHORT'),
};

const LONG_PROFILE: FormatProfile = {
  kind: 'long', revealFraction: 0.3, idleAmpScale: 0.65, swayScale: 0.6, cameraIntensity: 0.72,
  keywordHoldSeconds: 2.0, attention: attentionPlan('LONGFORM'), visualBeatRange: visualBeatRange('LONGFORM'),
};

const SHORT_MAX_SECONDS = 120;

export function profileFor(totalDurationSeconds: number): FormatProfile {
  return totalDurationSeconds > SHORT_MAX_SECONDS ? LONG_PROFILE : SHORT_PROFILE;
}

/** Resolve beat psychology without making the compositor know the Story Package schema. */
export function psychologyForBeat(sceneRole: string, totalDurationSeconds: number): BeatPsychology {
  const format: StoryFormat = totalDurationSeconds > SHORT_MAX_SECONDS ? 'LONGFORM' : 'SHORT';
  return beatPsychology(sceneRole, format);
}
