import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {basename, dirname, join} from 'node:path';
import {runCommand} from './adapters/command';
import {commandArgs, resolveTTSProvider, selectedTTSProviderId, TTS_PROVIDER_LABELS} from './pipeline/tts-provider';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;
const root = `projects/${manifest.project_id}`;
const audioDir = join(root, 'audio');
const logsDir = join(root, 'logs');
await mkdir(audioDir, {recursive: true});
await mkdir(logsDir, {recursive: true});

const providerId = selectedTTSProviderId(manifest);
const provider = resolveTTSProvider(manifest);
const strict = process.env.REQUIRE_TTS === '1';
const outputPath = manifest.audio?.narration_path ?? join(audioDir, 'narration.wav');

const narration = manifest.beats.map((beat) => ({
  beat_id: beat.beat_id,
  start_seconds: manifest.beats.slice(0, manifest.beats.indexOf(beat)).reduce((sum, b) => sum + b.duration_seconds, 0),
  duration_seconds: beat.duration_seconds,
  text: (beat.narration ?? beat.text ?? '').trim(),
})).filter((beat) => beat.text.length > 0);

const scriptPath = join(logsDir, 'narration-job.json');
const job = {
  provider: providerId,
  project_id: manifest.project_id,
  language: manifest.language,
  title: manifest.title,
  output_path: outputPath,
  voice: provider?.voice ?? '',
  reference_audio: provider?.referenceAudio ?? '',
  target_duration_seconds: manifest.duration_seconds,
  segments: narration,
};
await writeFile(scriptPath, `${JSON.stringify(job, null, 2)}\n`, 'utf8');

if (existsSync(outputPath)) {
  console.log(`[voice] existing narration found: ${outputPath}`);
  process.exit(0);
}

if (narration.length === 0) {
  const message = 'No narration text found in manifest beats (use beat.narration or beat.text).';
  if (strict) throw new Error(message);
  console.warn(`[voice] ${message}`);
  process.exit(0);
}

if (!provider) {
  const envHint = providerId === 'vibevoice' ? 'VIBEVOICE_COMMAND' : 'TTS_COMMAND/CHATTERBOX_COMMAND';
  const message = `${TTS_PROVIDER_LABELS[providerId]} is selected but ${envHint} is not configured.`;
  if (strict) throw new Error(message);
  console.warn(`[voice] ${message}`);
  console.warn(`[voice] Job written to ${scriptPath}`);
  process.exit(0);
}

console.log(`[voice] generating narration via ${provider.label} (${narration.length} segments)`);
const result = await runCommand(provider.command, [...commandArgs(provider.argsTemplate, {job: scriptPath, output: outputPath}), JSON.stringify(job)]);
if (result.code !== 0 || !existsSync(outputPath)) {
  console.error(result.stderr.trim() || result.stdout.trim());
  throw new Error(`${provider.label} generation failed or did not create ${outputPath}`);
}

console.log(`[voice] ready: ${outputPath}`);
console.log(`[voice] job: ${basename(scriptPath)} (${dirname(outputPath)})`);
