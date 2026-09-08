import React from 'react';
import {Img} from 'remotion';

export type ConstructionRegion = {
  /** A narrative/illustration role, useful when a future asset supplies its own map. */
  id: string;
  x: number;
  y: number;
  radius: number;
  start: number;
  end: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/**
 * A portrait-friendly semantic map used when a story package has not supplied a custom one yet.
 * It intentionally follows the way an illustrator reads a figure (face/crown -> shoulder/weapon
 * -> chest/ornament -> drapery), rather than scanning the source image in a screen direction.
 */
export const defaultPortraitConstruction: ConstructionRegion[] = [
  {id: 'face', x: 53, y: 31, radius: 15, start: 0.00, end: 0.24},
  {id: 'crown', x: 50, y: 21, radius: 16, start: 0.04, end: 0.30},
  {id: 'hair', x: 37, y: 37, radius: 20, start: 0.10, end: 0.44},
  {id: 'shoulder', x: 41, y: 43, radius: 19, start: 0.16, end: 0.48},
  {id: 'weapon-hand', x: 29, y: 42, radius: 17, start: 0.22, end: 0.52},
  {id: 'armor', x: 52, y: 48, radius: 20, start: 0.28, end: 0.58},
  {id: 'ornaments', x: 58, y: 48, radius: 15, start: 0.34, end: 0.64},
  {id: 'sash', x: 51, y: 59, radius: 23, start: 0.38, end: 0.70},
  {id: 'drapery-left', x: 39, y: 70, radius: 25, start: 0.46, end: 0.78},
  {id: 'drapery-right', x: 60, y: 73, radius: 26, start: 0.52, end: 0.84},
  {id: 'feet', x: 48, y: 88, radius: 23, start: 0.64, end: 0.94},
];

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
  const radius = region.radius * (0.18 + amount * 0.94);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const wobble = 0.68 + seedNumber(seed, index * 29 + i) * 0.58;
    const rx = radius * wobble;
    const ry = radius * (0.74 + seedNumber(seed, index * 41 + i) * 0.35);
    points.push({x: region.x + Math.cos(angle) * rx, y: region.y + Math.sin(angle) * ry});
  }
  return `M${points.map((point, i) => `${i === 0 ? '' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')}Z`;
}

/** Extra small pools complete an image organically without a last rectangular "finish" mask. */
function finishingPools(progress: number, seed: string): string[] {
  const pools: string[] = [];
  for (let i = 0; i < 24; i++) {
    const x = 14 + ((i * 37) % 73);
    const y = 12 + ((i * 53) % 81);
    const region: ConstructionRegion = {
      id: `paper-${i}`, x, y, radius: 12 + (i % 4) * 2,
      start: 0.56 + (i % 6) * 0.045, end: 0.82 + (i % 5) * 0.035,
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
  regions = defaultPortraitConstruction,
}: {
  progress: number;
  seed: string;
  regions?: ConstructionRegion[];
}): React.CSSProperties {
  const p = clamp01(progress);
  const paths = regions.map((region, index) => {
    const local = (p - region.start) / Math.max(0.01, region.end - region.start);
    return splatPath(region, local, seed, index);
  }).filter(Boolean);
  paths.push(...finishingPools(p, seed));
  // CSS masks use alpha by default: leave the canvas transparent and paint only the pools.
  // An opaque black base would still be opaque and accidentally expose the whole source image.
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
 * Keeps an AI master as the source of truth while establishing it only through successive pools
 * of ink, then pools of colour. This is deliberately a component, rather than a transition, so
 * future manifest asset maps can pass subject-specific regions without adding another renderer.
 */
export function ProgressiveArtwork({
  src,
  inkProgress,
  washProgress,
  seed,
  regions,
  style,
}: {
  src: string;
  inkProgress: number;
  washProgress: number;
  seed: string;
  regions?: ConstructionRegion[];
  style?: React.CSSProperties;
}) {
  const common: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%',
    ...style,
  };
  return <>
    <Img src={src} style={{
      ...common,
      ...paintedMaskStyle({progress: inkProgress, seed: `${seed}-ink`, regions}),
      filter: 'grayscale(1) sepia(.72) contrast(1.16) saturate(.35)',
      mixBlendMode: 'multiply',
    }}/>
    <Img src={src} style={{
      ...common,
      ...paintedMaskStyle({progress: washProgress, seed: `${seed}-wash`, regions}),
      filter: 'saturate(.9) contrast(1.02)',
    }}/>
  </>;
}
