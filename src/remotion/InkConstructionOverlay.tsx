import React, {useEffect, useRef, useState} from 'react';
import {useDelayRender} from 'remotion';
import {ConstructionRegion} from './artwork-construction';

const INK = '#171510';
const GOLD = '#B8872D';
const TRACE_WIDTH = 420;
const MAX_TRACE_HEIGHT = 760;
const MAX_STROKES = 420;
const MAX_WAIT_MS = 5000;
const MIN_STROKE_LENGTH = 4;
const SUBJECT_REVEAL_END = 0.66;
const FULL_REVEAL_END = 0.94;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
type Point = {x: number; y: number};
type Stroke = {points: Point[]; length: number; centerX: number; centerY: number; width: number; height: number};
type ContourPath = {d: string; start: number; end: number; width: number; opacity: number};
type Geometry = {transform: string; transformOrigin: string};

function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function pointKey(p: Point) { return `${p.x},${p.y}`; }
function normalize(x: number, y: number) { const n = Math.hypot(x, y) || 1; return {x: x / n, y: y / n}; }
function dot(a: Point, b: Point) { return a.x * b.x + a.y * b.y; }
function parseObjectPosition(value: string) { const m = value.match(/-?\d+(?:\.\d+)?%/g) ?? []; return {x: m[0] ? Number.parseFloat(m[0]) / 100 : 0.5, y: m[1] ? Number.parseFloat(m[1]) / 100 : 0.5}; }
function pathFromPoints(points: Point[]) {
  if (points.length < 2) return '';
  let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) d += ` L${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  return d;
}
function simplify(points: Point[], tolerance = 0.7) {
  if (points.length < 3) return points;
  const out = [points[0]]; const t2 = tolerance * tolerance; let last = points[0];
  for (let i = 1; i < points.length - 1; i += 1) { const p = points[i]; if ((p.x - last.x) ** 2 + (p.y - last.y) ** 2 > t2) { out.push(p); last = p; } }
  out.push(points[points.length - 1]); return out;
}

/** Zhang-Suen centerline extraction used only for raster masters. */
function skeletonize(input: Uint8Array, width: number, height: number) {
  const image = new Uint8Array(input);
  const n = (x: number, y: number) => [image[(y - 1) * width + x], image[(y - 1) * width + x + 1], image[y * width + x + 1], image[(y + 1) * width + x + 1], image[(y + 1) * width + x], image[(y + 1) * width + x - 1], image[y * width + x - 1], image[(y - 1) * width + x - 1]];
  const transitions = (a: number[]) => a.reduce((s, v, i) => s + (v === 0 && a[(i + 1) % 8] === 1 ? 1 : 0), 0);
  for (let pass = 0; pass < 40; pass += 1) {
    const remove: number[] = [];
    for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x; if (!image[i]) continue; const a = n(x, y); const count = a.reduce((s, v) => s + v, 0);
      if (count >= 2 && count <= 6 && transitions(a) === 1 && a[0] * a[2] * a[4] === 0 && a[2] * a[4] * a[6] === 0) remove.push(i);
    }
    remove.forEach((i) => { image[i] = 0; });
    if (!remove.length) break;
  }
  return image;
}
function traceSkeletonStrokes(skeleton: Uint8Array, width: number, height: number): Stroke[] {
  const pixels = new Set<string>();
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) if (skeleton[y * width + x]) pixels.add(`${x},${y}`);
  const near = (p: Point) => { const a: Point[] = []; for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (dx || dy) { const q = {x: p.x + dx, y: p.y + dy}; if (pixels.has(pointKey(q))) a.push(q); } return a; };
  const visited = new Set<string>(); const strokes: Stroke[] = [];
  const seeds = [...pixels].map((s) => { const [x, y] = s.split(',').map(Number); return {x, y}; }).sort((a, b) => near(a).length - near(b).length);
  for (const seed of seeds) {
    if (visited.has(pointKey(seed))) continue; visited.add(pointKey(seed)); const chain = [seed]; let prev: Point | null = null; let cur = seed;
    for (let guard = 0; guard < width * height; guard += 1) {
      const options = near(cur).filter((p) => !visited.has(pointKey(p))); if (!options.length) break; let best = options[0];
      if (prev) { const incoming = normalize(cur.x - prev.x, cur.y - prev.y); let score = -Infinity; for (const p of options) { const outgoing = normalize(p.x - cur.x, p.y - cur.y); const s = dot(incoming, outgoing) * 100 - distance(cur, p); if (s > score) { score = s; best = p; } } }
      visited.add(pointKey(best)); chain.push(best); prev = cur; cur = best; if (near(cur).length > 2 && chain.length > 8) break;
    }
    const points = simplify(chain); const length = points.reduce((s, p, i) => i ? s + distance(points[i - 1], p) : 0, 0); if (length < MIN_STROKE_LENGTH) continue;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y); strokes.push({points, length, centerX: (Math.min(...xs) + Math.max(...xs)) / 2, centerY: (Math.min(...ys) + Math.max(...ys)) / 2, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)});
  }
  return strokes;
}
function regionAffinity(stroke: Stroke, regions: ConstructionRegion[], width: number, height: number) {
  const x = stroke.centerX / width * 100, y = stroke.centerY / height * 100; let best = 0;
  for (const r of regions) { const radius = Math.max(5, r.radius * 2.2); best = Math.max(best, clamp01(1 - Math.hypot(x - r.x, y - r.y) / radius)); }
  return best;
}
function environmentStroke(stroke: Stroke, width: number, height: number) {
  const horizontal = stroke.width > Math.max(28, stroke.height * 5); const x = stroke.centerX / width; const y = stroke.centerY / height;
  return horizontal && y > 0.67 && x > 0.01 && x < 0.99 && stroke.length > 55;
}
function mapPoint(p: Point, naturalWidth: number, naturalHeight: number, boxWidth: number, boxHeight: number, fit: string, pos: {x: number; y: number}) {
  const scale = fit === 'cover' ? Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight) : fit === 'contain' ? Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight) : 1;
  return {x: ((p.x * scale + (boxWidth - naturalWidth * scale) * pos.x) / boxWidth) * 100, y: ((p.y * scale + (boxHeight - naturalHeight * scale) * pos.y) / boxHeight) * 100};
}
function schedule(points: Array<{points: Point[]; affinity: number; environment: boolean; strokeWidth: number}>, image: HTMLImageElement, startAt: number, endAt: number): ContourPath[] {
  const style = getComputedStyle(image); const fit = style.objectFit || 'fill'; const pos = parseObjectPosition(style.objectPosition || '50% 50%'); const w = Math.max(1, image.clientWidth), h = Math.max(1, image.clientHeight); const nw = image.naturalWidth, nh = image.naturalHeight;
  return points.map((item, i) => {
    const t = points.length <= 1 ? 0 : i / (points.length - 1);
    // Front-load authored contours. The earliest meaningful lines need to become legible well
    // before pigment wash; later lines can overlap the reveal to preserve a continuous hand-drawn feel.
    const ordered = Math.pow(t, 1.65);
    const start = startAt + ordered * Math.max(0, endAt - startAt - 0.12);
    const end = Math.min(endAt, start + Math.max(0.13, 0.18 - t * 0.045));
    return {d: pathFromPoints(item.points.map((p) => mapPoint(p, nw, nh, w, h, fit, pos))), start, end, width: Math.max(1.45, Math.min(2.65, item.strokeWidth * 0.24)), opacity: 0.98};
  });
}

/** Uses the browser's SVGGeometryElement APIs, so nested transforms and CSS-authored vector paths remain source-of-truth geometry. */
async function traceSvgArtwork(image: HTMLImageElement, regions: ConstructionRegion[]): Promise<ContourPath[] | null> {
  const src = image.currentSrc || image.src; if (!src || !/\.svg(?:$|[?#])/i.test(src)) return null;
  const response = await fetch(src); if (!response.ok) return null; const text = await response.text();
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml'); const root = parsed.documentElement; if (!root || root.querySelector('parsererror')) return null;
  const vb = (root.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number); const nw = vb.length >= 4 ? vb[2] : Number.parseFloat(root.getAttribute('width') || '') || image.naturalWidth; const nh = vb.length >= 4 ? vb[3] : Number.parseFloat(root.getAttribute('height') || '') || image.naturalHeight; const minX = vb.length >= 4 ? vb[0] : 0, minY = vb.length >= 4 ? vb[1] : 0;
  if (!nw || !nh) return null;
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); host.setAttribute('viewBox', `${minX} ${minY} ${nw} ${nh}`); host.setAttribute('width', String(nw)); host.setAttribute('height', String(nh)); host.style.cssText = `position:absolute;left:-100000px;top:-100000px;width:${nw}px;height:${nh}px;opacity:0;pointer-events:none;`;
  host.innerHTML = root.innerHTML; document.body.appendChild(host);
  try {
    const rootMatrix = host.getScreenCTM(); if (!rootMatrix) return null; const elements = Array.from(host.querySelectorAll('path,line,polyline,polygon,circle,ellipse')) as SVGGeometryElement[];
    const items: Array<{points: Point[]; affinity: number; environment: boolean; strokeWidth: number; sourceIndex: number}> = [];
    for (let index = 0; index < elements.length; index += 1) {
      const el = elements[index]; const cs = getComputedStyle(el); const opacity = Number.parseFloat(cs.opacity || '1'); const drawable = opacity > 0.05 && ((cs.stroke && cs.stroke !== 'none') || (cs.fill && cs.fill !== 'none')); if (!drawable) continue;
      const length = el.getTotalLength(); if (!Number.isFinite(length) || length < MIN_STROKE_LENGTH) continue; const matrix = el.getScreenCTM(); if (!matrix) continue; const relative = rootMatrix.inverse().multiply(matrix); const count = Math.max(10, Math.min(360, Math.ceil(length / 5))); const points: Point[] = [];
      for (let i = 0; i <= count; i += 1) { const p = el.getPointAtLength(length * i / count); const q = new DOMPoint(p.x, p.y).matrixTransform(relative); points.push({x: q.x, y: q.y}); }
      const xs = points.map((p) => p.x), ys = points.map((p) => p.y); const min = {x: Math.min(...xs), y: Math.min(...ys)}, max = {x: Math.max(...xs), y: Math.max(...ys)}; const area = (max.x - min.x) * (max.y - min.y);
      if (area > nw * nh * 0.82 && min.x <= minX + nw * 0.05 && min.y <= minY + nh * 0.05 && max.x >= minX + nw * 0.95 && max.y >= minY + nh * 0.95) continue;
      const bounds: Stroke = {points: [{x: (min.x + max.x) / 2, y: (min.y + max.y) / 2}], length, centerX: (min.x + max.x) / 2, centerY: (min.y + max.y) / 2, width: max.x - min.x, height: max.y - min.y};
      items.push({points, affinity: regionAffinity(bounds, regions, nw, nh), environment: environmentStroke(bounds, nw, nh), strokeWidth: Number.parseFloat(cs.strokeWidth || '8') || 8, sourceIndex: index});
    }
    if (!items.length) return null;
    items.sort((a, b) => { const as = a.affinity > 0.08 && !a.environment, bs = b.affinity > 0.08 && !b.environment; if (as !== bs) return as ? -1 : 1; return (b.affinity * 100 + Math.sqrt(b.points.length)) - (a.affinity * 100 + Math.sqrt(a.points.length)) || a.sourceIndex - b.sourceIndex; });
    const subject = items.filter((i) => i.affinity > 0.08 && !i.environment).slice(0, MAX_STROKES); const support = items.filter((i) => !subject.includes(i)).slice(0, Math.max(0, MAX_STROKES - subject.length));
    const convert = (i: typeof items[number]) => ({points: i.points, affinity: i.affinity, environment: i.environment, strokeWidth: i.strokeWidth});
    return [...schedule(subject.map(convert), image, 0.01, SUBJECT_REVEAL_END), ...schedule(support.map(convert), image, SUBJECT_REVEAL_END + 0.015, FULL_REVEAL_END)];
  } finally { host.remove(); }
}

function traceArtwork(image: HTMLImageElement, regions: ConstructionRegion[]): ContourPath[] {
  const naturalWidth = image.naturalWidth, naturalHeight = image.naturalHeight; if (!naturalWidth || !naturalHeight) throw new Error('Master artwork has no intrinsic dimensions');
  const width = TRACE_WIDTH, height = Math.max(64, Math.min(MAX_TRACE_HEIGHT, Math.round(naturalHeight / naturalWidth * width))); const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d', {willReadFrequently: true}); if (!ctx) throw new Error('Unable to create centerline tracing canvas');
  ctx.drawImage(image, 0, 0, width, height); const pixels = ctx.getImageData(0, 0, width, height).data; const inkMask = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) { const i = (y * width + x) * 4; const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3]; const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b; const chroma = Math.max(r, g, b) - Math.min(r, g, b); if (a > 32 && ((lum < 185 && chroma < 115) || lum < 118)) inkMask[y * width + x] = 1; }
  const skeleton = skeletonize(inkMask, width, height); const strokes = traceSkeletonStrokes(skeleton, width, height).slice(0, MAX_STROKES); if (!strokes.length) throw new Error('Master artwork produced no centerline strokes');
  const enriched = strokes.map((stroke) => ({stroke, affinity: regionAffinity(stroke, regions, width, height), environment: environmentStroke(stroke, width, height)})); const subject = enriched.filter((e) => e.affinity > 0.08 && !e.environment).sort((a, b) => b.affinity - a.affinity || b.stroke.length - a.stroke.length); const support = enriched.filter((e) => !subject.includes(e)).sort((a, b) => b.stroke.length - a.stroke.length);
  const style = getComputedStyle(image); const fit = style.objectFit || 'fill'; const pos = parseObjectPosition(style.objectPosition || '50% 50%'); const bw = Math.max(1, image.clientWidth), bh = Math.max(1, image.clientHeight);
  const convert = (e: typeof enriched[number]) => ({points: e.stroke.points.map((p) => mapPoint({x: p.x / width * naturalWidth, y: p.y / height * naturalHeight}, naturalWidth, naturalHeight, bw, bh, fit, pos)), affinity: e.affinity, environment: e.environment, strokeWidth: 8});
  return [...schedule(subject.map(convert), image, 0.01, SUBJECT_REVEAL_END), ...schedule(support.map(convert), image, SUBJECT_REVEAL_END + 0.015, FULL_REVEAL_END)];
}

function StrokeView({path, progress}: {path: ContourPath; progress: number}) { const local = clamp01((progress - path.start) / Math.max(0.01, path.end - path.start)); if (local <= 0.001) return null; return <><path d={path.d} fill="none" stroke={INK} strokeWidth={path.width + 0.7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - local} opacity={path.opacity * 0.2} filter="blur(0.35px)" vectorEffect="non-scaling-stroke"/><path d={path.d} fill="none" stroke={INK} strokeWidth={path.width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - local} opacity={path.opacity} vectorEffect="non-scaling-stroke"/></>; }

export function InkConstructionOverlay({regions, progress, opacity = 1, showGuide = true}: {regions: ConstructionRegion[]; progress: number; opacity?: number; showGuide?: boolean}) {
  const svgRef = useRef<SVGSVGElement | null>(null); const [paths, setPaths] = useState<ContourPath[] | null>(null); const [geometry, setGeometry] = useState<Geometry>({transform: 'none', transformOrigin: '50% 50%'}); const {delayRender, continueRender, cancelRender} = useDelayRender(); const [handle] = useState(() => delayRender('Tracing master artwork centerline strokes', {retries: 2}));
  useEffect(() => { let cancelled = false; let raf: number | null = null; let timeout: ReturnType<typeof setTimeout> | null = null; const started = Date.now(); const parent = svgRef.current?.parentElement; const fail = (e: Error) => { if (!cancelled) cancelRender(e); }; const ready = () => { if (cancelled) return; const image = parent?.querySelector('img'); if (!image) { if (Date.now() - started > MAX_WAIT_MS) fail(new Error('InkConstructionOverlay could not find the master artwork <img>')); else raf = requestAnimationFrame(ready); return; } const finish = async () => { if (cancelled) return; try { const traced = await traceSvgArtwork(image, regions); setPaths(traced ?? traceArtwork(image, regions)); const style = getComputedStyle(image); setGeometry({transform: style.transform === 'none' ? 'none' : style.transform, transformOrigin: style.transformOrigin || '50% 50%'}); continueRender(handle); } catch (e) { cancelRender(e); } }; if (image.complete && image.naturalWidth > 0) void finish(); else image.addEventListener('load', () => void finish(), {once: true}); timeout = setTimeout(() => { if (!image.complete || image.naturalWidth === 0) fail(new Error('Master artwork did not finish loading for centerline tracing')); }, MAX_WAIT_MS); }; ready(); return () => { cancelled = true; if (raf !== null) cancelAnimationFrame(raf); if (timeout !== null) clearTimeout(timeout); continueRender(handle); }; }, [cancelRender, continueRender, handle, regions]);
  if (!regions.length) return null; const p = clamp01(progress); return <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity, transform: geometry.transform, transformOrigin: geometry.transformOrigin}} aria-hidden>{showGuide && <g opacity={0.11 * (1 - p)}><ellipse cx="50" cy="27" rx="18" ry="13.5" fill="none" stroke={GOLD} strokeWidth="0.48" strokeDasharray="1.2 2.8"/><path d="M50 8 C48 28 52 52 50 94" fill="none" stroke={GOLD} strokeWidth="0.36" strokeDasharray="1.2 3"/><path d="M25 41 Q50 35 75 41" fill="none" stroke={GOLD} strokeWidth="0.34" strokeDasharray="1 2.5"/></g>}{paths?.map((path, i) => <StrokeView key={i} path={path} progress={p}/>)}</svg>;
}
