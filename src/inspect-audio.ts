import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const outputPath = manifest.audio?.narration_path ?? `projects/${manifest.project_id}/audio/narration.wav`;
const ffprobe = process.env.FFPROBE_COMMAND ?? 'ffprobe';
const strict = process.env.REQUIRE_TTS === '1';
const tolerance = Number(process.env.AUDIO_DURATION_TOLERANCE_SECONDS ?? '0.35');

await mkdir(join('projects', manifest.project_id, 'logs'), {recursive: true});
const reportPath = join('projects', manifest.project_id, 'logs', 'audio-report.json');

const fail = (message: string) => {
  if (strict) throw new Error(message);
  console.warn(`[audio] ${message}`);
};

if (!existsSync(outputPath)) {
  fail(`Narration file not found: ${outputPath}`);
  process.exit(strict ? 1 : 0);
}

const duration = await new Promise<number>((resolve, reject) => {
  const child = spawn(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outputPath], {stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve(Number(stdout.trim())) : reject(new Error(stderr.trim() || `ffprobe exited with ${code}`)));
});

if (!Number.isFinite(duration) || duration <= 0) {
  fail(`Invalid narration duration reported by ffprobe: ${duration}`);
  process.exit(strict ? 1 : 0);
}

const delta = duration - manifest.duration_seconds;
const report = {
  project_id: manifest.project_id,
  path: outputPath,
  duration_seconds: duration,
  target_duration_seconds: manifest.duration_seconds,
  delta_seconds: delta,
  tolerance_seconds: tolerance,
  within_target: Math.abs(delta) <= tolerance,
  checked_at: new Date().toISOString(),
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (Math.abs(delta) > tolerance) {
  fail(`Narration duration ${duration.toFixed(3)}s differs from target ${manifest.duration_seconds}s by ${Math.abs(delta).toFixed(3)}s (tolerance ${tolerance}s). Report: ${reportPath}`);
} else {
  console.log(`[audio] duration OK: ${duration.toFixed(3)}s / ${manifest.duration_seconds}s`);
}
console.log(`[audio] report: ${reportPath}`);
