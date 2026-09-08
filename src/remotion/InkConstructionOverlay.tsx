import React, {useEffect, useRef, useState} from 'react';
import {useDelayRender} from 'remotion';
import {ConstructionRegion} from './artwork-construction';

const INK = '#171510';
const GOLD = '#B8872D';
const RED = '#8E2F24';
const TRACE_WIDTH = 180;
const MAX_SEGMENTS = 1200;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type ContourPath = {
  d: string;
  stage: number;
  color: string;
  width: number;
  opacity: number;
};

/**
 * Production drawing source: the actual master artwork rendered by the sibling <Img>.
 * We trace high-contrast artwork contours into deterministic SVG line segments, so the
 * construction layer and the pigment layer share the same source geometry.
 *
 * This intentionally contains no character-specific fallback geometry. If an artwork cannot
 * be decoded, the render is delayed and fails rather than silently drawing a different subject.
 */
function traceArtwork(image: HTMLImageElement): ContourPath[] {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) throw new Error('Master artwork has no intrinsic dimensions');

  const width = TRACE_WIDTH;
  const height = Math.max(32, Math.min(360, Math.round((naturalHeight / naturalWidth) * width)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) throw new Error('Unable to create contour tracing canvas');
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;

  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return {r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3]};
  };
  const corners = [sample(0, 0), sample(width - 1, 0), sample(0, height - 1), sample(width - 1, height - 1)];
  const bg = corners.reduce((acc, c) => ({r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b}), {r: 0, g: 0, b: 0});
  bg.r /= corners.length;
  bg.g /= corners.length;
  bg.b /= corners.length;
  const bgLum = 0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b;

  const ink = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = sample(x, y);
      if (p.a < 18) continue;
      const lum = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
      const distance = Math.hypot(p.r - bg.r, p.g - bg.g, p.b - bg.b);
      const left = sample(x - 1, y);
      const right = sample(x + 1, y);
      const up = sample(x, y - 1);
      const down = sample(x, y + 1);
      const gradient = Math.max(
        Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b),
        Math.hypot(up.r - down.r, up.g - down.g, up.b - down.b),
      );
      if (lum < bgLum - 28 || distance > 52 || gradient > 46) ink[y * width + x] = 1;
    }
  }

  const raw: Array<{x: number; y: number; dx: number; dy: number}> = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (!ink[y * width + x]) continue;
      if (!ink[y * width + x + 1]) raw.push({x, y, dx: 1, dy: 0});
      if (!ink[(y + 1) * width + x]) raw.push({x, y, dx: 0, dy: 1});
    }
  }

  if (raw.length === 0) throw new Error('Master artwork produced no drawable contours');
  const stride = Math.max(1, Math.ceil(raw.length / MAX_SEGMENTS));
  const selected = raw.filter((_, index) => index % stride === 0).slice(0, MAX_SEGMENTS);

  const subjectRows = selected.map((segment) => segment.y);
  const minY = Math.min(...subjectRows);
  const maxY = Math.max(...subjectRows);
  const spanY = Math.max(1, maxY - minY);

  return selected
    .map((segment) => {
      const yNorm = (segment.y - minY) / spanY;
      const stage = Math.min(4, Math.floor(yNorm * 5));
      const x1 = (segment.x / width) * 100;
      const y1 = (segment.y / height) * 100;
      const x2 = ((segment.x + segment.dx) / width) * 100;
      const y2 = ((segment.y + segment.dy) / height) * 100;
      return {
        d: `M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}`,
        stage,
        color: stage === 0 ? INK : stage === 3 ? RED : stage === 4 ? GOLD : INK,
        width: stage >= 4 ? 0.55 : 0.72,
        opacity: stage >= 4 ? 0.62 : 0.9,
      };
    })
    .sort((a, b) => a.stage - b.stage || a.d.localeCompare(b.d));
}

function stageProgress(progress: number, stage: number) {
  const starts = [0, 0.15, 0.34, 0.55, 0.74];
  const ends = [0.26, 0.47, 0.67, 0.86, 1];
  return clamp01((progress - starts[stage]) / Math.max(0.01, ends[stage] - starts[stage]));
}

function Stroke({path, progress}: {path: ContourPath; progress: number}) {
  const p = clamp01(progress);
  if (p <= 0.001) return null;
  return (
    <path
      d={path.d}
      fill="none"
      stroke={path.color}
      strokeWidth={path.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - p}
      opacity={path.opacity}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function InkConstructionOverlay({
  regions,
  progress,
  opacity = 1,
  showGuide = true,
}: {
  regions: ConstructionRegion[];
  progress: number;
  opacity?: number;
  showGuide?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [paths, setPaths] = useState<ContourPath[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Tracing master artwork contours', {retries: 2}));

  useEffect(() => {
    let cancelled = false;
    const parent = svgRef.current?.parentElement;
    const image = parent?.querySelector('img');
    if (!image) {
      cancelRender(new Error('InkConstructionOverlay requires the master artwork <img> as a sibling'));
      return () => undefined;
    }

    const finish = (next: () => void) => {
      if (cancelled) return;
      try {
        next();
        continueRender(handle);
      } catch (error) {
        cancelRender(error);
      }
    };

    const onReady = () => finish(() => setPaths(traceArtwork(image)));
    if (image.complete && image.naturalWidth > 0) onReady();
    else image.addEventListener('load', onReady, {once: true});

    return () => {
      cancelled = true;
      image.removeEventListener('load', onReady);
      continueRender(handle);
    };
  }, [cancelRender, continueRender, handle]);

  if (regions.length === 0) return null;

  const byStage = [0, 1, 2, 3, 4].map((stage) => paths?.filter((path) => path.stage === stage) ?? []);
  const progressValue = clamp01(progress);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}
      aria-hidden
    >
      {showGuide ? (
        <g opacity={0.12 * (1 - progressValue)}>
          <ellipse cx="50" cy="27" rx="19" ry="14" fill="none" stroke={GOLD} strokeWidth="0.5" strokeDasharray="1.5 2.5" />
          <path d="M50 8 L50 94" fill="none" stroke={GOLD} strokeWidth="0.42" strokeDasharray="1.5 3" />
          <path d="M22 40 Q50 34 78 40" fill="none" stroke={GOLD} strokeWidth="0.38" strokeDasharray="1 2.4" />
        </g>
      ) : null}
      {byStage.map((stagePaths, stage) => {
        const local = stageProgress(progressValue, stage);
        return <g key={stage}>{stagePaths.map((path, index) => <Stroke key={`${stage}-${index}`} path={path} progress={local} />)}</g>;
      })}
    </svg>
  );
}
