import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';

const manifestPath = process.argv[2] ?? 'examples/karna-short.json';
const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {scripts?: Record<string, string>};
const produce = await readFile('src/produce.ts', 'utf8');
const checks: Array<{name: string; ok: boolean; detail: string}> = [];

const requiredFiles = [
  'src/cli.ts', 'src/produce.ts', 'src/preflight.ts', 'src/check-release.ts',
  'src/generate-assets.ts', 'src/inspect-assets.ts', 'src/normalize-assets.ts',
  'src/check-asset-requirements.ts', 'src/generate-voice.ts', 'src/inspect-audio.ts',
  'src/align-audio.ts', 'src/mix-audio.ts', 'src/generate-captions.ts', 'src/stage-assets.ts',
  'src/generate-visual-qa.ts', 'src/check-output.ts', 'src/check-motion.ts', 'src/check-visual-beats.ts',
  'src/remotion/index.ts', 'src/remotion/visual-beats.tsx', 'src/remotion/MythicShort.tsx',
];

checks.push({name: 'manifest', ok: existsSync(manifestPath), detail: manifestPath});
for (const file of requiredFiles) checks.push({name: `file:${file}`, ok: existsSync(file), detail: existsSync(file) ? 'present' : 'missing'});

const requiredScripts = [
  'validate', 'inspect', 'prepare', 'preflight', 'check:pipeline', 'check:release', 'generate:assets',
  'inspect:assets', 'normalize:assets', 'check:asset-requirements', 'stage:assets', 'generate:voice',
  'inspect:audio', 'align:audio', 'mix:audio', 'check:motion', 'check:visual-beats', 'generate:captions',
  'check:output', 'generate:visual-qa', 'produce',
];
for (const script of requiredScripts) {
  const command = packageJson.scripts?.[script];
  checks.push({name: `npm-script:${script}`, ok: Boolean(command), detail: command ?? 'missing'});
}

const requiredProduceStages = [
  'src/preflight.ts', 'src/check-pipeline.ts', 'src/cli.ts', 'src/pipeline/prepare-project.ts',
  'src/generate-assets.ts', 'src/normalize-assets.ts', 'src/inspect-assets.ts', 'src/check-asset-requirements.ts',
  'src/generate-voice.ts', 'src/inspect-audio.ts', 'src/align-audio.ts', 'src/mix-audio.ts',
  'src/generate-captions.ts', 'src/stage-assets.ts', 'remotion', 'src/generate-visual-qa.ts',
  'src/check-output.ts', 'src/check-release.ts',
];
for (const stage of requiredProduceStages) checks.push({name: `produce-stage:${stage}`, ok: produce.includes(stage), detail: produce.includes(stage) ? 'wired' : 'not referenced'});

const strictGates = [
  'REQUIRE_GENERATED_ASSETS', 'REQUIRE_ASSET_REQUIREMENTS', 'REQUIRE_TTS',
  'REQUIRE_TTS_ALIGNMENT', 'REQUIRE_AUDIO_MIX', 'REQUIRE_OUTPUT_QA', 'REQUIRE_RELEASE_EVIDENCE',
];
for (const gate of strictGates) checks.push({name: `strict-gate:${gate}`, ok: produce.includes(gate), detail: produce.includes(gate) ? 'wired' : 'not referenced'});

const report = {checked_at: new Date().toISOString(), manifest: manifestPath, checks, passed: checks.every((check) => check.ok)};
console.log(JSON.stringify(report, null, 2));
if (!report.passed) throw new Error('Pipeline contract check failed. Resolve missing files, scripts, stages, or strict gates.');
