import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {buildAssetPlan, type AssetRequest} from './pipeline/asset-plan';
import {projectPaths, ensureProjectPaths} from './pipeline/paths';
import {loadRegistry, registerAsset} from './pipeline/asset-registry';
import type {ProductionManifest, AssetRecord} from './pipeline/types';
import {runCommand} from './adapters/command';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);
const registry = await loadRegistry(paths, manifest.project_id);
const plan = buildAssetPlan(manifest);

const command = (process.env.IMAGE_GENERATOR_COMMAND ?? process.env.FLUX_COMMAND)?.trim();
const argsTemplate = (process.env.IMAGE_GENERATOR_ARGS ?? process.env.FLUX_ARGS ?? '').trim();
const strict = process.env.REQUIRE_GENERATED_ASSETS === '1';

function outputFor(request: AssetRequest): string {
  const bucket = request.kind === 'character' ? 'characters' : request.kind === 'environment' ? 'environments' : request.kind === 'prop' ? 'props' : 'assets';
  return `${paths.root}/assets/${bucket}/${request.id.replaceAll('.', '_')}.png`;
}

function commandArgs(template: string, jobPath: string, outputPath: string): string[] {
  return template.split(/\s+/).filter(Boolean).map((token) => token
    .replaceAll('{job}', jobPath)
    .replaceAll('{output}', outputPath));
}

let ready = 0;
let generated = 0;
let skipped = 0;
let failed = 0;

for (const request of plan) {
  const outputPath = registry.assets[request.id]?.path ?? outputFor(request);
  const existing = registry.assets[request.id];

  if (existing?.status === 'ready' && existsSync(existing.path)) {
    ready += 1;
    continue;
  }

  if (existsSync(outputPath)) {
    await registerAsset(paths, registry, {
      ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
      prompt: request.promptHint, source: 'generated', status: 'ready',
    });
    ready += 1;
    continue;
  }

  if (!command) {
    skipped += 1;
    await registerAsset(paths, registry, {
      ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
      prompt: request.promptHint, source: 'generated', status: 'missing',
    });
    continue;
  }

  const jobPath = `${paths.logs}/${request.id.replaceAll('.', '_')}.image-job.json`;
  const job = {
    project_id: manifest.project_id,
    asset_id: request.id,
    kind: request.kind,
    role: request.role,
    prompt: request.promptHint,
    output_path: outputPath,
  };
  await writeFile(jobPath, `${JSON.stringify(job, null, 2)}\n`, 'utf8');

  console.log(`[image] generating ${request.id}`);
  const result = await runCommand(command, [...commandArgs(argsTemplate, jobPath, outputPath), JSON.stringify(job)]);

  if (result.code !== 0 || !existsSync(outputPath)) {
    failed += 1;
    await registerAsset(paths, registry, {
      ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
      prompt: request.promptHint, source: 'generated', status: 'failed',
    });
    console.error(`[image] FAILED ${request.id}`);
    if (result.stderr) console.error(result.stderr.trim());
    if (strict) throw new Error(`Image generation failed for ${request.id}`);
    continue;
  }

  await registerAsset(paths, registry, {
    ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
    prompt: request.promptHint, source: 'generated', status: 'ready',
  });
  generated += 1;
}

console.log(`Image stage: ready=${ready}, generated=${generated}, skipped=${skipped}, failed=${failed}`);
if (strict && skipped > 0) throw new Error(`Image generator is not configured; ${skipped} assets are still missing.`);
if (strict && failed > 0) throw new Error(`${failed} image generation job(s) failed.`);
