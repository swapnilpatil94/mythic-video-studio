import React, {useEffect, useRef, useState} from 'react';
import {useDelayRender} from 'remotion';
import {ConstructionRegion} from './artwork-construction';

const INK = '#171510';
const GOLD = '#B8872D';
const RED = '#8E2F24';
const TRACE_WIDTH = 220;
const MAX_CONTOURS = 320;
const MAX_WAIT_MS = 5000;
const MIN_CONTOUR_LENGTH = 5;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type Point = {x: number; y: number};
type Segment = {a: Point; b: Point};

type ContourPath = {
  d: string;
  stage: number;
  color: string;
  width: number;
  opacity: number;
};

type Geometry = {
  transform: string;
  transformOrigin: string;
};

function parseObjectPosition(value: string) {
  const matches = value.match(/-?\d+(?:\.\d+)?%/g) ?? [];
  return {
    x: matches[0] ? Number.parseFloat(matches[0]) / 100 : 0.5,
    y: matches[1] ? Number.parseFloat(matches[1]) / 100 : 0.5,
  };
}

function pointKey(point: Point) {
  return `${point.x},${point.y}`;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dot(ax: number, ay: number, bx: number, by: number) {
  return ax * bx + ay * by;
}

function normalize(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return {x: x / length, y: y / length};
}

function chooseContinuation(
  endpoint: Point,
  previous: Point | null,
  candidates: number[],
  segments: Segment[],
  unused: Set<number>,
) {
  let best: number | null = null;
  let bestScore = -Infinity;

  for (const index of candidates) {
    if (!unused.has(index)) continue;
    const segment = segments[index];
    const next = pointKey(segment.a) === pointKey(endpoint) ? segment.b : segment.a;

    if (previous === null) {
      const score = -distance(endpoint, next);
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
      continue;
    }

    const incoming = normalize(endpoint.x - previous.x, endpoint.y - previous.y);
    const outgoing = normalize(next.x - endpoint.x, next.y - endpoint.y);
    const score = dot(incoming.x, incoming.y, outgoing.x, outgoing.y) * 100 - distance(endpoint, next);
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }

  return best;
}

function chainBoundarySegments(segments: Segment[]) {
  const adjacency = new Map<string, number[]>();

  segments.forEach((segment, index) => {
    for (const point of [segment.a, segment.b]) {
      const key = pointKey(point);
      const list = adjacency.get(key) ?? [];
      list.push(index);
      adjacency.set(key, list);
    }
  });

  const unused = new Set(segments.map((_, index) => index));
  const contours: Point[][] = [];

  while (unused.size > 0) {
    const seed = unused.values().next().value as number;
    unused.delete(seed);
    const seedSegment = segments[seed];
    const chain: Point[] = [seedSegment.a, seedSegment.b];

    const extend = (points: Point[], fromStart: boolean) => {
      let guard = 0;
      while (guard++ < 400) {
        const endpoint = fromStart ? points[0] : points[points.length - 1];
        const previous = fromStart ? points[1] ?? null : points[points.length - 2] ?? null;
        const nextIndex = chooseContinuation(
          endpoint,
          previous,
          adjacency.get(pointKey(endpoint)) ?? [],
          segments,
          unused,
        );
        if (nextIndex === null) break;

        unused.delete(nextIndex);
        const nextSegment = segments[nextIndex];
        const nextPoint = pointKey(nextSegment.a) === pointKey(endpoint) ? nextSegment.b : nextSegment.a;
        if (fromStart) points.unshift(nextPoint);
        else points.push(nextPoint);

        if (pointKey(nextPoint) === pointKey(fromStart ? points[points.length - 1] : points[0])) break;
      }
    };

    extend(chain, false);
    extend(chain, true);

    if (chain.length >= 3) contours.push(chain);
  }

  return contours;
}

function simplify(points: Point[], tolerance: number) {
  if (points.length <= 2) return points;

  const squaredTolerance = tolerance * tolerance;
  const radial: Point[] = [points[0]];
  let previous = points[0];

  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if ((point.x - previous.x) ** 2 + (point.y - previous.y) ** 2 > squaredTolerance) {
      radial.push(point);
      previous = point;
    }
  }

  if (radial[radial.length - 1] !== points[points.length - 1]) radial.push(points[points.length - 1]);
  if (radial.length <= 2) return radial;

  const keep = new Uint8Array(radial.length);
  keep[0] = 1;
  keep[radial.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, radial.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop() as [number, number];
    const a = radial[start];
    const b = radial[end];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const denominator = dx * dx + dy * dy;

    let maxDistance = squaredTolerance;
    let index = -1;

    for (let i = start + 1; i < end; i += 1) {
      const p = radial[i];
      const t = denominator === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / denominator;
      const clamped = Math.max(0, Math.min(1, t));
      const px = a.x + clamped * dx;
      const py = a.y + clamped * dy;
      const distanceSquared = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (distanceSquared > maxDistance) {
        maxDistance = distanceSquared;
        index = i;
      }
    }

    if (index !== -1) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }

  return radial.filter((_, index) => keep[index] === 1);
}

