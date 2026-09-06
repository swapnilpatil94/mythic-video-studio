import {access, existsSync} from 'node:fs';
import {constants} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {projectPaths, ensureProjectPaths} from './pipeline/paths';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);

type Candidate = {kind: string; source: string; path: string; runnable: boolean; note: string};
const candidates: Candidate[] = [];

async function runnable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandPath(command: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${JSON.stringify(command)}`], {stdio: ['ignore', 'pipe', 'ignore']});
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk.toString(); });
    child.on('error', () => resolve(null));
    child.on('close', (code) => resolve(code === 0 ? out.trim() || null : null));
  });
}

async function addCommand(kind: string, command: string, note: string) {
  const path = await commandPath(command);
  if (path) candidates.push({kind, source: 'PATH', path, runnable: true, note});
}

await addCommand('ffmpeg', 'ffmpeg', 'media processing');
await addCommand('ffprobe', 'ffprobe', 'media inspection');
await addCommand('python', 'python3', 'possible local model runtime');
await addCommand('comfyui', 'comfy', 'possible ComfyUI CLI; verify workflow/API separately');
await addCommand('draw-things', 'draw-things', 'possible Draw Things CLI; verify installation separately');
await addCommand('whisper', 'whisper', 'possible Whisper CLI; verify model/runtime separately');

for (const env of ['IMAGE_GENERATOR_COMMAND', 'FLUX_COMMAND', 'TTS_COMMAND', 'CHATTERBOX_COMMAND', 'WHISPER_COMMAND']) {
  const value = process.env[env]?.trim();
  if (value) candidates.push({kind: env, source: 'environment', path: value, runnable: true, note: 'configured by user; preflight validates executable'});
}

const home = homedir();
const dirs = [
  join(home, 'ComfyUI'),
  join(home, 'comfyui'),
  join(home, 'Draw Things'),
  join(home, 'draw-things'),
  join(home, 'Projects'),
  join(home, 'projects'),
  join(home, 'Developer'),
  join(home, 'dev'),
];
for (const dir of dirs) if (existsSync(dir)) candidates.push({kind: 'local-project-directory', source: 'filesystem', path: dir, runnable: true, note: 'directory found; contents are not assumed to be a working provider'});

const unique = Array.from(new Map(candidates.map((candidate) => [`${candidate.kind}:${candidate.path}`, candidate])).values());
const report = {
  project_id: manifest.project_id,
  checked_at: new Date().toISOString(),
  policy: 'Discovery only: never silently selects a model, workflow, voice, or provider.',
  candidates: unique,
  configured: {
    image_generator: process.env.IMAGE_GENERATOR_COMMAND ?? process.env.FLUX_COMMAND ?? null,
    tts: process.env.TTS_COMMAND ?? process.env.CHATTERBOX_COMMAND ?? null,
    whisper: process.env.WHISPER_COMMAND ?? null,
  },
};
const reportPath = `${paths.logs}/local-runtime-discovery.json`;
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
for (const candidate of unique) console.log(`[discover] ${candidate.kind}: ${candidate.path} (${candidate.note})`);
console.log(`Local runtime discovery report: ${reportPath}`);
