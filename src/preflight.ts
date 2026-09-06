import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {projectPaths, ensureProjectPaths} from './pipeline/paths';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);

const checks: Array<{name: string; ok: boolean; detail: string}> = [];

const commandExists = (command: string) => new Promise<boolean>((resolve) => {
  const child = spawn(command, ['--version'], {stdio: 'ignore'});
  child.on('error', () => resolve(false));
  child.on('exit', (code) => resolve(code === 0));
});

async function checkCommand(name: string, command: string | undefined, required: boolean) {
  if (!command) {
    checks.push({name, ok: !required, detail: required ? 'not configured' : 'not configured (optional)'});
    return;
  }
  const executable = command.trim().split(/\s+/)[0];
  const ok = await commandExists(executable);
  checks.push({name, ok: ok || !required, detail: ok ? `available: ${executable}` : `executable not found: ${executable}`});
}

checks.push({name: 'manifest', ok: existsSync(input), detail: input});
checks.push({name: 'node', ok: await commandExists('node'), detail: process.version});
checks.push({name: 'ffmpeg', ok: await commandExists('ffmpeg'), detail: 'required for audio/image/output QA'});
checks.push({name: 'ffprobe', ok: await commandExists('ffprobe'), detail: 'required for media inspection'});
checks.push({name: 'npx', ok: await commandExists('npx'), detail: 'required by production runner'});

const strictAssets = process.env.REQUIRE_GENERATED_ASSETS === '1';
const strictTts = process.env.REQUIRE_TTS === '1';
await checkCommand('image generator', process.env.IMAGE_GENERATOR_COMMAND ?? process.env.FLUX_COMMAND, strictAssets);
await checkCommand('TTS generator', process.env.TTS_COMMAND ?? process.env.CHATTERBOX_COMMAND, strictTts);

if (process.env.REQUIRE_CHARACTER_REFERENCES === '1') {
  const referenceDir = process.env.ASSET_REFERENCE_DIR?.trim() || `${paths.root}/references`;
  checks.push({name: 'character reference directory', ok: existsSync(referenceDir), detail: referenceDir});
}

const report = {
  project_id: manifest.project_id,
  checked_at: new Date().toISOString(),
  strict: {
    generated_assets: strictAssets,
    tts: strictTts,
    character_references: process.env.REQUIRE_CHARACTER_REFERENCES === '1',
  },
  checks,
  passed: checks.every((check) => check.ok),
};

const reportPath = `${paths.logs}/preflight-report.json`;
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

for (const check of checks) console.log(`[preflight] ${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
console.log(`Preflight report: ${reportPath}`);

if (!report.passed) throw new Error('Preflight failed. Resolve the reported local runtime prerequisites before production.');
