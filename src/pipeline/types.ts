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
  // Optional, additive: carried through from a story package's visual_manifest (see
  // src/studio/story-package.ts) for traceability and future compositor use. The renderer does
  // not currently branch on these — capturing them losslessly on import is the scope of the story
  // package contract; wiring them into MythicShort.tsx's actual shot/reveal decisions is not.
  pace?: string;
  shot_type?: string;
  composition?: string;
  visual_action?: string;
  reveal?: boolean;
  keyword_text?: string;
  transition?: string;
};

export type ProductionManifest = {
  project_id: string;
  title: string;
  language: 'hi-IN';
  duration_seconds: number;
  characters: string[];
  beats: ProductionBeat[];
  audio?: {
    narration_path?: string;
    music_path?: string;
    sfx_dir?: string;
    // Optional, additive production-direction fields carried from a story package's `audio`
    // section. Not currently consumed by tools/chatterbox_tts.py — captured for fidelity/future use.
    voice_style?: string;
    target_wpm?: number;
    music_direction?: string;
    silence_guidance?: string;
  };
};
