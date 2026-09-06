import type {ProductionManifest} from './types';

export type AssetPromptJob = {
  asset_id: string;
  kind: 'character' | 'environment' | 'prop' | 'background' | 'overlay';
  prompt: string;
  references: string[];
  required: boolean;
  reference_required: boolean;
};

const roleHint: Record<string, string> = {
  hook: 'strong cinematic introduction, immediate visual curiosity',
  armor_reveal: 'detailed sacred armor and ornaments, dignified presentation',
  stakes: 'visualize destiny, danger, or consequence without sensationalism',
  threat: 'rising tension, battlefield atmosphere, restrained drama',
  visitor_reveal: 'respectful arrival and reveal of the visitor',
  request: 'clear visual focus on the request and the characters',
  decision: 'quiet emotional decision, expressive posture',
  sacrifice: 'reverent turning point, no gore, no comedy',
  reveal: 'meaningful reveal with symbolic visual emphasis',
  payoff: 'calm emotional resolution and memorable final image',
};

function inferKind(ref: string): AssetPromptJob['kind'] {
  if (ref.includes('master') && (ref.startsWith('karna') || ref.startsWith('indra'))) return 'character';
  if (ref.includes('battlefield')) return 'environment';
  if (ref.includes('armor')) return 'prop';
  if (ref.includes('sun')) return 'overlay';
  return 'background';
}

function describe(ref: string): string {
  const clean = ref.replace(/\.(master|detail|symbol|\d+)$/, '').replace(/[._-]+/g, ' ');
  return clean || 'story asset';
}

/** Derives one generation job per unique master asset, never one job per beat. */
export function buildAssetPromptJobs(manifest: ProductionManifest): AssetPromptJob[] {
  const refs = new Map<string, {required: boolean; roles: string[]}>();
  for (const beat of manifest.beats) {
    for (const ref of beat.asset_refs) {
      const current = refs.get(ref) ?? {required: false, roles: []};
      current.required ||= Boolean(beat.new_asset_required);
      if (!current.roles.includes(beat.visual_role)) current.roles.push(beat.visual_role);
      refs.set(ref, current);
    }
  }

  return [...refs.entries()].map(([asset_id, meta]) => {
    const kind = inferKind(asset_id);
    const role = meta.roles.map((r) => roleHint[r] ?? r.replaceAll('_', ' ')).join('; ');
    const sacred = asset_id.startsWith('karna') || asset_id.startsWith('indra');
    const reference_required = kind === 'character' && process.env.REQUIRE_CHARACTER_REFERENCES === '1';
    const prompt = [
      'Indian hand-illustrated mythology storytelling artwork',
      'cream parchment background, expressive black ink linework, restrained antique gold and muted red accents',
      'detailed, elegant, cinematic composition designed for vertical 1080x1920 video',
      `asset: ${describe(asset_id)}`,
      `story roles: ${role}`,
      sacred ? 'reverent and dignified sacred-figure depiction, non-comedic, non-caricatured, culturally respectful' : 'story-specific supporting visual, grounded and believable',
      kind === 'character' ? 'single readable full-body or three-quarter character master, stable facial features, costume and proportions, isolated enough for later compositing' : 'clear subject hierarchy with useful negative space for camera crops and text overlays',
      'avoid text, logos, watermarks, UI elements and modern objects',
    ].join('. ');
    return {asset_id, kind, prompt, references: [], required: meta.required, reference_required};
  });
}
