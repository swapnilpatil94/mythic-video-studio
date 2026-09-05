import {readFile, writeFile} from 'node:fs/promises';
import type {ProductionManifest} from './types';
import {projectPaths, ensureProjectPaths} from './paths';
import {loadRegistry, registerAsset} from './asset-registry';
import {buildAssetPlan} from './asset-plan';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);
const registry = await loadRegistry(paths, manifest.project_id);
const plan = buildAssetPlan(manifest);

for (const request of plan) {
  if (registry.assets[request.id]) continue;
  const bucket = request.kind === 'character' ? 'characters' : request.kind === 'environment' ? 'environments' : request.kind === 'prop' ? 'props' : 'assets';
  await registerAsset(paths, registry, {
    id: request.id,
    kind: request.kind,
    path: `${paths.root}/assets/${bucket}/${request.id.replaceAll('.', '_')}.png`,
    prompt: request.promptHint,
    source: 'generated',
    status: 'missing',
  });
}

await writeFile(`${paths.root}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(`${paths.root}/asset-plan.json`, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`Prepared ${manifest.project_id}: ${plan.length} unique asset references`);
console.log(`Project: ${paths.root}`);
