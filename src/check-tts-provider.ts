import {commandArgs, resolveTTSProvider, selectedTTSProviderId, TTS_PROVIDER_LABELS} from './pipeline/tts-provider';
import type {ProductionManifest} from './pipeline/types';

// Isolate from whatever this machine's real .env actually has configured — these checks assert
// the *selection/abstraction logic* (which provider, from which source, in which priority order),
// not that a real local adapter is installed.
const PROVIDER_ENV_VARS = [
  'TTS_PROVIDER',
  'TTS_COMMAND', 'TTS_ARGS', 'TTS_VOICE', 'TTS_REFERENCE_AUDIO',
  'CHATTERBOX_COMMAND', 'CHATTERBOX_ARGS', 'CHATTERBOX_VOICE', 'CHATTERBOX_REFERENCE_AUDIO',
  'VIBEVOICE_COMMAND', 'VIBEVOICE_ARGS', 'VIBEVOICE_VOICE', 'VIBEVOICE_REFERENCE_AUDIO',
] as const;
const savedEnv = Object.fromEntries(PROVIDER_ENV_VARS.map((key) => [key, process.env[key]]));
function resetEnv() { for (const key of PROVIDER_ENV_VARS) delete process.env[key]; }
function restoreEnv() { for (const key of PROVIDER_ENV_VARS) { const v = savedEnv[key]; if (v === undefined) delete process.env[key]; else process.env[key] = v; } }

function manifestWith(audio?: ProductionManifest['audio']): Pick<ProductionManifest, 'audio'> {
  return {audio};
}

try {
  // Default provider (spec section 15: must not arbitrarily remove the current Chatterbox
  // default) is 'chatterbox' when nothing at all is configured, for both formats — provider
  // selection has no format-specific branch, by design (section 13: both engines must work for
  // both Short and Longform, so the selection logic itself must not special-case either).
  resetEnv();
  if (selectedTTSProviderId(manifestWith(undefined)) !== 'chatterbox') throw new Error('default provider must be chatterbox when nothing is configured');

  // A manifest's own audio.provider is the highest-priority source.
  resetEnv();
  process.env.TTS_PROVIDER = 'vibevoice';
  if (selectedTTSProviderId(manifestWith({provider: 'chatterbox'})) !== 'chatterbox') {
    throw new Error('manifest.audio.provider must take priority over TTS_PROVIDER');
  }

  // TTS_PROVIDER env var is the fallback when the manifest doesn't specify one.
  resetEnv();
  process.env.TTS_PROVIDER = 'vibevoice';
  if (selectedTTSProviderId(manifestWith(undefined)) !== 'vibevoice') throw new Error('TTS_PROVIDER env var must be honored when manifest.audio.provider is unset');

  // resolveTTSProvider returns null (not a throw, not a silent fallback to the other provider)
  // when the selected provider's command isn't configured — generate-voice.ts and preflight are
  // responsible for turning that into a real error or a warned-and-skip, not this module.
  resetEnv();
  if (resolveTTSProvider(manifestWith({provider: 'chatterbox'})) !== null) throw new Error('unconfigured chatterbox must resolve to null, not a guessed command');
  resetEnv();
  if (resolveTTSProvider(manifestWith({provider: 'vibevoice'})) !== null) throw new Error('unconfigured vibevoice must resolve to null, not a silent fallback to chatterbox');

  // Chatterbox: full config resolves correctly, including its legacy CHATTERBOX_* fallback names.
  resetEnv();
  process.env.CHATTERBOX_COMMAND = 'python3';
  process.env.CHATTERBOX_ARGS = 'tools/chatterbox_tts.py {job}';
  process.env.CHATTERBOX_VOICE = 'narrator-1';
  process.env.CHATTERBOX_REFERENCE_AUDIO = '/tmp/ref.wav';
  const chatterbox = resolveTTSProvider(manifestWith({provider: 'chatterbox'}));
  if (!chatterbox || chatterbox.id !== 'chatterbox' || chatterbox.command !== 'python3' || chatterbox.voice !== 'narrator-1' || chatterbox.referenceAudio !== '/tmp/ref.wav') {
    throw new Error(`chatterbox provider did not resolve correctly: ${JSON.stringify(chatterbox)}`);
  }
  if (chatterbox.label !== TTS_PROVIDER_LABELS.chatterbox) throw new Error('chatterbox label mismatch');

  // VibeVoice: full config resolves correctly, on its own dedicated env vars — configuring it
  // must not require touching or clearing any Chatterbox var (both can be configured at once;
  // spec section 12/24: neither provider is forced to "win", switching is a config choice).
  resetEnv();
  process.env.VIBEVOICE_COMMAND = 'python3';
  process.env.VIBEVOICE_ARGS = 'tools/vibevoice_tts.py {job}';
  process.env.VIBEVOICE_VOICE = 'kathaya-narrator';
  process.env.VIBEVOICE_REFERENCE_AUDIO = '/tmp/ref-vv.wav';
  const vibevoice = resolveTTSProvider(manifestWith({provider: 'vibevoice'}));
  if (!vibevoice || vibevoice.id !== 'vibevoice' || vibevoice.command !== 'python3' || vibevoice.voice !== 'kathaya-narrator' || vibevoice.referenceAudio !== '/tmp/ref-vv.wav') {
    throw new Error(`vibevoice provider did not resolve correctly: ${JSON.stringify(vibevoice)}`);
  }
  if (vibevoice.label !== TTS_PROVIDER_LABELS.vibevoice) throw new Error('vibevoice label mismatch');

  // Both providers configured simultaneously must not cross-contaminate each other's settings.
  resetEnv();
  process.env.CHATTERBOX_COMMAND = 'python3';
  process.env.CHATTERBOX_ARGS = 'tools/chatterbox_tts.py {job}';
  process.env.VIBEVOICE_COMMAND = 'python3';
  process.env.VIBEVOICE_ARGS = 'tools/vibevoice_tts.py {job}';
  const both1 = resolveTTSProvider(manifestWith({provider: 'chatterbox'}));
  const both2 = resolveTTSProvider(manifestWith({provider: 'vibevoice'}));
  if (both1?.argsTemplate !== 'tools/chatterbox_tts.py {job}') throw new Error('chatterbox config leaked/was overwritten when vibevoice was also configured');
  if (both2?.argsTemplate !== 'tools/vibevoice_tts.py {job}') throw new Error('vibevoice config leaked/was overwritten when chatterbox was also configured');

  // commandArgs token substitution (shared by both providers, and by the image generator before
  // them) — {job} and {output} both resolve, unknown tokens pass through untouched.
  const args = commandArgs('{job} --out {output} --extra', {job: '/tmp/job.json', output: '/tmp/out.wav'});
  if (args.join(' ') !== '/tmp/job.json --out /tmp/out.wav --extra') throw new Error(`commandArgs substitution wrong: ${JSON.stringify(args)}`);

  console.log('TTS provider contract checks passed: default/override priority, both providers resolve independently without cross-contamination, unconfigured providers resolve to null (never a silent fallback), token substitution.');
} finally {
  restoreEnv();
}
