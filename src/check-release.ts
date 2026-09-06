import {createHash} from 'node:crypto';
import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {ProductionManifest} from './pipeline/types';

const execFileAsync = promisify(execFile);
const input = process.argv[2] ?? 'examples/karna-short.json';
const output = process.argv[3] ?? `renders/${input.split('/').pop()?.replace(/\.json$/i, '') ?? 'mythic-short'}.mp4`;
const strict = process.env.REQUIRE_RELEASE_EVIDENCE === '1';

const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const projectDir = `projects/${manifest.project_id}`;
const logsDir = `${projectDir}/logs`;
const qaDir = `${projectDir}/qa`;

const exists = async (path: string) => {
  try { await access(path); return true; } catch { return false; }
};

const readJson = async (path: string) => {
  if (!(await exists(path))) return null;
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
};

const sha256 = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');

const evidence = [
  {name: 'preflight', path: `${logsDir}/preflight-report.json`, required: strict},
  {name: 'audio-duration', path: `${logsDir}/audio-report.json`, required: strict && process.env.REQUIRE_TTS === '1'},
  {name: 'audio-alignment', path: `${logsDir}/audio-alignment-report.json`, required: strict && process.env.REQUIRE_TTS_ALIGNMENT === '1'},
  {name: 'output-qa', path: `${logsDir}/output-qa-report.json`, required: strict && process.env.REQUIRE_OUTPUT_QA === '1'},
  {name: 'visual-qa', path: `${qaDir}/visual-qa-report.json`, required: strict},
  {name: 'contact-sheet', path: `${qaDir}/contact-sheet.jpg`, required: strict},
];

const missing = evidence.filter((item) => item.required && !(await exists(item.path))).map((item) => item.path);
const outputExists = await exists(output);
if (!outputExists) missing.push(output);

const outputQa = await readJson(`${logsDir}/output-qa-report.json`);
const qaFailures = outputQa?.status === 'FAIL' ? ['output-qa report status=FAIL'] : [];
const manifestSha256 = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
const outputSha256 = outputExists ? await sha256(output) : null;

let ffprobe: Record<string, any> = {};
if (outputExists) {
  try {
    ffprobe = JSON.parse((await execFileAsync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', output], {maxBuffer: 2 * 1024 * 1024})).stdout);
  } catch (error) {
    missing.push(`ffprobe:${error instanceof Error ? error.message : String(error)}`);
  }
}

const video = ffprobe.streams?.find((stream: any) => stream.codec_type === 'video');
const audio = ffprobe.streams?.find((stream: any) => stream.codec_type === 'audio');
const duration = Number(ffprobe.format?.duration ?? video?.duration ?? 0);
const runtime = {
  duration_seconds: duration || null,
  resolution: video ? `${video.width}x${video.height}` : null,
  fps: video?.r_frame_rate ?? null,
  video_codec: video?.codec_name ?? null,
  audio_codec: audio?.codec_name ?? null,
  audio_sample_rate: audio?.sample_rate ?? null,
  audio_channels: audio?.channels ?? null,
};

const report = {
  project_id: manifest.project_id,
  manifest: {path: input, sha256: manifestSha256},
  output: {path: output, exists: outputExists, sha256: outputSha256},
  runtime,
  evidence: Object.fromEntries(evidence.map((item) => [item.name, {path: item.path, required: item.required, exists: exists(item.path)}])),
  failures: [...missing, ...qaFailures],
  status: missing.length || qaFailures.length ? 'FAIL' : 'PASS',
  generated_at: new Date().toISOString(),
};

await mkdir(logsDir, {recursive: true});
await writeFile(`${logsDir}/release-evidence-report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (strict && report.status === 'FAIL') process.exit(1);
