import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const audioPath = manifest.audio?.narration_path ?? `projects/${manifest.project_id}/audio/narration.wav`;
const ffmpeg = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE_COMMAND ?? 'ffprobe';
const strict = process.env.REQUIRE_TTS_ALIGNMENT === '1';
const noiseDb = process.env.AUDIO_SILENCE_NOISE_DB ?? '-35dB';
const minSilence = Number(process.env.AUDIO_MIN_SILENCE_SECONDS ?? '0.20');
const tolerance = Number(process.env.AUDIO_ALIGNMENT_TOLERANCE_SECONDS ?? '0.35');

const logDir = join('projects', manifest.project_id, 'logs');
await mkdir(logDir, {recursive: true});
const reportPath = join(logDir, 'audio-alignment-report.json');

const fail = (message: string) => {
  if (strict) throw new Error(message);
  console.warn(`[audio-align] ${message}`);
};

if (!existsSync(audioPath)) {
  fail(`Narration file not found: ${audioPath}`);
  process.exit(strict ? 1 : 0);
}

const run = (command: string, args: string[]) => new Promise<{code: number; stdout: string; stderr: string}>((resolve, reject) => {
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', (code) => resolve({code: code ?? -1, stdout, stderr}));
});

const probe = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath]);
const duration = Number(probe.stdout.trim());
if (probe.code !== 0 || !Number.isFinite(duration) || duration <= 0) {
  fail(`Unable to probe narration duration: ${probe.stderr.trim() || probe.stdout.trim()}`);
  process.exit(strict ? 1 : 0);
}

const silence = await run(ffmpeg, ['-hide_banner', '-i', audioPath, '-af', `silencedetect=noise=${noiseDb}:d=${minSilence}`, '-f', 'null', '-']);
if (silence.code !== 0) {
  fail(`ffmpeg silencedetect failed: ${silence.stderr.trim()}`);
  process.exit(strict ? 1 : 0);
}

const starts = [...silence.stderr.matchAll(/silence_start:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
const ends = [...silence.stderr.matchAll(/silence_end:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
const silences = starts.map((start, i) => ({start, end: ends[i] ?? duration})).filter((x) => x.end >= x.start);
const speechSegments = silences.flatMap((s) => [] as Array<{start: number; end: number}>);
let cursor = 0;
for (const s of silences) {
  if (s.start > cursor) speechSegments.push({start: cursor, end: s.start});
  cursor = Math.max(cursor, s.end);
}
if (cursor < duration) speechSegments.push({start: cursor, end: duration});

const beats = [] as Array<Record<string, unknown>>;
let beatStart = 0;
for (const beat of manifest.beats) {
  const beatEnd = beatStart + beat.duration_seconds;
  const speech = speechSegments.reduce((total, segment) => {
    const overlap = Math.max(0, Math.min(beatEnd, segment.end) - Math.max(beatStart, segment.start));
    return total + overlap;
  }, 0);
  const leadingSilence = Math.max(0, Math.min(beatEnd, speechSegments[0]?.start ?? duration) - beatStart);
  beats.push({
    beat_id: beat.beat_id,
    start_seconds: beatStart,
    end_seconds: beatEnd,
    target_seconds: beat.duration_seconds,
    speech_seconds: speech,
    silence_seconds: Math.max(0, beat.duration_seconds - speech),
    leading_silence_seconds: leadingSilence,
    narration: beat.narration ?? beat.text ?? '',
  });
  beatStart = beatEnd;
}

const totalTarget = manifest.duration_seconds;
const report = {
  project_id: manifest.project_id,
  path: audioPath,
  duration_seconds: duration,
  target_duration_seconds: totalTarget,
  duration_delta_seconds: duration - totalTarget,
  tolerance_seconds: tolerance,
  silence_detection: {noise_db: noiseDb, min_silence_seconds: minSilence, intervals: silences},
  beats,
  aligned: Math.abs(duration - totalTarget) <= tolerance,
  checked_at: new Date().toISOString(),
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (Math.abs(duration - totalTarget) > tolerance) {
  fail(`Narration duration ${duration.toFixed(3)}s differs from target ${totalTarget}s beyond tolerance ${tolerance}s.`);
}
console.log(`[audio-align] ${beats.length} beat windows analyzed; detected ${speechSegments.length} speech regions.`);
console.log(`[audio-align] report: ${reportPath}`);
