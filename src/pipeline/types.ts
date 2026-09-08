export type AssetKind = 'character' | 'environment' | 'prop' | 'background' | 'overlay' | 'audio';

export type AssetRecord = {
  id: string;
  kind: AssetKind;
  path: string;
  prompt?: string;
  source?: 'generated' | 'provided' | 'procedural';
  status: 'missing' | 'ready' | 'failed';
  width?: number;
  height?: number;
  alpha?: boolean;
  sha256?: string;
  generated_at?: string;
  generation_runtime_ms?: number;
  attempts?: number;
  last_error?: string;
};

export type BeatPsychology = {
  attention_goal?: string;
  tension_level?: number;
  curiosity_level?: number;
  emotional_level?: number;
  open_loop?: string;
  withheld_elements?: string[];
  micro_payoff?: string;
  payoff_target?: string;
  pattern_interrupt?: boolean;
  visual_strategy?: string;
};

export type ProductionBeat = {
  beat_id: string;
  duration_seconds: number;
  visual_role: string;
  asset_refs: string[];
  new_asset_required?: boolean;
  camera?: string;
  animation?: string;
  text?: string;
  narration?: string;
  sfx?: string[];
  pace?: string;
  shot_type?: string;
  composition?: string;
  visual_action?: string;
  reveal?: boolean;
  keyword_text?: string;
  transition?: string;
  /** Shared psychology intent. The renderer can use this without knowing whether the story is a Short or Longform. */
  psychology?: BeatPsychology;
};

export type ProductionManifest = {
  project_id: string;
  title: string;
  language: 'hi-IN';
  duration_seconds: number;
  characters: string[];
  platform?: string;
  asset_kinds?: Record<string, AssetKind>;
  asset_sacred?: Record<string, boolean>;
  asset_visual_direction?: Record<string, string>;
  /** Format-level attention plan carried from the Story Package. */
  psychology?: {
    mode: 'high_density' | 'sustained' | 'cinematic';
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
  beats: ProductionBeat[];
  audio?: {
    narration_path?: string;
    music_path?: string;
    sfx_dir?: string;
    voice_style?: string;
    target_wpm?: number;
    music_direction?: string;
    silence_guidance?: string;
  };
};
