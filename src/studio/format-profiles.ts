import {profileFor, type FormatProfile} from '../remotion/format';
import {PLATFORM_PROFILES, platformProfile, resolveSubtitleCenterY, type PlatformProfile} from '../shared/platform-profiles';

/**
 * Read-only surface over the compositor's actual format profile (`src/remotion/format.ts`) — the
 * Studio does not define a second, parallel set of timing/density/camera knobs. `profileFor` is
 * the same function `MythicShort.tsx` calls at render time, driven purely by `duration_seconds`,
 * so what the UI shows here is guaranteed to match what the renderer will actually do.
 */
export function resolveFormatProfile(durationSeconds: number): FormatProfile & {
  description: {timing: string; visualDensity: string; cameraIntensity: string; textFrequency: string; revealFrequency: string; pacing: string};
} {
  const profile = profileFor(durationSeconds);
  const isShort = profile.kind === 'short';
  return {
    ...profile,
    description: {
      timing: isShort ? 'Fast-cut: within-beat sub-shot cuts every ~2-4s' : 'Gentler continuous motion sustained over minutes',
      visualDensity: isShort ? 'High — idle drift/parallax amplitude at full scale' : `Reduced — idle drift/parallax at ${Math.round(profile.idleAmpScale * 100)}% scale`,
      cameraIntensity: `Camera preset contribution at ${Math.round(profile.cameraIntensity * 100)}% weight`,
      textFrequency: 'Word-level kinetic captions synced to real Whisper alignment (unchanged by format)',
      revealFrequency: `Ink-draw reveal spans ${Math.round(profile.revealFraction * 100)}% of a beat/sub-shot window`,
      pacing: `Keyword flourish holds for ${profile.keywordHoldSeconds}s once popped in`,
    },
  };
}

export function listPlatformProfiles(): PlatformProfile[] {
  return Object.values(PLATFORM_PROFILES);
}

export function getPlatformProfile(id: string) {
  const profile = platformProfile(id);
  const subtitle = resolveSubtitleCenterY(profile);
  return {...profile, resolvedSubtitleCenterY: subtitle.centerY, subtitleNudged: subtitle.nudged};
}
