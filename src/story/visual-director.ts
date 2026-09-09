import {beatPsychology, attentionPlan, visualBeatRange, type StoryFormat, type BeatPsychology} from './psychology';

export type VisualDirection = BeatPsychology & {
  format: StoryFormat;
  beat_range_seconds: {minSeconds: number; maxSeconds: number};
  recommended_shot_family: 'wide' | 'medium' | 'close' | 'detail' | 'reaction' | 'two-shot';
  reveal_priority: 'low' | 'medium' | 'high' | 'hero';
};

/**
 * Converts story-role + format into deterministic visual direction. This is deliberately pure:
 * asset generation and Remotion remain separate concerns, while both can consume the same intent.
 */
export function directVisualBeat(sceneRole: string, format: StoryFormat): VisualDirection {
  const psychology = beatPsychology(sceneRole, format);
  const role = sceneRole.toLowerCase();
  const shot = /threat|stakes|orientation|context/.test(role)
    ? 'wide'
    : /hand|sacrifice|detail|object|weapon/.test(role)
      ? 'detail'
      : /decision|emotion|reversal|reveal|payoff|climax/.test(role)
        ? 'reaction'
        : /request|two-shot|visitor/.test(role)
          ? 'two-shot'
          : 'medium';

  const reveal_priority = psychology.attention_goal === 'climax'
    ? 'hero'
    : psychology.attention_goal === 'reveal' || psychology.attention_goal === 'reversal'
      ? 'high'
      : psychology.attention_goal === 'hook' || psychology.attention_goal === 'curiosity'
        ? 'medium'
        : 'low';

  return {
    ...psychology,
    format,
    beat_range_seconds: visualBeatRange(format),
    recommended_shot_family: shot,
    reveal_priority,
  };
}

export function directVisualSequence(sceneRoles: string[], format: StoryFormat): VisualDirection[] {
  return sceneRoles.map((role) => directVisualBeat(role, format));
}

export function storyAttentionPlan(format: StoryFormat) {
  return attentionPlan(format);
}
