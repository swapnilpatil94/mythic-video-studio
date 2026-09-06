import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {buildAssetPlan, type AssetRequest} from './pipeline/asset-plan';
import {projectPaths, ensureProjectPaths} from './pipeline/paths';
import {loadRegistry, registerAsset} from './pipeline/asset-registry';
import type {ProductionManifest} from './pipeline/types';
import {runCommand} from './adapters/command';
import {sha256File} from './pipeline/file-hash';
import {resolveReferenceImage} from './pipeline/asset-references';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);
const registry = await loadRegistry(paths, manifest.project_id);
const plan = buildAssetPlan(manifest);

const command = (process.env.IMAGE_GENERATOR_COMMAND ?? process.env.FLUX_COMMAND)?.trim();
const argsTemplate = (process.env.IMAGE_GENERATOR_ARGS ?? process.env.FLUX_ARGS ?? '').trim();
const strict = process.env.REQUIRE_GENERATED_ASSETS === '1';
const maxAttempts = Math.max(1, Number(process.env.IMAGE_GENERATION_MAX_ATTEMPTS ?? 2));
const projectRoot = paths.root;

function outputFor(request: AssetRequest): string {
  const bucket = request.kind === 'character' ? 'characters' : request.kind === 'environment' ? 'environments' : request.kind === 'prop' ? 'props' : 'assets';
  return `${paths.root}/assets/${bucket}/${request.id.replaceAll('.', '_')}.png`;
}

function commandArgs(template: string, jobPath: string, outputPath: string, referencePath?: string): string[] {
  return template.split(/\s+/).filter(Boolean).map((token) => token
    .replaceAll('{job}', jobPath)
    .replaceAll('{output}', outputPath)
    .replaceAll('{reference}', referencePath ?? ''))
    .filter((token) => token !== '');
}

let ready = 0;
let generated = 0;
let skipped = 0;
let failed = 0;
let referenceCount = 0;

for (const request of plan) {
  const outputPath = registry.assets[request.id]?.path ?? outputFor(request);
  const existing = registry.assets[request.id];
  const referencePath = resolveReferenceImage(request.id, projectRoot);

  if (request.reference_required && !referencePath) {
    const message = `Required character reference not found for ${request.id}. Place ${request.id}.{png,jpg,jpeg,webp} in ${projectRoot}/references or set ASSET_REFERENCE_DIR.`;
    failed += 1;
    await registerAsset(paths, registry, {
      ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
      prompt: request.promptHint, source: 'generated', status: 'failed',
      attempts: existing?.attempts ?? 0, last_error: message,
    });
    console.error(`[image] FAILED ${request.id}: ${message}`);
    if (strict) throw new Error(message);
    continue;
  }
  if (referencePath) referenceCount += 1;

  if (existing?.status === 'ready' && existsSync(existing.path)) {
    if (!existing.sha256) await registerAsset(paths, registry, {...existing, sha256: await sha256File(existing.path)});
    ready += 1;
    continue;
  }

  if (existsSync(outputPath)) {
    await registerAsset(paths, registry, {
      ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
      prompt: request.promptHint, source: 'generated', status: 'ready',
      sha256: await sha256File(outputPath), generated_at: existing?.generated_at ?? new Date().toISOString(),
    });
    ready += 1;
    continue;
  }

  if (!command) {
    skipped += 1;
    await registerAsset(paths, registry, {
      ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
      prompt: request.promptHint, source: 'generated', status: 'missing', attempts: existing?.attempts ?? 0,
      last_error: 'No image generator command configured',
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
    reference_path: referencePath ?? null,
    reference_required: request.reference_required,
  };
  await writeFile(jobPath, `${JSON.stringify(job, null, 2)}\n`, 'utf8');

  let success = false;
  let lastError = '';
  const startedAt = Date.now();
  const priorAttempts = existing?.attempts ?? 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`[image] generating ${request.id} (attempt ${attempt}/${maxAttempts})`);
    const result = await runCommand(command, [...commandArgs(argsTemplate, jobPath, outputPath, referencePath), JSON.stringify(job)]);
    const exists = existsSync(outputPath);
    if (result.code === 0 && exists) {
      success = true;
      const now = new Date().toISOString();
      await registerAsset(paths, registry, {
        ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
        prompt: request.promptHint, source: 'generated', status: 'ready',
        sha256: await sha256File(outputPath), generated_at: now,
        generation_runtime_ms: Date.now() - startedAt, attempts: priorAttempts + attempt,
        last_error: undefined,
      });
      generated += 1;
      break;
    }
    lastError = result.stderr?.trim() || `generator exited with code ${result.code}; output exists=${exists}`;
  }

  if (!success) {
    failed += 1;
    await registerAsset(paths, registry, {
      ...(existing ?? {}), id: request.id, kind: request.kind, path: outputPath,
      prompt: request.promptHint, source: 'generated', status: 'failed',
      attempts: priorAttempts + maxAttempts, generation_runtime_ms: Date.now() - startedAt,
      last_error: lastError,
    });
    console.error(`[image] FAILED ${request.id}: ${lastError}`);
    if (strict) throw new Error(`Image generation failed for ${request.id}`);
  }
}

console.log(`Image stage: ready=${ready}, generated=${generated}, skipped=${skipped}, failed=${failed}, references=${referenceCount}`);
if (strict && skipped > 0) throw new Error(`Image generator is not configured; ${skipped} assets are still missing.`);
if (strict && failed > 0) throw new Error(`${failed} image generation job(s) failed.`);
