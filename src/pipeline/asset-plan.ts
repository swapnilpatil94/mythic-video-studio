import type {ProductionManifest} from './types';
import {buildAssetPromptJobs} from './asset-prompts';

export type AssetRequest = {
  id: string;
  kind: 'character' | 'environment' | 'prop' | 'background' | 'overlay';
  role: string;
  promptHint: string;
  required: boolean;
};

export function buildAssetPlan(manifest: ProductionManifest): AssetRequest[] {
  const jobs = buildAssetPromptJobs(manifest);
  return jobs.map((job) => ({
    id: job.asset_id,
    kind: job.kind,
    role: job.prompt.match(/story roles: ([^.]+)/)?.[1] ?? 'story asset',
    promptHint: job.prompt,
    required: job.required,
  }));
}
