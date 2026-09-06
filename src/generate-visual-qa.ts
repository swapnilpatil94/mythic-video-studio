import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {ProductionManifest} from './pipeline/types';

const exec = promisify(execFile);
const input = process.argv[2] ?? 'examples/karna-short.json';
const output = process.argv[3] ?? `renders/${input.split('/').pop()?.replace(/\.json$/i, '') ?? 'mythic-short'}.mp4`;
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const dir = `projects/${manifest.project_id}/qa`;
await mkdir(dir, {recursive: true});

const probe = JSON.parse((await exec('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', output], {maxBuffer: 1024 * 1024})).stdout);
const duration = Number(probe.format?.duration ?? manifest.duration_seconds);
const sampleFps = Math.max(9 / Math.max(duration, 1), 0.02);
const sheet = `${dir}/contact-sheet.jpg`;

await exec('ffmpeg', [
  '-hide_banner', '-y', '-i', output,
  '-vf', `fps=${sampleFps.toFixed(6)},scale=360:-2:flags=lanczos,drawtext=text='%{pts\\:hms}':x=12:y=12:fontsize=18:box=1:boxborderw=6,tile=3x3`,
  '-frames:v', '1', '-q:v', '3', sheet,
], {maxBuffer: 2 * 1024 * 1024});

const report = {
  project_id: manifest.project_id,
  output,
  duration_seconds: duration,
  requested_samples: 9,
  sample_fps: sampleFps,
  contact_sheet: sheet,
  note: 'Automated contact sheet for human visual review; it does not certify cinematic quality.',
  generated_at: new Date().toISOString(),
};
await writeFile(`${dir}/visual-qa-report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(`PASS: visual QA contact sheet written to ${sheet}`);
