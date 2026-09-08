/**
 * KATHAAYA visual attention director.
 * Maps story roles + format to concrete visual intent without coupling the story layer to Remotion.
 */
import {attentionPlan, beatPsychology, visualBeatRange, type StoryFormat, type BeatPsychology, type NeuromarketingPlan} from './psychology';

export type VisualDirection = BeatPsychology & {
  format: StoryFormat;
  beat_range_seconds: {minSeconds: number; maxSeconds: number};
  interruption_density: number;
  breathing_room: number;
  visual_strategy: BeatPsychology['visual_strategy'];
};

export function storyAttentionPlan(format: StoryFormat): NeuromarketingPlan {
  return attentionPlan(format);
}

export function directVisualBeat(sceneRole: string, format: StoryFormat): VisualDirection {
  const plan = attentionPlan(format);
  const psychology = beatPsychology(sceneRole, format);
  return {
    ...psychology,
    format,
    beat_range_seconds: visualBeatRange(format),
    interruption_density: plan.interruption_density,
    breathing_room: plan.breathing_room,
  };
}