function pathFromPoints(points: Point[]) {
  if (points.length < 2) return '';

  const closed = distance(points[0], points[points.length - 1]) <= 1.5;
  const usable = closed ? points.slice(0, -1) : points;
  if (usable.length < 2) return '';

  let d = `M${usable[0].x.toFixed(2)} ${usable[0].y.toFixed(2)}`;

  for (let i = 1; i < usable.length - 1; i += 1) {
    const current = usable[i];
    const next = usable[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  const last = usable[usable.length - 1];
  d += ` L${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  if (closed) d += ' Z';
  return d;
}

/**
 * Convert the actual master artwork into smooth, continuous SVG contour paths.
 *
 * The master is only the source of geometry; it is never revealed as a mask. The renderer draws
 * the extracted paths first, then the master pigment resolves separately. This preserves the
 * blank parchment -> construction -> recognizable subject -> wash -> finished artwork sequence
 * while avoiding generic character geometry.
 */
function traceArtwork(image: HTMLImageElement): ContourPath[] {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) throw new Error('Master artwork has no intrinsic dimensions');

  const width = TRACE_WIDTH;
  const height = Math.max(48, Math.min(440, Math.round((naturalHeight / naturalWidth) * width)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) throw new Error('Unable to create contour tracing canvas');

  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const sample = (x: number, y: number) => {
    const safeX = Math.max(0, Math.min(width - 1, x));
    const safeY = Math.max(0, Math.min(height - 1, y));
    const i = (safeY * width + safeX) * 4;
    return {r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3]};
  };

  const corners = [sample(0, 0), sample(width - 1, 0), sample(0, height - 1), sample(width - 1, height - 1)];
  const bg = corners.reduce(
    (acc, color) => ({r: acc.r + color.r, g: acc.g + color.g, b: acc.b + color.b}),
    {r: 0, g: 0, b: 0},
  );
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
      const distanceFromBackground = Math.hypot(p.r - bg.r, p.g - bg.g, p.b - bg.b);
      const left = sample(x - 1, y);
      const right = sample(x + 1, y);
      const up = sample(x, y - 1);
      const down = sample(x, y + 1);
      const gradient = Math.max(
        Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b),
        Math.hypot(up.r - down.r, up.g - down.g, up.b - down.b),
      );

      if (lum < bgLum - 24 || distanceFromBackground > 42 || gradient > 34) {
        ink[y * width + x] = 1;
      }
    }
  }

  const raw: Segment[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (!ink[y * width + x]) continue;
      if (!ink[y * width + x + 1]) raw.push({a: {x, y}, b: {x: x + 1, y}});
      if (!ink[(y + 1) * width + x]) raw.push({a: {x, y}, b: {x, y: y + 1}});
    }
  }

  if (raw.length === 0) throw new Error('Master artwork produced no drawable contours');

  const contours = chainBoundarySegments(raw)
    .map((points) => {
      const simplified = simplify(points, 0.7);
      const length = simplified.reduce((total, point, index) => (
        index === 0 ? 0 : total + distance(simplified[index - 1], point)
      ), 0);
      const minY = Math.min(...simplified.map((point) => point.y));
      const maxY = Math.max(...simplified.map((point) => point.y));
      return {points: simplified, length, centerY: (minY + maxY) / 2};
    })
    .filter((contour) => contour.length >= MIN_CONTOUR_LENGTH)
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_CONTOURS);

  if (contours.length === 0) throw new Error('Master artwork produced no usable contour paths');

  const minY = Math.min(...contours.map((contour) => contour.centerY));
  const maxY = Math.max(...contours.map((contour) => contour.centerY));
  const spanY = Math.max(1, maxY - minY);
  const style = getComputedStyle(image);
  const fit = style.objectFit || 'fill';
  const position = parseObjectPosition(style.objectPosition || '50% 50%');
  const boxWidth = Math.max(1, image.clientWidth);
  const boxHeight = Math.max(1, image.clientHeight);

  const scale = fit === 'cover'
    ? Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight)
    : fit === 'contain'
      ? Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight)
      : 1;
  const contentWidth = naturalWidth * scale;
  const contentHeight = naturalHeight * scale;
  const offsetX = (boxWidth - contentWidth) * position.x;
  const offsetY = (boxHeight - contentHeight) * position.y;

  return contours.map((contour) => {
    const centerNorm = clamp01((contour.centerY - minY) / spanY);
    const stage = centerNorm < 0.2 ? 0 : centerNorm < 0.42 ? 1 : centerNorm < 0.64 ? 2 : centerNorm < 0.84 ? 3 : 4;
    const mapped = contour.points.map((point) => ({
      x: (((point.x / width) * naturalWidth * scale + offsetX) / boxWidth) * 100,
      y: (((point.y / height) * naturalHeight * scale + offsetY) / boxHeight) * 100,
    }));
    const path = pathFromPoints(mapped);

    return {
      d: path,
      stage,
      color: stage >= 4 ? GOLD : stage === 3 ? RED : INK,
      width: stage >= 4 ? 0.6 : stage === 3 ? 0.72 : 0.86,
      opacity: stage >= 4 ? 0.62 : stage === 3 ? 0.78 : 0.92,
    };
  }).filter((path) => Boolean(path.d));
}

function stageProgress(progress: number, stage: number) {
  const starts = [0, 0.14, 0.32, 0.52, 0.72];
  const ends = [0.28, 0.48, 0.68, 0.88, 1];
  return clamp01((progress - starts[stage]) / Math.max(0.01, ends[stage] - starts[stage]));
}

function Stroke({path, progress}: {path: ContourPath; progress: number}) {
  const p = clamp01(progress);
  if (p <= 0.001) return null;

  return (
    <>
      <path d={path.d} fill="none" stroke={path.color} strokeWidth={path.width + 0.35} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} opacity={path.opacity * 0.12} filter="blur(0.35px)" vectorEffect="non-scaling-stroke" />
      <path d={path.d} fill="none" stroke={path.color} strokeWidth={path.width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} opacity={path.opacity} vectorEffect="non-scaling-stroke" />
    </>
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
  const [geometry, setGeometry] = useState<Geometry>({transform: 'none', transformOrigin: '50% 50%'});
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Tracing master artwork contours', {retries: 2}));

  useEffect(() => {
    let cancelled = false;
    let frameHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const parent = svgRef.current?.parentElement;

    const fail = (error: Error) => {
      if (cancelled) return;
      cancelRender(error);
    };

    const traceWhenReady = () => {
      if (cancelled) return;
      const image = parent?.querySelector('img');
      if (!image) {
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          fail(new Error('InkConstructionOverlay could not find the master artwork <img>'));
          return;
        }
        frameHandle = requestAnimationFrame(traceWhenReady);
        return;
      }

      const finish = () => {
        if (cancelled) return;
        try {
          setPaths(traceArtwork(image));
          const style = getComputedStyle(image);
          setGeometry({
            transform: style.transform === 'none' ? 'none' : style.transform,
            transformOrigin: style.transformOrigin || '50% 50%',
          });
          continueRender(handle);
        } catch (error) {
          cancelRender(error);
        }
      };

      if (image.complete && image.naturalWidth > 0) finish();
      else image.addEventListener('load', finish, {once: true});

      timeoutHandle = setTimeout(() => {
        if (!image.complete || image.naturalWidth === 0) {
          fail(new Error('Master artwork did not finish loading for contour tracing'));
        }
      }, MAX_WAIT_MS);
    };

    traceWhenReady();

    return () => {
      cancelled = true;
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
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
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity, transform: geometry.transform, transformOrigin: geometry.transformOrigin}}
      aria-hidden
    >
      {showGuide ? (
        <g opacity={0.11 * (1 - progressValue)}>
          <ellipse cx="50" cy="27" rx="18" ry="13.5" fill="none" stroke={GOLD} strokeWidth="0.48" strokeDasharray="1.2 2.8" />
          <path d="M50 8 C48 28 52 52 50 94" fill="none" stroke={GOLD} strokeWidth="0.36" strokeDasharray="1.2 3" />
          <path d="M25 41 Q50 35 75 41" fill="none" stroke={GOLD} strokeWidth="0.34" strokeDasharray="1 2.5" />
        </g>
      ) : null}
      {byStage.map((stagePaths, stage) => {
        const local = stageProgress(progressValue, stage);
        return <g key={stage}>{stagePaths.map((path, index) => <Stroke key={`${stage}-${index}`} path={path} progress={local} />)}</g>;
      })}
    </svg>
  );
}
