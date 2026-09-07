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

/**
 * Falls back to id-substring matching only for manifests with no explicit `asset_kinds` map (i.e.
 * authored before the story-package contract existed, like examples/karna-short.json) — this
 * heuristic was tuned around that one manifest's exact naming and never generalized to other
 * stories/casts, which is exactly the gap `asset_kinds` closes for story-package-derived manifests.
 */
function inferKind(ref: string, explicit?: AssetPromptJob['kind']): AssetPromptJob['kind'] {
  if (explicit) return explicit;
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
    const kind = inferKind(asset_id, manifest.asset_kinds?.[asset_id]);
    const role = meta.roles.map((r) => roleHint[r] ?? r.replaceAll('_', ' ')).join('; ');
    const sacred = manifest.asset_sacred?.[asset_id] ?? (asset_id.startsWith('karna') || asset_id.startsWith('indra'));
    const reference_required = kind === 'character' && process.env.REQUIRE_CHARACTER_REFERENCES === '1';
    const visualDirection = manifest.asset_visual_direction?.[asset_id];
    const prompt = [
      'Indian hand-illustrated mythology storytelling artwork',
      'cream parchment background, expressive black ink linework, restrained antique gold and muted red accents',
      'detailed, elegant, cinematic composition designed for vertical 1080x1920 video',
      `asset: ${describe(asset_id)}`,
      // Specific character/environment/prop direction (who/what this actually is, e.g. gender,
      // attire, bearing) takes priority over the generic per-beat role hint below — without it,
      // FLUX has only an id and the shared style boilerplate to go on.
      ...(visualDirection ? [visualDirection] : []),
      `story roles: ${role}`,
      sacred ? 'reverent and dignified sacred-figure depiction, non-comedic, non-caricatured, culturally respectful' : 'story-specific supporting visual, grounded and believable',
      kind === 'character' ? 'single readable full-body or three-quarter character master, stable facial features, costume and proportions, isolated enough for later compositing' : 'clear subject hierarchy with useful negative space for camera crops and text overlays',
      'avoid text, logos, watermarks, UI elements and modern objects',
    ].join('. ');
    return {asset_id, kind, prompt, references: [], required: meta.required, reference_required};
  });
}
