import type {ProductionManifest, TTSProviderId} from './types';

/**
 * TTS provider abstraction. KATHAAYA has two production-capable local Hindi TTS engines —
 * Chatterbox (voice cloning, the existing default) and VibeVoice Hindi 7B (long-form, also
 * voice-cloning capable) — and the rest of the pipeline (generate-voice.ts, preflight, the Studio
 * UI) should not need to know which one actually ran. Both speak the exact same job contract this
 * repo already used for Chatterbox alone (see tools/chatterbox_tts.py's own docstring): a job JSON
 * with project_id/language/title/output_path/voice/reference_audio/target_duration_seconds/
 * segments, written to a file and passed to a configured external command. Extending that existing
 * contract (rather than inventing a new shape) is what lets a second provider slot in without
 * touching generate-voice.ts's actual generation logic — only *which command* runs changes.
 */

export type TTSJobSegment = {
  beat_id: string;
  start_seconds: number;
  duration_seconds: number;
  text: string;
};

export type TTSJob = {
  provider: TTSProviderId;
  project_id: string;
  language: string;
  title: string;
  output_path: string;
  voice: string;
  reference_audio: string;
  target_duration_seconds: number;
  segments: TTSJobSegment[];
};

export type TTSProviderConfig = {
  id: TTSProviderId;
  /** Human-readable label, for logs/UI. */
  label: string;
  command: string;
  argsTemplate: string;
  voice: string;
  referenceAudio: string;
};

const KATHAAYA_NARRATOR_VOICE_ID = 'kathaya-narrator';

/**
 * Reads the command/args/voice/reference-audio for one provider from its env vars. Each provider
 * gets its own dedicated COMMAND/ARGS/VOICE/REFERENCE_AUDIO vars (VIBEVOICE_ prefixed, alongside
 * the existing TTS_/CHATTERBOX_ prefixed names) so both can be configured at once — switching the
 * manifest's audio.provider (or TTS_PROVIDER) is then the only thing that changes which one
 * actually runs; neither provider's config has to be blanked out to use the other. Returns null
 * if that provider's command isn't configured at all (distinct from a configured-but-failing
 * command, which surfaces as a real error later, in generate-voice.ts / preflight).
 */
function readProviderEnv(id: TTSProviderId): Omit<TTSProviderConfig, 'id' | 'label'> | null {
  if (id === 'vibevoice') {
    const command = (process.env.VIBEVOICE_COMMAND ?? '').trim();
    if (!command) return null;
    return {
      command,
      argsTemplate: (process.env.VIBEVOICE_ARGS ?? '').trim(),
      voice: process.env.VIBEVOICE_VOICE ?? process.env.TTS_VOICE ?? KATHAAYA_NARRATOR_VOICE_ID,
      referenceAudio: process.env.VIBEVOICE_REFERENCE_AUDIO ?? process.env.TTS_REFERENCE_AUDIO ?? '',
    };
  }
  const command = (process.env.TTS_COMMAND ?? process.env.CHATTERBOX_COMMAND ?? '').trim();
  if (!command) return null;
  return {
    command,
    argsTemplate: (process.env.TTS_ARGS ?? process.env.CHATTERBOX_ARGS ?? '').trim(),
    voice: process.env.TTS_VOICE ?? process.env.CHATTERBOX_VOICE ?? KATHAAYA_NARRATOR_VOICE_ID,
    referenceAudio: process.env.TTS_REFERENCE_AUDIO ?? process.env.CHATTERBOX_REFERENCE_AUDIO ?? '',
  };
}

export const TTS_PROVIDER_LABELS: Record<TTSProviderId, string> = {
  chatterbox: 'Chatterbox',
  vibevoice: 'VibeVoice Hindi 7B',
};

/**
 * Which provider a given manifest/run should use, in priority order: the manifest's own
 * `audio.provider` (set by the Studio UI or a hand-edited manifest), then the TTS_PROVIDER env
 * var, defaulting to 'chatterbox' — the existing, already-proven production path. Never silently
 * falls back to the other provider if the requested one isn't configured; that's a real
 * misconfiguration generate-voice.ts and preflight should surface, not paper over.
 */
export function selectedTTSProviderId(manifest: Pick<ProductionManifest, 'audio'>): TTSProviderId {
  return manifest.audio?.provider ?? (process.env.TTS_PROVIDER as TTSProviderId | undefined) ?? 'chatterbox';
}

/** Resolves the full config (command/args/voice/reference audio) for the selected provider, or
 * null if that provider's command isn't configured in this environment. */
export function resolveTTSProvider(manifest: Pick<ProductionManifest, 'audio'>): TTSProviderConfig | null {
  const id = selectedTTSProviderId(manifest);
  const env = readProviderEnv(id);
  if (!env) return null;
  return {id, label: TTS_PROVIDER_LABELS[id], ...env};
}

/** Substitutes the job file / output path tokens into a provider's raw args template — the same
 * templating convention already used for the image generator and (previously) Chatterbox
 * specifically, now shared so a new provider's ARGS string works the same way. */
export function commandArgs(template: string, tokens: {job: string; output: string}): string[] {
  return template.split(/\s+/).filter(Boolean).map((token) => token
    .replaceAll('{job}', tokens.job)
    .replaceAll('{output}', tokens.output));
}
