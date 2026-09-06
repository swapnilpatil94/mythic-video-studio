import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const audioDir = join('projects', manifest.project_id, 'audio');
const narration = manifest.audio?.narration_path ?? join(audioDir, 'narration.wav');
const reportPath = join('projects', manifest.project_id, 'logs', 'narration-pacing-report.json');
const ffprobe = process.env.FFPROBE_COMMAND ?? 'ffprobe';
const ffmpeg = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const tolerance = Number(process.env.AUDIO_ALIGNMENT_TOLERANCE_SECONDS ?? '0.35');
const defaultSpeed = manifest.tempo_profile === 'short' ? 1.08 : manifest.narration_profile?.speed_factor ?? 1;
const maxSpeed = Number(process.env.NARRATION_MAX_SPEED ?? '1.12');
const requestedSpeed = Number(manifest.narration_profile?.speed_factor ?? defaultSpeed);

await mkdir(audioDir, {recursive: true});
await mkdir(join('projects', manifest.project_id, 'logs'), {recursive: true});

const run = (command: string, args: string[]) => new Promise<{code: number; stdout: string; stderr: string}>((resolve, reject) => {
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', (code) => resolve({code: code ?? -1, stdout, stderr}));
});

if (!existsSync(narration)) {
  console.warn(`[voice-pace] narration not found: ${narration}`);
  process.exit(0);
}

const probe = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', narration]);
const duration = Number(probe.stdout.trim());
if (probe.code !== 0 || !Number.isFinite(duration) || duration <= 0) throw new Error(`Unable to probe narration: ${probe.stderr.trim()}`);

const target = manifest.duration_seconds;
const durationRatio = duration / target;
const shouldSpeedUp = duration > target + tolerance;
const speed = shouldSpeedUp ? Math.min(maxSpeed, Math.max(1, durationRatio, requestedSpeed)) : 1;
const output = join(audioDir, 'narration.paced.wav');

if (speed === 1) {
  console.log(`[voice-pace] no pacing change required (${duration.toFixed(3)}s / ${target}s)`);
  await writeFile(reportPath, `${JSON.stringify({project_id: manifest.project_id, source: narration, output: narration, original_duration_seconds: duration, target_duration_seconds: target, speed_factor: 1, changed: false, checked_at: new Date().toISOString()}, null, 2)}\n`, 'utf8');
  process.exit(0);
}

const result = await run(ffmpeg, ['-y', '-i', narration, '-filter:a', `atempo=${speed.toFixed(4)}`, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', output]);
if (result.code !== 0 || !existsSync(output)) throw new Error(`Narration pacing failed: ${result.stderr.trim()}`);

const pacedProbe = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', output]);
const pacedDuration = Number(pacedProbe.stdout.trim());
if (!Number.isFinite(pacedDuration) || pacedDuration <= 0) throw new Error('Unable to probe paced narration.');

const replace = await run(ffmpeg, ['-y', '-i', output, '-c:a', 'pcm_s24le', narration]);
if (replace.code !== 0) throw new Error(`Unable to replace narration with paced output: ${replace.stderr.trim()}`);

await writeFile(reportPath, `${JSON.stringify({project_id: manifest.project_id, source: narration, output: narration, original_duration_seconds: duration, target_duration_seconds: target, speed_factor: speed, paced_duration_seconds: pacedDuration, changed: true, target_wpm: manifest.narration_profile?.target_wpm ?? (manifest.tempo_profile === 'short' ? 155 : undefined), checked_at: new Date().toISOString()}, null, 2)}\n`, 'utf8');

console.log(`[voice-pace] ${duration.toFixed(3)}s -> ${pacedDuration.toFixed(3)}s atempo=${speed.toFixed(4)}`);
console.log(`[voice-pace] report: ${reportPath}`);
