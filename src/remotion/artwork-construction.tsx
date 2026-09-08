import React from 'react';
import {Img} from 'remotion';

export type ConstructionRegion = {
  /** Semantic illustration role. Coordinates are local to the source artwork, not the video frame. */
  id: string;
  x: number;
  y: number;
  radius: number;
  start: number;
  end: number;
};

export type ConstructionSubject = {
  /** Subject focus in source-image percentage space. Usually comes from the active shot preset. */
  focusX: number;
  focusY: number;
  /** Optional source-image subject bounds. If supplied, regions are generated inside these bounds. */
  bounds?: {left: number; top: number; right: number; bottom: number};
  /** Optional semantic map supplied by an asset/art director. */
  regions?: ConstructionRegion[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clampPct = (value: number) => Math.max(0, Math.min(100, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/**
 * Default portrait map for the acceptance fixture. It is deliberately kept as a fallback only;
 * production callers should prefer an asset-local map or a subject-relative map generated from
 * the active shot focus/bounds.
 */
export const defaultPortraitConstruction: ConstructionRegion[] = [
  {id: 'silhouette', x: 52, y: 42, radius: 20, start: 0.00, end: 0.22},
  {id: 'face', x: 53, y: 31, radius: 13, start: 0.06, end: 0.26},
  {id: 'hair', x: 40, y: 34, radius: 17, start: 0.12, end: 0.34},
  {id: 'crown', x: 50, y: 21, radius: 14, start: 0.16, end: 0.38},
  {id: 'shoulder-left', x: 40, y: 43, radius: 17, start: 0.24, end: 0.44},
  {id: 'shoulder-right', x: 63, y: 45, radius: 17, start: 0.27, end: 0.48},
  {id: 'weapon-hand', x: 30, y: 43, radius: 14, start: 0.34, end: 0.54},
  {id: 'armor', x: 52, y: 48, radius: 18, start: 0.38, end: 0.58},
  {id: 'ornaments', x: 60, y: 48, radius: 13, start: 0.44, end: 0.64},
  {id: 'sash', x: 51, y: 59, radius: 20, start: 0.50, end: 0.70},
  {id: 'drapery-left', x: 40, y: 70, radius: 21, start: 0.58, end: 0.78},
  {id: 'drapery-right', x: 62, y: 72, radius: 22, start: 0.62, end: 0.82},
  {id: 'feet', x: 49, y: 88, radius: 19, start: 0.70, end: 0.92},
];

/**
 * Builds a semantic map around the subject rather than assuming the subject lives at the center
 * of the source image. The order is intentionally an artist-like construction sequence: establish
 * silhouette and head first, then major anatomy, clothing/props, and finally fine detail.
 */
export function subjectRelativeConstruction({focusX, focusY, bounds}: Omit<ConstructionSubject, 'regions'>): ConstructionRegion[] {
  const b = bounds ?? {
    left: clampPct(focusX - 34),
    right: clampPct(focusX + 34),
    top: clampPct(focusY - 24),
    bottom: clampPct(focusY + 48),
  };
  const width = Math.max(12, b.right - b.left);
  const height = Math.max(18, b.bottom - b.top);
  const at = (x: number, y: number, radius: number, start: number, end: number, id: string): ConstructionRegion => ({
    id,
    x: clampPct(b.left + width * x),
    y: clampPct(b.top + height * y),
    radius: Math.max(3, Math.min(width, height) * radius),
    start,
    end,
  });
  return [
    // 1–3: recognizable structural scaffold.
    at(0.50, 0.39, 0.23, 0.00, 0.20, 'structural-silhouette'),
    at(0.51, 0.13, 0.17, 0.04, 0.24, 'head-face'),
    at(0.34, 0.19, 0.21, 0.10, 0.31, 'hair-crown'),
    // 4–6: major anatomy and action-bearing limbs.
    at(0.31, 0.34, 0.22, 0.20, 0.40, 'shoulder-left'),
    at(0.68, 0.34, 0.22, 0.23, 0.43, 'shoulder-right'),
    at(0.70, 0.40, 0.20, 0.30, 0.50, 'arm-hand-weapon'),
    // 7–9: clothing, armor and identity details.
    at(0.51, 0.44, 0.25, 0.35, 0.56, 'torso-armor'),
    at(0.65, 0.48, 0.18, 0.41, 0.62, 'jewelry-ornaments'),
    at(0.50, 0.59, 0.28, 0.48, 0.69, 'sash-costume'),
    // 10–12: lower form and silhouette completion.
    at(0.34, 0.72, 0.29, 0.56, 0.77, 'drapery-left'),
    at(0.66, 0.75, 0.30, 0.61, 0.82, 'drapery-right'),
    at(0.50, 0.92, 0.25, 0.69, 0.90, 'lower-garment-feet'),
    // 13: fine ink arrives after the structure is already readable.
    at(0.51, 0.54, 0.34, 0.76, 0.98, 'fine-ink-detail'),
  ];
}

export function resolveConstructionRegions(subject: ConstructionSubject, allowFallback = false): ConstructionRegion[] | undefined {
  if (subject.regions && subject.regions.length > 0) return subject.regions;
  if (subject.bounds) return subjectRelativeConstruction(subject);
  if (allowFallback) return subjectRelativeConstruction(subject);
  return undefined;
}

function seedNumber(seed: string, index: number) {
  let value = index * 97 + 17;
  for (let i = 0; i < seed.length; i++) value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  return (value % 1000) / 1000;
}

function splatPath(region: ConstructionRegion, progress: number, seed: string, index: number) {
  const amount = smooth(progress);
  if (amount <= 0) return '';
  const points: Array<{x: number; y: number}> = [];
  const count = 15;
  const radius = region.radius * (0.16 + amount * 0.84);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const wobble = 0.68 + seedNumber(seed, index * 29 + i) * 0.58;
    const rx = radius * wobble;
    const ry = radius * (0.74 + seedNumber(seed, index * 41 + i) * 0.35);
    points.push({x: region.x + Math.cos(angle) * rx, y: region.y + Math.sin(angle) * ry});
  }
  return `M${points.map((point, i) => `${i === 0 ? '' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')}Z`;
}

/** Extra small pools complete an image organically, but only after the semantic structure is established. */
function finishingPools(progress: number, seed: string, bounds?: ConstructionRegion): string[] {
  const pools: string[] = [];
  const left = bounds ? bounds.x - bounds.radius * 1.7 : 14;
  const right = bounds ? bounds.x + bounds.radius * 1.7 : 87;
  const top = bounds ? bounds.y - bounds.radius * 1.7 : 12;
  const bottom = bounds ? bounds.y + bounds.radius * 2.4 : 93;
  for (let i = 0; i < 18; i++) {
    const x = left + ((i * 37) % 73) / 73 * (right - left);
    const y = top + ((i * 53) % 81) / 81 * (bottom - top);
    const region: ConstructionRegion = {
      id: `paper-${i}`, x: clampPct(x), y: clampPct(y), radius: 8 + (i % 4) * 1.8,
      start: 0.74 + (i % 5) * 0.035, end: 0.90 + (i % 4) * 0.025,
    };
    const local = smooth((progress - region.start) / Math.max(0.01, region.end - region.start));
    const path = splatPath(region, local, `${seed}-finish`, i + 100);
    if (path) pools.push(path);
  }
  return pools;
}

export function paintedMaskStyle({
  progress,
  seed,
  regions,
}: {
  progress: number;
  seed: string;
  regions: ConstructionRegion[];
}): React.CSSProperties {
  const p = clamp01(progress);
  const paths = regions.map((region, index) => {
    const local = (p - region.start) / Math.max(0.01, region.end - region.start);
    return splatPath(region, local, seed, index);
  }).filter(Boolean);
  const bounds = regions.length > 0 ? regions[regions.length - 1] : undefined;
  paths.push(...finishingPools(p, seed, bounds));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${paths.map((d) => `<path d="${d}" fill="white"/>`).join('')}</svg>`;
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return {
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  };
}

/**
 * AI master remains the source of truth. The construction map controls WHERE and WHEN pieces of
 * that source are established. No source-wide rectangular mask is used.
 *
 * `regions` is optional only for the acceptance fixture. Production callers should pass an
 * asset-local map or a subject-relative map; without one this component intentionally returns the
 * source artwork unchanged rather than risking a blank/incorrect transition.
 */
export function ProgressiveArtwork({
  src,
  inkProgress,
  washProgress,
  seed,
  regions,
  subject,
  style,
}: {
  src: string;
  inkProgress: number;
  washProgress: number;
  seed: string;
  regions?: ConstructionRegion[];
  subject?: ConstructionSubject;
  style?: React.CSSProperties;
}) {
  const resolved = regions ?? (subject ? resolveConstructionRegions(subject) : undefined);
  const common: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%',
    ...style,
  };
  if (!resolved || resolved.length === 0) {
    return <Img src={src} style={common}/>;
  }
  return <>
    <Img src={src} style={{
      ...common,
      ...paintedMaskStyle({progress: inkProgress, seed: `${seed}-ink`, regions: resolved}),
      filter: 'grayscale(1) sepia(.72) contrast(1.16) saturate(.35)',
      mixBlendMode: 'multiply',
    }}/>
    <Img src={src} style={{
      ...common,
      ...paintedMaskStyle({progress: washProgress, seed: `${seed}-wash`, regions: resolved}),
      filter: 'saturate(.9) contrast(1.02)',
    }}/>
  </>;
}
