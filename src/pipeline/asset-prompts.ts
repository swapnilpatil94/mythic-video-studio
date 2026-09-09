import type {AssetKind, ProductionManifest} from './types';

export type AssetPromptJob = {asset_id: string; kind: Exclude<AssetKind, 'audio'>; prompt: string; references: string[]; required: boolean; reference_required: boolean};

const roleHint: Record<string, string> = {
  hook: 'strong cinematic introduction, immediate visual curiosity', armor_reveal: 'detailed sacred armor and ornaments, dignified presentation', stakes: 'visualize destiny, danger, or consequence without sensationalism',
  threat: 'rising tension, battlefield atmosphere, restrained drama', visitor_reveal: 'respectful arrival and reveal of the visitor', request: 'clear visual focus on the request and the characters', decision: 'quiet emotional decision, expressive posture',
  sacrifice: 'reverent turning point, no gore, no comedy', reveal: 'meaningful reveal with symbolic visual emphasis', payoff: 'calm emotional resolution and memorable final image',
};

function inferKind(ref: string, explicit?: AssetKind): Exclude<AssetKind, 'audio'> {
  if (explicit && explicit !== 'audio') return explicit;
  if (ref.includes('master') && (ref.startsWith('karna') || ref.startsWith('indra'))) return 'character';
  if (ref.includes('battlefield')) return 'environment'; if (ref.includes('armor')) return 'prop'; if (ref.includes('sun')) return 'overlay'; return 'background';
}
function describe(ref: string): string { const clean = ref.replace(/\.(master|detail|symbol|\d+)$/, '').replace(/[._-]+/g, ' '); return clean || 'story asset'; }

/** Derives one generation job per unique master asset, never one job per beat. */
export function buildAssetPromptJobs(manifest: ProductionManifest): AssetPromptJob[] {
  const refs = new Map<string, {required: boolean; roles: string[]}>();
  for (const beat of manifest.beats) for (const ref of beat.asset_refs) { const current = refs.get(ref) ?? {required: false, roles: []}; current.required ||= Boolean(beat.new_asset_required); if (!current.roles.includes(beat.visual_role)) current.roles.push(beat.visual_role); refs.set(ref, current); }
  return [...refs.entries()].map(([asset_id, meta]) => {
    const kind = inferKind(asset_id, manifest.asset_kinds?.[asset_id]);
    const role = meta.roles.map((r) => roleHint[r] ?? r.replaceAll('_', ' ')).join('; ');
    const sacred = manifest.asset_sacred?.[asset_id] ?? (asset_id.startsWith('karna') || asset_id.startsWith('indra'));
    const reference_required = kind === 'character' && process.env.REQUIRE_CHARACTER_REFERENCES === '1';
    const visualDirection = manifest.asset_visual_direction?.[asset_id];
    const world = manifest.world;
    const worldLines = world ? [
      `era/period: ${world.period}`, `architecture: ${world.architecture}`, `clothing: ${world.clothing}`, `weapons: ${world.weapons}`,
      `armor: ${world.armor}`, `jewelry: ${world.jewelry}`, `vehicles: ${world.vehicles}`, `materials: ${world.materials}`,
      `environment: ${world.environment}`, `lighting: ${world.lighting}`, ...(world.atmosphere ? [`atmosphere: ${world.atmosphere}`] : []),
      ...(world.forbidden_modern_elements?.length ? [`forbidden modern elements: ${world.forbidden_modern_elements.join(', ')}`] : []),
    ] : [];
    const isEnvironment = kind === 'environment' || kind === 'background';
    const environmentInstruction = isEnvironment
      ? 'Environment is a first-class cinematic asset: establish geography, era, foreground/midground/background depth, atmospheric perspective and usable parallax layers; never use generic parchment as the scene background.'
      : '';
    const prompt = [
      'Indian hand-illustrated mythology storytelling artwork',
      'cream parchment base, expressive black ink linework, restrained antique gold and muted red accents',
      'detailed, elegant, cinematic composition designed for vertical 1080x1920 video',
      `asset: ${describe(asset_id)}`,
      ...worldLines,
      ...(visualDirection ? [visualDirection] : []), `story roles: ${role}`, environmentInstruction,
      sacred ? 'reverent and dignified sacred-figure depiction, non-comedic, non-caricatured, culturally respectful' : 'story-specific supporting visual, grounded and believable',
      kind === 'character' ? 'single readable full-body or three-quarter character master, stable facial features, costume and proportions, isolated enough for later compositing' : 'clear subject hierarchy with useful negative space for camera crops, text overlays and depth movement',
      'avoid text, logos, watermarks, UI elements, modern objects and anachronistic materials/styles',
    ].filter(Boolean).join('. ');
    return {asset_id, kind, prompt, references: [], required: meta.required, reference_required};
  });
}
