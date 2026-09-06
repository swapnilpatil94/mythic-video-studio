import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import type {AssetRecord, ProductionManifest} from './types';
import type {AssetRequest} from './asset-plan';

export type AssetRequirement = {
  asset_id: string;
  kind: AssetRequest['kind'];
  compositing: 'isolated-transparent' | 'opaque-full-frame' | 'opaque-supporting' | 'transparent-overlay';
  alpha_required: boolean;
  min_dimension: number;
  max_dimension: number;
  rationale: string;
};

export type AssetRequirementIssue = {
  asset_id: string;
  severity: 'error' | 'warning';
  message: string;
};

export function requirementFor(request: AssetRequest): AssetRequirement {
  switch (request.kind) {
    case 'character':
      return {
        asset_id: request.id,
        kind: request.kind,
        compositing: 'isolated-transparent',
        alpha_required: true,
        min_dimension: 512,
        max_dimension: 4096,
        rationale: 'Character masters must survive independent placement, crop, scale and parallax without carrying a painted background.'
      };
    case 'environment':
    case 'background':
      return {
        asset_id: request.id,
        kind: request.kind,
        compositing: 'opaque-full-frame',
        alpha_required: false,
        min_dimension: 768,
        max_dimension: 4096,
        rationale: 'Scene artwork is a full-frame visual foundation and should not require transparent isolation.'
      };
    case 'overlay':
      return {
        asset_id: request.id,
        kind: request.kind,
        compositing: 'transparent-overlay',
        alpha_required: true,
        min_dimension: 256,
        max_dimension: 4096,
        rationale: 'Decorative/symbolic overlays need transparency so they can sit above the illustration without a rectangular matte.'
      };
    default:
      return {
        asset_id: request.id,
        kind: request.kind,
        compositing: 'opaque-supporting',
        alpha_required: false,
        min_dimension: 256,
        max_dimension: 4096,
        rationale: 'Supporting props can be composited as opaque artwork until segmentation is explicitly requested.'
      };
  }
}

export function checkAssetRequirement(requirement: AssetRequirement, record?: AssetRecord): AssetRequirementIssue[] {
  if (!record || record.status !== 'ready' || !record.path || !existsSync(record.path)) {
    return [{asset_id: requirement.asset_id, severity: 'error', message: 'Required asset is not ready or its file is missing.'}];
  }
  const issues: AssetRequirementIssue[] = [];
  const min = Math.min(record.width ?? 0, record.height ?? 0);
  const max = Math.max(record.width ?? 0, record.height ?? 0);
  if (!record.width || !record.height) issues.push({asset_id: requirement.asset_id, severity: 'error', message: 'Asset dimensions are missing; run inspect-assets first.'});
  else {
    if (min < requirement.min_dimension) issues.push({asset_id: requirement.asset_id, severity: 'error', message: `Minimum dimension ${requirement.min_dimension}px not met.`});
    if (max > requirement.max_dimension) issues.push({asset_id: requirement.asset_id, severity: 'error', message: `Maximum dimension ${requirement.max_dimension}px exceeded.`});
  }
  if (requirement.alpha_required && record.alpha !== true) {
    issues.push({asset_id: requirement.asset_id, severity: 'error', message: 'Alpha-capable artwork is required for isolated/overlay compositing.'});
  }
  return issues;
}

export async function buildRequirementReport(manifest: ProductionManifest, requests: AssetRequest[], registry: {assets: Record<string, AssetRecord>}) {
  const requirements = requests.map(requirementFor);
  const issues = requirements.flatMap((r) => checkAssetRequirement(r, registry.assets[r.asset_id]));
  return {project_id: manifest.project_id, requirements, issues, valid: issues.every((i) => i.severity !== 'error')};
}

export async function loadManifest(path: string): Promise<ProductionManifest> {
  return JSON.parse(await readFile(path, 'utf8')) as ProductionManifest;
}
