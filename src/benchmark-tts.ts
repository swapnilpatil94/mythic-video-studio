import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {runCommand} from './adapters/command';
import {commandArgs, resolveTTSProvider, TTS_PROVIDER_LABELS} from './pipeline/tts-provider';
import type {TTSProviderId} from './pipeline/types';

/**
 * Reproducible TTS provider benchmark (spec: "TTS Benchmarking" — use the same script, reference
 * voice, output format, and post-processing for every provider under test; do not pick a winner
 * from model reputation, let measurement decide; test both Short and Longform configuration).
 *
 * This is deliberately NOT a scored comparison. Pronunciation quality, voice similarity, emotional
 * delivery, and sentence-rhythm naturalness are judgment calls a human reviewer makes by actually
 * listening — faking a numeric score for those would be exactly the "pretend audio QA exists"
 * anti-pattern the project's own conventions warn against. What this script CAN measure
 * objectively — generation time, output duration/pace stability, clipping, dead air, success/
 * failure — it measures and reports per provider per format, then writes both WAV files and a
 * README pointing a human at what to listen for. The benchmark's job is to make that A/B
 * comparison easy and fair (same script, same reference voice, same run), not to replace it.
 */

const FORMATS = ['short', 'longform'] as const;
type BenchmarkFormat = (typeof FORMATS)[number];
const PROVIDER_IDS: TTSProviderId[] = ['chatterbox', 'vibevoice'];

const REFERENCE_AUDIO = process.env.TTS_REFERENCE_AUDIO?.trim()
  || 'assets/reference-voices/hindi-male-narrator.wav';

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join('benchmarks', 'tts', 'runs', runId);

type Fixture = {segments: Array<{beat_id: string; start_seconds: number; duration_seconds: number; text: string}>};

async function loadFixture(format: BenchmarkFormat): Promise<Fixture> {
  const path = join('benchmarks', 'tts', 'fixtures', `${format}.json`);
  return JSON.parse(await readFile(path, 'utf8')) as Fixture;
}

function ffprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFPROBE_COMMAND ?? 'ffprobe', args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.on('data', (c) => { stdout += c; });
    child.stderr.on('data', (c) => { stderr += c; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `ffprobe exited ${code}`)));
  });
}

function ffmpegToNull(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_COMMAND ?? 'ffmpeg', ['-hide_banner', ...args, '-f', 'null', '-'], {stdio: ['ignore', 'pipe', 'pipe']});
    let output = '';
    child.stdout.on('data', (c) => { output += c; });
    child.stderr.on('data', (c) => { output += c; });
    child.on('error', reject);
    child.on('exit', () => resolve(output));
  });
}

type ProviderRun = {
  provider: TTSProviderId;
  label: string;
  format: BenchmarkFormat;
  configured: boolean;
  success?: boolean;
  skipped_reason?: string;
  generation_seconds?: number;
  output_duration_seconds?: number;
  words?: number;
  words_per_minute?: number;
  peak_volume_dbfs?: number | null;
  likely_clipping?: boolean;
  has_significant_silence?: boolean;
  output_path?: string;
  error?: string;
};

async function benchmarkOne(providerId: TTSProviderId, format: BenchmarkFormat): Promise<ProviderRun> {
  const label = TTS_PROVIDER_LABELS[providerId];
  const provider = resolveTTSProvider({audio: {provider: providerId}});
  if (!provider) {
    return {provider: providerId, label, format, configured: false, skipped_reason: `${providerId === 'vibevoice' ? 'VIBEVOICE_COMMAND' : 'TTS_COMMAND/CHATTERBOX_COMMAND'} not configured`};
  }

  const fixture = await loadFixture(format);
  const outDir = join(runDir, format);
  await mkdir(outDir, {recursive: true});
  const outputPath = join(outDir, `${providerId}.wav`);
  const jobPath = join(outDir, `${providerId}-job.json`);

  const totalDuration = fixture.segments.reduce((sum, s) => sum + s.duration_seconds, 0);
  const job = {
    provider: providerId,
    project_id: 'tts-benchmark',
    language: 'hi-IN',
    title: `TTS benchmark (${format})`,
    output_path: outputPath,
    voice: provider.voice,
    reference_audio: REFERENCE_AUDIO,
    target_duration_seconds: totalDuration,
    segments: fixture.segments,
  };
  await writeFile(jobPath, `${JSON.stringify(job, null, 2)}\n`, 'utf8');

  const t0 = Date.now();
  const result = await runCommand(provider.command, [...commandArgs(provider.argsTemplate, {job: jobPath, output: outputPath}), JSON.stringify(job)]);
  const generationSeconds = (Date.now() - t0) / 1000;

  if (result.code !== 0 || !existsSync(outputPath)) {
    return {
      provider: providerId, label, format, configured: true, success: false,
      generation_seconds: Math.round(generationSeconds * 10) / 10,
      error: (result.stderr.trim() || result.stdout.trim()).slice(-2000),
    };
  }

  const durationStr = await ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outputPath]);
  const outputDuration = Number(durationStr);
  const volumeReport = await ffmpegToNull(['-i', outputPath, '-af', 'volumedetect']);
  const peakMatch = volumeReport.match(/max_volume:\s*(-?[\d.]+) dB/);
  const peakVolume = peakMatch ? Number(peakMatch[1]) : null;
  const silenceReport = await ffmpegToNull(['-i', outputPath, '-af', 'silencedetect=noise=-40dB:d=0.6']);
  const hasSignificantSilence = /silence_start/.test(silenceReport);
  const words = fixture.segments.reduce((sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length, 0);

  return {
    provider: providerId, label, format, configured: true, success: true,
    generation_seconds: Math.round(generationSeconds * 10) / 10,
    output_duration_seconds: Math.round(outputDuration * 100) / 100,
    words,
    words_per_minute: outputDuration > 0 ? Math.round((words / (outputDuration / 60)) * 10) / 10 : undefined,
    peak_volume_dbfs: peakVolume,
    likely_clipping: peakVolume !== null && peakVolume > 0.1,
    has_significant_silence: hasSignificantSilence,
    output_path: outputPath,
  };
}

