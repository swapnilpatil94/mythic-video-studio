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
  // Optional: which platform's safe-zone profile (src/shared/platform-profiles.ts) the compositor
  // should position captions/branding against — a reference to the reusable, shared profile data,
  // not the UI geometry itself, so platform layout stays defined in one place, not per-manifest.
  // Defaults to 'youtube_shorts' when absent.
  platform?: string;
  // Optional: explicit per-asset-id kind/reverence, populated by src/studio/story-package.ts from
  // the story package's own characters/environments/props lists (which already know this — a
  // character is a character because it's IN the characters array, not because its id happens to
  // start with a hardcoded name). src/pipeline/asset-prompts.ts consults this before falling back
  // to its old id-substring heuristic, so classification generalizes to any story/cast, not just
  // the original karna/indra naming. Absent for manifests authored before this field existed —
  // the heuristic fallback keeps those working unchanged.
  asset_kinds?: Record<string, AssetKind>;
  asset_sacred?: Record<string, boolean>;
  // Optional: per-asset-id visual direction text, populated from the story package's
  // characters/environments/props `visual_direction` fields. src/pipeline/asset-prompts.ts folds
  // this into the actual generation prompt — without it, a new character (anyone who isn't karna/
  // indra, which the old template's generic role-only prompt happens to already suit) gets no
  // information about who they are beyond an id, and FLUX has nothing to go on but the shared
  // style boilerplate (confirmed: this produced a bearded male figure for "kunti" before this field
  // existed, since the prompt never said she was a woman).
  asset_visual_direction?: Record<string, string>;
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
