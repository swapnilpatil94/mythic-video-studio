import {existsSync} from 'node:fs';
import {mkdir, readFile} from 'node:fs/promises';
import {dirname, extname, join} from 'node:path';
import {buildAssetPlan} from './pipeline/asset-plan';
import {projectPaths, ensureProjectPaths} from './pipeline/paths';
import {loadRegistry, registerAsset} from './pipeline/asset-registry';
import type {ProductionManifest} from './pipeline/types';
import {probeImage, validateImage} from './pipeline/image-validation';
import {runCommand} from './adapters/command';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);
const registry = await loadRegistry(paths, manifest.project_id);
const plan = buildAssetPlan(manifest);
const ffmpeg = process.env.FFMPEG_COMMAND?.trim() || 'ffmpeg';
const maxDimension = Number(process.env.MAX_ASSET_DIMENSION ?? 4096);
const targetDimension = Number(process.env.NORMALIZED_ASSET_DIMENSION ?? 2048);
const normalize = process.env.NORMALIZE_ASSETS === '1';

if (normalize && !Number.isFinite(targetDimension)) throw new Error('NORMALIZED_ASSET_DIMENSION must be a number');

for (const request of plan) {
  const record = registry.assets[request.id];
  if (!record?.path || !existsSync(record.path)) continue;
  try {
    const probe = await probeImage(record.path);
    if (probe.width <= maxDimension && probe.height <= maxDimension) {
      await registerAsset(paths, registry, {...record, status: 'ready', width: probe.width, height: probe.height});
      console.log(`[asset] validated ${request.id}: ${probe.width}x${probe.height}`);
      continue;
    }
    if (!normalize) throw new Error(`exceeds ${maxDimension}px; rerun with NORMALIZE_ASSETS=1`);
    const output = join(dirname(record.path), `.normalized-${request.id.replaceAll('.', '_')}.png`);
    await mkdir(dirname(output), {recursive: true});
    const scale = `scale='min(${targetDimension},iw)':'min(${targetDimension},ih)':force_original_aspect_ratio=decrease`;
    const result = await runCommand(ffmpeg, ['-y', '-i', record.path, '-vf', scale, '-frames:v', '1', output]);
    if (result.code !== 0 || !existsSync(output)) throw new Error(result.stderr || 'ffmpeg normalization failed');
    const normalized = record.path.replace(new RegExp(`${extname(record.path)}$`), '.png');
    if (normalized !== record.path) {
      const moveResult = await runCommand(ffmpeg, ['-y', '-i', output, normalized]);
      if (moveResult.code !== 0 || !existsSync(normalized)) throw new Error(moveResult.stderr || 'ffmpeg finalization failed');
    }
    const finalPath = normalized === record.path ? output : normalized;
    const checked = await probeImage(finalPath);
    validateImage(checked, {maxDimension});
    await registerAsset(paths, registry, {...record, path: finalPath, status: 'ready', width: checked.width, height: checked.height, source: record.source ?? 'generated'});
    console.log(`[asset] normalized ${request.id}: ${checked.width}x${checked.height}`);
  } catch (error) {
    await registerAsset(paths, registry, {...record, status: 'failed'});
    console.error(`[asset] FAILED ${request.id}: ${error instanceof Error ? error.message : String(error)}`);
    if (process.env.REQUIRE_GENERATED_ASSETS === '1') process.exitCode = 1;
  }
}
