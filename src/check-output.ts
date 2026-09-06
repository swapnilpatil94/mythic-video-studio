import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {ProductionManifest} from './pipeline/types';

const exec = promisify(execFile);
const input = process.argv[2] ?? 'examples/karna-short.json';
const output = process.argv[3] ?? `renders/${input.split('/').pop()?.replace(/\.json$/i, '') ?? 'mythic-short'}.mp4`;
const strict = process.env.REQUIRE_OUTPUT_QA === '1';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;

const run = async (cmd: string, args: string[]) => (await exec(cmd, args, {maxBuffer: 1024 * 1024})).stdout;
const errors: string[] = [];
let probe: Record<string, any> = {};
try {
  probe = JSON.parse(await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', output]));
} catch (error) {
  errors.push(`ffprobe failed: ${error instanceof Error ? error.message : String(error)}`);
}

const video = probe.streams?.find((stream: any) => stream.codec_type === 'video');
const audio = probe.streams?.find((stream: any) => stream.codec_type === 'audio');
if (!video) errors.push('missing video stream');
if (!audio) errors.push('missing audio stream');
if (video) {
  if (video.width !== 1080 || video.height !== 1920) errors.push(`resolution ${video.width}x${video.height}, expected 1080x1920`);
  const fps = Number(video.r_frame_rate?.split('/')[0]) / Number(video.r_frame_rate?.split('/')[1]);
  if (!Number.isFinite(fps) || Math.abs(fps - 30) > 0.01) errors.push(`fps ${video.r_frame_rate}, expected 30fps`);
}
const duration = Number(probe.format?.duration ?? video?.duration ?? 0);
if (!duration || Math.abs(duration - manifest.duration_seconds) > 0.5) errors.push(`duration ${duration.toFixed(3)}s differs from manifest ${manifest.duration_seconds}s by more than 0.5s`);

try {
  const black = await run('ffmpeg', ['-hide_banner', '-i', output, '-vf', "blackdetect=d=0.5:pix_th=0.10", '-an', '-f', 'null', '-']);
  if (/black_start:/m.test(black)) errors.push('black-frame interval detected by blackdetect');
} catch (error) {
  errors.push(`black-frame check failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const volume = await run('ffmpeg', ['-hide_banner', '-i', output, '-af', 'volumedetect', '-f', 'null', '-']);
  const maxMatch = volume.match(/max_volume:\s*(-?[\d.]+) dB/);
  if (maxMatch && Number(maxMatch[1]) > 0.1) errors.push(`audio peak ${maxMatch[1]} dB exceeds 0 dBFS`);
} catch (error) {
  errors.push(`audio clipping check failed: ${error instanceof Error ? error.message : String(error)}`);
}

const report = {
  project_id: manifest.project_id,
  output,
  expected: {width: 1080, height: 1920, fps: 30, duration_seconds: manifest.duration_seconds},
  observed: {duration_seconds: duration, video: video ? {width: video.width, height: video.height, fps: video.r_frame_rate, codec: video.codec_name} : null, audio: audio ? {codec: audio.codec_name, sample_rate: audio.sample_rate, channels: audio.channels} : null},
  errors,
  status: errors.length ? 'FAIL' : 'PASS',
  checked_at: new Date().toISOString(),
};
const dir = `projects/${manifest.project_id}/logs`;
await mkdir(dir, {recursive: true});
await writeFile(`${dir}/output-qa-report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (strict && errors.length) process.exit(1);
