import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {buildAssetPlan} from './pipeline/asset-plan';
import {projectPaths, ensureProjectPaths} from './pipeline/paths';
import {loadRegistry} from './pipeline/asset-registry';
import type {ProductionManifest} from './pipeline/types';
import {probeImage, validateImage} from './pipeline/image-validation';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);
const registry = await loadRegistry(paths, manifest.project_id);
const plan = buildAssetPlan(manifest);

let valid = 0;
let missing = 0;
let invalid = 0;
for (const request of plan) {
  const record = registry.assets[request.id];
  if (!record?.path || !existsSync(record.path)) {
    missing += 1;
    console.log(`[asset] MISSING ${request.id}`);
    continue;
  }
  try {
    const probe = await probeImage(record.path);
    validateImage(probe);
    valid += 1;
    console.log(`[asset] OK ${request.id} ${probe.width}x${probe.height} ${probe.format}${probe.hasAlpha ? ' alpha' : ''} ${probe.bytes}B`);
  } catch (error) {
    invalid += 1;
    console.error(`[asset] INVALID ${request.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`Asset inspection: valid=${valid}, missing=${missing}, invalid=${invalid}`);
if (missing || invalid) process.exitCode = 1;
