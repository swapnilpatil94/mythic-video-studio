import {existsSync} from 'node:fs';
import {mkdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const audioDir = join('projects', manifest.project_id, 'audio');
const narration = manifest.audio?.narration_path ?? join(audioDir, 'narration.wav');
const music = manifest.audio?.music_path;
const sfxDir = manifest.audio?.sfx_dir ?? join(audioDir, 'sfx');
const output = join(audioDir, 'final-mix.wav');
const ffmpeg = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const strict = process.env.REQUIRE_AUDIO_MIX === '1';
const musicVolume = Number(process.env.MUSIC_VOLUME ?? '0.16');
const sfxVolume = Number(process.env.SFX_VOLUME ?? '0.55');

const fail = (message: string) => {
  if (strict) throw new Error(message);
  console.warn(`[audio-mix] ${message}`);
};

if (!existsSync(narration)) {
  fail(`Narration file not found: ${narration}`);
  process.exit(strict ? 1 : 0);
}
if (!Number.isFinite(musicVolume) || musicVolume < 0 || musicVolume > 1) throw new Error('MUSIC_VOLUME must be between 0 and 1.');
if (!Number.isFinite(sfxVolume) || sfxVolume < 0 || sfxVolume > 1) throw new Error('SFX_VOLUME must be between 0 and 1.');

await mkdir(audioDir, {recursive: true});

const run = (args: string[]) => new Promise<{code: number; stderr: string}>((resolve, reject) => {
  const child = spawn(ffmpeg, args, {stdio: ['ignore', 'ignore', 'pipe']});
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', (code) => resolve({code: code ?? -1, stderr}));
});

const inputs: string[] = [narration];
const filters: string[] = ['[0:a]aresample=48000,volume=0.95[narr]'];
let nextInput = 1;
let musicAvailable = false;

if (music) {
  if (!existsSync(music)) {
    fail(`Music file not found: ${music}`);
  } else {
    inputs.push(music);
    filters.push(`[${nextInput}:a]aresample=48000,volume=${musicVolume.toFixed(3)},aloop=loop=-1:size=2e+09[music]`);
    musicAvailable = true;
    nextInput += 1;
  }
}

let cursor = 0;
const sfxLabels: string[] = [];
for (const beat of manifest.beats) {
  const candidates = [
    join(sfxDir, `${beat.beat_id}.wav`),
    join(sfxDir, `${beat.beat_id}.mp3`),
    join(sfxDir, `${beat.beat_id}.m4a`),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (path) {
    const inputIndex = nextInput++;
    inputs.push(path);
    const label = `sfx${sfxLabels.length}`;
    const delayMs = Math.max(0, Math.round(cursor * 1000));
    filters.push(`[${inputIndex}:a]aresample=48000,volume=${sfxVolume.toFixed(3)},adelay=${delayMs}:all=1[${label}]`);
    sfxLabels.push(label);
  }
  cursor += beat.duration_seconds;
}

const mixLabels = ['[narr]'];
if (musicAvailable) mixLabels.push('[music]');
for (const label of sfxLabels) mixLabels.push(`[${label}]`);

if (mixLabels.length === 1) {
  filters.push('[narr]alimiter=limit=0.95:level=disabled[final]');
} else {
  filters.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0,alimiter=limit=0.95:level=disabled[final]`);
}

const args = ['-y'];
for (const file of inputs) args.push('-i', file);
args.push('-filter_complex', filters.join(';'), '-map', '[final]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', output);

const result = await run(args);
if (result.code !== 0 || !existsSync(output)) {
  fail(`FFmpeg audio mix failed: ${result.stderr.trim()}`);
  process.exit(strict ? 1 : 0);
}

console.log(`[audio-mix] narration=${narration}`);
console.log(`[audio-mix] music=${musicAvailable ? music : 'none'}`);
console.log(`[audio-mix] sfx=${sfxLabels.length}`);
console.log(`[audio-mix] output=${output}`);
