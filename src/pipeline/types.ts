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
  };
};
