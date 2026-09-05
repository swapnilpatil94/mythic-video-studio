import {existsSync} from 'node:fs';
import {mkdir, readFile, unlink} from 'node:fs/promises';
import {dirname, join} from 'node:path';
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

if (!Number.isFinite(maxDimension) || maxDimension < 256) throw new Error('MAX_ASSET_DIMENSION must be >= 256');
if (!Number.isFinite(targetDimension) || targetDimension < 256 || targetDimension > maxDimension) throw new Error('NORMALIZED_ASSET_DIMENSION must be >= 256 and <= MAX_ASSET_DIMENSION');

for (const request of plan) {
  const record = registry.assets[request.id];
  if (!record?.path || !existsSync(record.path)) continue;
  try {
    const probe = await probeImage(record.path);
    if (probe.width <= maxDimension && probe.height <= maxDimension) {
      validateImage(probe, {maxDimension});
      await registerAsset(paths, registry, {...record, status: 'ready', width: probe.width, height: probe.height});
      console.log(`[asset] validated ${request.id}: ${probe.width}x${probe.height}`);
      continue;
    }
    if (!normalize) throw new Error(`exceeds ${maxDimension}px; rerun with NORMALIZE_ASSETS=1`);

    const normalized = join(dirname(record.path), `${request.id.replaceAll('.', '_')}.png`);
    const temp = join(dirname(record.path), `.normalizing-${request.id.replaceAll('.', '_')}.png`);
    await mkdir(dirname(normalized), {recursive: true});
    const scale = `scale='min(${targetDimension},iw)':'min(${targetDimension},ih)':force_original_aspect_ratio=decrease`;
    const result = await runCommand(ffmpeg, ['-y', '-i', record.path, '-vf', scale, '-frames:v', '1', '-c:v', 'png', temp]);
    if (result.code !== 0 || !existsSync(temp)) throw new Error(result.stderr || 'ffmpeg normalization failed');
    if (normalized !== record.path) await unlink(normalized).catch(() => undefined);
    await runCommand(ffmpeg, ['-y', '-i', temp, '-frames:v', '1', '-c:v', 'png', normalized]);
    await unlink(temp).catch(() => undefined);
    if (!existsSync(normalized)) throw new Error('normalized output was not created');
    const checked = await probeImage(normalized);
    validateImage(checked, {maxDimension});
    if (record.path !== normalized) await unlink(record.path).catch(() => undefined);
    await registerAsset(paths, registry, {...record, path: normalized, status: 'ready', width: checked.width, height: checked.height});
    console.log(`[asset] normalized ${request.id}: ${checked.width}x${checked.height}`);
  } catch (error) {
    await registerAsset(paths, registry, {...record, status: 'failed'});
    console.error(`[asset] FAILED ${request.id}: ${error instanceof Error ? error.message : String(error)}`);
    if (process.env.REQUIRE_GENERATED_ASSETS === '1') process.exitCode = 1;
  }
}
