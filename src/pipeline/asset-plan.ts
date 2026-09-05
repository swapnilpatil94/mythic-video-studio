import type {ProductionManifest} from './types';

export type AssetRequest = {
  id: string;
  kind: 'character' | 'environment' | 'prop' | 'background' | 'overlay';
  role: string;
  promptHint: string;
  required: boolean;
};

export function buildAssetPlan(manifest: ProductionManifest): AssetRequest[] {
  const requests = new Map<string, AssetRequest>();
  for (const beat of manifest.beats) {
    for (const ref of beat.asset_refs) {
      if (requests.has(ref)) continue;
      const [prefix, name] = ref.split('.', 2);
      const kind = prefix === 'character' || ['karna', 'indra'].includes(name ?? prefix)
        ? 'character'
        : prefix === 'environment' || prefix === 'battlefield'
          ? 'environment'
          : prefix === 'prop' || prefix === 'armor'
            ? 'prop'
            : 'background';
      requests.set(ref, {
        id: ref,
        kind,
        role: beat.visual_role,
        promptHint: `Create a ${kind} master asset for the beat role "${beat.visual_role}". Reference: ${ref}. Preserve the Mythic Video Studio Indian ink-and-wash visual bible, dignified mythology treatment, parchment background, black ink linework, restrained gold/red accents.`,
        required: true,
      });
    }
  }
  return [...requests.values()];
}
