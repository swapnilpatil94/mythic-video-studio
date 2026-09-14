export type AssetKind = 'character' | 'environment' | 'prop' | 'background' | 'overlay' | 'audio';

/** Which local TTS engine narration should be generated with. Both are production-capable and
 * coexist — see src/pipeline/tts-provider.ts. 'chatterbox' is the safe/default path (existing
 * behavior, unchanged unless a manifest or the TTS_PROVIDER env var explicitly asks for
 * 'vibevoice'). */
export type TTSProviderId = 'chatterbox' | 'vibevoice';

export type WorldBible = {
  period: string;
  architecture: string;
  clothing: string;
  weapons: string;
  armor: string;
  jewelry: string;
  vehicles: string;
  materials: string;
  environment: string;
  lighting: string;
  atmosphere?: string;
  forbidden_modern_elements?: string[];
};

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
  psychology?: BeatPsychology;
  /** See character/states.ts's StateCutaway doc — an in-beat pose swap for a single-character
   * beat's primary character, at a specific beat-local moment (a tool breaking, an object
   * received, any story event that should visibly change what the character is doing without
   * this needing its own separate beat). */
  state_cutaway?: {ref: string; at: number};
};

export type ProductionManifest = {
  project_id: string;
  title: string;
  language: 'hi-IN';
  duration_seconds: number;
  characters: string[];
  platform?: string;
  /** 'SHORT' -> vertical 1080x1920 (YouTube Shorts/Instagram Reels), 'LONGFORM' -> landscape
   * 1920x1080 (standard YouTube). Read by Root.tsx's calculateMetadata to pick the render
   * resolution — see that file for why this can't just be a fixed Composition prop. Optional and
   * derived from duration_seconds when absent (see resolveOrientation in Root.tsx) so manifests
   * written before this field existed still render at the right aspect ratio. */
  format?: 'SHORT' | 'LONGFORM';
  world?: WorldBible;
  asset_kinds?: Record<string, AssetKind>;
  asset_sacred?: Record<string, boolean>;
  asset_visual_direction?: Record<string, string>;
  /** Maps a character asset ref to the ref it's a mid-story continuity variant of (a costume
   * change, an injury, a transformation — anything where the SAME character needs a second master
   * asset because their appearance genuinely changes partway through the story, not because a new
   * character has entered). Found necessary by rendering a real story and inspecting the actual
   * output: without this, the compositor's construction-drawing reveal (see MythicShort.tsx's
   * firstAppearanceBeat) treats the variant's own first appearance as a brand-new character's
   * introduction and draws it from a blank parchment circle — correct for an actual new character,
   * but jarring and anti-climactic when the "new" asset is really the same character studied a
   * moment before, mid-scene (a sacrifice, a wound, a transformation): the viewer sees the
   * character vanish and get redrawn from scratch at the exact moment they should be watching an
   * unbroken reaction. Listing the variant here makes the compositor treat it as already
   * introduced, inheriting its predecessor's first-appearance beat instead of triggering its own. */
  asset_continuity?: Record<string, string>;
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
    /** Which TTS engine to generate narration with. Defaults to 'chatterbox' when omitted — see
     * TTSProviderId. */
    provider?: TTSProviderId;
    music_direction?: string;
    silence_guidance?: string;
  };
};