async function main() {
  await mkdir(runDir, {recursive: true});
  const results: ProviderRun[] = [];
  for (const format of FORMATS) {
    for (const providerId of PROVIDER_IDS) {
      console.log(`[benchmark] ${TTS_PROVIDER_LABELS[providerId]} / ${format}...`);
      const run = await benchmarkOne(providerId, format);
      results.push(run);
      if (!run.configured) console.log(`[benchmark]   skipped: ${run.skipped_reason}`);
      else if (!run.success) console.log(`[benchmark]   FAILED: ${run.error?.split('\n').slice(-3).join(' | ')}`);
      else console.log(`[benchmark]   ok: ${run.generation_seconds}s to generate, ${run.output_duration_seconds}s output, ~${run.words_per_minute} WPM, peak ${run.peak_volume_dbfs}dBFS`);
    }
  }

  const summaryPath = join(runDir, 'summary.json');
  await writeFile(summaryPath, `${JSON.stringify({run_id: runId, reference_audio: REFERENCE_AUDIO, results}, null, 2)}\n`, 'utf8');

  const configuredCount = results.filter((r) => r.configured).length;
  const readmeLines = [
    `# TTS benchmark: ${runId}`,
    '',
    `Same reference voice for every run: \`${REFERENCE_AUDIO}\`. Same fixed script per format (see \`benchmarks/tts/fixtures/\`) for every provider — nothing was changed between runs.`,
    '',
    configuredCount === 0
      ? '**No provider was configured on this machine for this run** — every row below was skipped. Configure TTS_COMMAND/CHATTERBOX_COMMAND and/or VIBEVOICE_COMMAND in .env and rerun `npm run benchmark:tts`.'
      : `${configuredCount}/${results.length} provider/format combinations were configured and attempted.`,
    '',
    '## Objectively measured',
    '',
    '| Provider | Format | Status | Generation time | Output duration | WPM | Peak volume | Clipping? | Dead air? |',
    '|---|---|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.label} | ${r.format} | ${!r.configured ? 'not configured' : r.success ? 'ok' : 'FAILED'} | ${r.generation_seconds ?? '-'}s | ${r.output_duration_seconds ?? '-'}s | ${r.words_per_minute ?? '-'} | ${r.peak_volume_dbfs ?? '-'}dBFS | ${r.likely_clipping ? 'yes' : r.success ? 'no' : '-'} | ${r.has_significant_silence ? 'yes' : r.success ? 'no' : '-'} |`),
    '',
    '## What this does NOT measure — listen for these yourself',
    '',
    'Play the matching files side by side (same format, different provider) from this run\'s directory and judge:',
    '',
    '- **Hindi pronunciation accuracy** — mispronounced or garbled words',
    '- **Voice similarity to the reference clip** — does it actually sound like the reference speaker, not just "a" Hindi voice',
    '- **Emotional delivery** — matches the KATHAAYA narrator identity (mature, warm, cinematic, controlled — never "YouTube announcer," never robotic)',
    '- **Natural pauses and sentence rhythm** — not artificially chopped, not run-on',
    '- **Long-form consistency** — for the longform row specifically, does the voice/pace drift or stay consistent across the whole passage',
    '- **Audio artifacts** — clicks, warble, metallic/robotic texture, unnatural breaths',
    '',
    'Do not declare a winner from generation time or WPM alone — those are throughput/pacing signals, not quality signals. See docs/STATUS.md for this benchmark\'s own verified/unverified status per provider on this machine.',
  ];
  await writeFile(join(runDir, 'README.md'), `${readmeLines.join('\n')}\n`, 'utf8');

  console.log(`[benchmark] summary: ${summaryPath}`);
  console.log(`[benchmark] listening guide: ${join(runDir, 'README.md')}`);
}

await main();
