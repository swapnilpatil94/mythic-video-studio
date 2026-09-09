/**
 * KATHAAYA Story Psychology Engine.
 *
 * One shared psychological vocabulary for every format, with format-specific attention profiles.
 * Shorts are high-density and fast-paying; long-form is layered, sustained, and deliberately
 * allowed to breathe. The engine describes intent for writers/compositors — it never replaces
 * source-grounded storytelling or forces artificial cliffhangers.
 */
export type StoryFormat = 'SHORT' | 'LONGFORM';

export type AttentionMode = 'high_density' | 'sustained' | 'cinematic';

export type NeuromarketingPlan = {
  mode: AttentionMode;
  curiosity: number;
  tension: number;
  emotional_investment: number;
  information_density: number;
  interruption_density: number;
  breathing_room: number;
  micro_payoff_interval_seconds: number;
  scene_payoff_interval_seconds: number;
  maximum_open_loops: number;
};

export type BeatPsychology = {
  attention_goal: 'hook' | 'curiosity' | 'orientation' | 'escalation' | 'emotional_investment' | 'reversal' | 'reveal' | 'climax' | 'payoff' | 'breathing_room';
  tension_level: number;
  curiosity_level: number;
  emotional_level: number;
  open_loop?: string;
  withheld_elements?: string[];
  micro_payoff?: string;
  payoff_target?: string;
  pattern_interrupt?: boolean;
  visual_strategy: 'partial_reveal' | 'scale_contrast' | 'reaction_first' | 'detail_clue' | 'directional_action' | 'reversal_cut' | 'hero_reveal' | 'quiet_hold';
};

export const SHORT_ATTENTION: NeuromarketingPlan = {
  mode: 'high_density',
  curiosity: 9,
  tension: 8,
  emotional_investment: 7,
  information_density: 9,
  interruption_density: 8,
  breathing_room: 2,
  micro_payoff_interval_seconds: 8,
  scene_payoff_interval_seconds: 20,
  maximum_open_loops: 3,
};

export const LONGFORM_ATTENTION: NeuromarketingPlan = {
  mode: 'sustained',
  curiosity: 8,
  tension: 7,
  emotional_investment: 9,
  information_density: 6,
  interruption_density: 4,
  breathing_room: 8,
  micro_payoff_interval_seconds: 20,
  scene_payoff_interval_seconds: 90,
  maximum_open_loops: 4,
};

export function attentionPlan(format: StoryFormat): NeuromarketingPlan {
  return format === 'LONGFORM' ? LONGFORM_ATTENTION : SHORT_ATTENTION;
}

/**
 * Converts a beat's narrative role into a visual attention strategy. This is intentionally
 * deterministic so the same Story Package produces the same visual grammar on every render.
 */
export function beatPsychology(sceneRole: string, format: StoryFormat): BeatPsychology {
  const role = sceneRole.toLowerCase();
  const plan = attentionPlan(format);

  if (/hook|curiosity/.test(role)) return {
    attention_goal: role.includes('hook') ? 'hook' : 'curiosity',
    tension_level: Math.min(10, plan.tension + 1), curiosity_level: 10, emotional_level: 6,
    pattern_interrupt: format === 'SHORT', visual_strategy: 'partial_reveal',
  };
  if (/stakes|threat|escalat/.test(role)) return {
    attention_goal: 'escalation', tension_level: Math.min(10, plan.tension + 1), curiosity_level: 8, emotional_level: 8,
    pattern_interrupt: format === 'SHORT', visual_strategy: 'directional_action',
  };
  if (/decision|sacrifice|emotional/.test(role)) return {
    attention_goal: 'emotional_investment', tension_level: 8, curiosity_level: 7, emotional_level: 10,
    pattern_interrupt: false, visual_strategy: format === 'LONGFORM' ? 'quiet_hold' : 'reaction_first',
  };
  if (/reversal|twist/.test(role)) return {
    attention_goal: 'reversal', tension_level: 9, curiosity_level: 10, emotional_level: 8,
    pattern_interrupt: true, visual_strategy: 'reversal_cut',
  };
  if (/reveal|climax/.test(role)) return {
    attention_goal: role.includes('climax') ? 'climax' : 'reveal', tension_level: 10, curiosity_level: 10, emotional_level: 10,
    pattern_interrupt: true, visual_strategy: 'hero_reveal',
  };
  if (/payoff|resolution|ending/.test(role)) return {
    attention_goal: 'payoff', tension_level: 5, curiosity_level: 4, emotional_level: 9,
    pattern_interrupt: false, visual_strategy: 'quiet_hold',
  };
  if (/orient|setup|context/.test(role)) return {
    attention_goal: 'orientation', tension_level: 3, curiosity_level: 6, emotional_level: 5,
    pattern_interrupt: false, visual_strategy: 'scale_contrast',
  };
  return {
    attention_goal: format === 'LONGFORM' ? 'breathing_room' : 'curiosity',
    tension_level: plan.tension, curiosity_level: plan.curiosity, emotional_level: plan.emotional_investment,
    pattern_interrupt: false, visual_strategy: format === 'LONGFORM' ? 'quiet_hold' : 'scale_contrast',
  };
}

/** Visual pacing guidance for the compositor. Values are seconds, not frame counts. */
export function visualBeatRange(format: StoryFormat): {minSeconds: number; maxSeconds: number} {
  return format === 'LONGFORM' ? {minSeconds: 2, maxSeconds: 5} : {minSeconds: 0.5, maxSeconds: 2};
}
