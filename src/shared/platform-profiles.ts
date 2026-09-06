/**
 * Platform safe-zone data for the 1080x1920 vertical canvas — a single source of truth shared by
 * the Remotion compositor (`src/remotion/MythicShort.tsx`, which positions captions/branding
 * against it) and the Studio UI (which draws the same zones as an overlay diagram). No per-shot
 * behavior changes here — this only describes where a platform's own chrome (nav bars, like/share
 * icons, caption/progress row) sits, so the renderer can place burned-in text/branding around it.
 */

export type Rect = {x: number; y: number; width: number; height: number};

export type PlatformProfile = {
  id: string;
  label: string;
  canvasWidth: number;
  canvasHeight: number;
  /** Platform chrome the app itself draws over the video — content must stay clear of these. */
  safeZones: {
    topUi: Rect;
    bottomUi: Rect;
    sideUi: Rect;
  };
  /**
   * The lower "storytelling zone" burned-in subtitles live in — deliberately NOT the visual
   * center (captions centered in-frame read as a generic subtitle track, not part of the scene)
   * and deliberately clear of `bottomUi` (the platform's own caption/progress chrome). Given as a
   * center Y line plus a max block height; `resolveSubtitleBaseline` below nudges it up if a
   * platform's `bottomUi` would otherwise collide with it.
   */
  subtitleZone: {centerY: number; maxHeight: number; marginX: number};
  /** Small persistent watermark corner — chosen clear of `topUi`/`sideUi` and of the subtitle zone. */
  brandingZone: Rect;
};

export const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  youtube_shorts: {
    id: 'youtube_shorts',
    label: 'YouTube Shorts',
    canvasWidth: 1080,
    canvasHeight: 1920,
    safeZones: {
      topUi: {x: 0, y: 0, width: 1080, height: 150},
      // Shorts: right-rail like/comment/share/remix stack + bottom title/channel row.
      bottomUi: {x: 0, y: 1680, width: 1080, height: 240},
      sideUi: {x: 860, y: 300, width: 220, height: 1300},
    },
    subtitleZone: {centerY: 1540, maxHeight: 140, marginX: 160},
    brandingZone: {x: 40, y: 56, width: 220, height: 56},
  },
  instagram_reels: {
    id: 'instagram_reels',
    label: 'Instagram Reels',
    canvasWidth: 1080,
    canvasHeight: 1920,
    safeZones: {
      topUi: {x: 0, y: 0, width: 1080, height: 170},
      // Reels: right-rail like/comment/share/save + bottom caption/audio-title row tends taller.
      bottomUi: {x: 0, y: 1620, width: 1080, height: 300},
      sideUi: {x: 860, y: 260, width: 220, height: 1300},
    },
    subtitleZone: {centerY: 1540, maxHeight: 140, marginX: 160},
    brandingZone: {x: 40, y: 60, width: 220, height: 56},
  },
};

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Collision-aware subtitle placement: starts from the platform's configured `subtitleZone.centerY`
 * (the requested ~1500-1580 lower-storytelling band) and, only if that band's rectangle would
 * actually overlap the platform's `bottomUi` chrome, nudges the center up just far enough to clear
 * it with a small margin — never falls back to the frame's vertical center, and never moves further
 * than necessary. Returns the resolved center Y and whether a nudge was applied.
 */
export function resolveSubtitleCenterY(profile: PlatformProfile, blockHeight?: number): {centerY: number; nudged: boolean} {
  const height = Math.min(blockHeight ?? profile.subtitleZone.maxHeight, profile.subtitleZone.maxHeight);
  const margin = 24;
  const candidate: Rect = {
    x: profile.subtitleZone.marginX,
    y: profile.subtitleZone.centerY - height / 2,
    width: profile.canvasWidth - profile.subtitleZone.marginX * 2,
    height,
  };
  if (!rectsOverlap(candidate, profile.safeZones.bottomUi)) {
    return {centerY: profile.subtitleZone.centerY, nudged: false};
  }
  const clearedY = profile.safeZones.bottomUi.y - margin - height / 2;
  return {centerY: clearedY, nudged: true};
}

export function platformProfile(id: string | undefined): PlatformProfile {
  return PLATFORM_PROFILES[id ?? 'youtube_shorts'] ?? PLATFORM_PROFILES.youtube_shorts;
}

export const DEFAULT_PLATFORM_IDS = ['youtube_shorts', 'instagram_reels'] as const;
