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
const SUBJECT_REVEAL_END = 0.54;
const FULL_REVEAL_END = 0.94;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
type Point = {x: number; y: number};
type SkeletonStroke = {points: Point[]; length: number; centerX: number; centerY: number; width: number; height: number};
type ContourPath = {d: string; start: number; end: number; color: string; width: number; opacity: number};
type Geometry = {transform: string; transformOrigin: string};

function parseObjectPosition(value: string) {
  const matches = value.match(/-?\d+(?:\.\d+)?%/g) ?? [];
  return {x: matches[0] ? Number.parseFloat(matches[0]) / 100 : 0.5, y: matches[1] ? Number.parseFloat(matches[1]) / 100 : 0.5};
}
function pointKey(point: Point) { return `${point.x},${point.y}`; }
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function dot(ax: number, ay: number, bx: number, by: number) { return ax * bx + ay * by; }
function normalize(x: number, y: number) { const length = Math.hypot(x, y) || 1; return {x: x / length, y: y / length}; }

function simplify(points: Point[], tolerance = 0.65) {
  if (points.length <= 2) return points;
  const squaredTolerance = tolerance * tolerance;
  const radial: Point[] = [points[0]];
  let previous = points[0];
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if ((point.x - previous.x) ** 2 + (point.y - previous.y) ** 2 > squaredTolerance) { radial.push(point); previous = point; }
  }
  if (radial[radial.length - 1] !== points[points.length - 1]) radial.push(points[points.length - 1]);
  if (radial.length <= 2) return radial;
  const keep = new Uint8Array(radial.length); keep[0] = 1; keep[radial.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, radial.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop() as [number, number];
    const a = radial[start]; const b = radial[end]; const dx = b.x - a.x; const dy = b.y - a.y;
    const denominator = dx * dx + dy * dy; let maxDistance = squaredTolerance; let index = -1;
    for (let i = start + 1; i < end; i += 1) {
      const p = radial[i]; const t = denominator === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / denominator;
      const clamped = Math.max(0, Math.min(1, t)); const px = a.x + clamped * dx; const py = a.y + clamped * dy;
      const distanceSquared = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (distanceSquared > maxDistance) { maxDistance = distanceSquared; index = i; }
    }
    if (index !== -1) { keep[index] = 1; stack.push([start, index], [index, end]); }
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
    const current = usable[i]; const next = usable[i + 1];
    d += ` Q${current.x.toFixed(2)} ${current.y.toFixed(2)} ${((current.x + next.x) / 2).toFixed(2)} ${((current.y + next.y) / 2).toFixed(2)}`;
  }
  const last = usable[usable.length - 1]; d += ` L${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  if (closed) d += ' Z';
  return d;
}

function skeletonize(input: Uint8Array, width: number, height: number) {
  const image = new Uint8Array(input);
  const neighbors = (x: number, y: number) => [image[(y - 1) * width + x], image[(y - 1) * width + x + 1], image[y * width + x + 1], image[(y + 1) * width + x + 1], image[(y + 1) * width + x], image[(y + 1) * width + x - 1], image[y * width + x - 1], image[(y - 1) * width + x - 1]];
  const transitions = (n: number[]) => n.reduce((count, value, i) => count + (value === 0 && n[(i + 1) % n.length] === 1 ? 1 : 0), 0);
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const removeA: number[] = [];
    for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x; if (!image[index]) continue; const n = neighbors(x, y); const count = n.reduce((sum, value) => sum + value, 0);
      if (count < 2 || count > 6 || transitions(n) !== 1) continue;
      if (n[0] * n[2] * n[4] !== 0 || n[2] * n[4] * n[6] !== 0) continue; removeA.push(index);
    }
    for (const index of removeA) image[index] = 0;
    const removeB: number[] = [];
    for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x; if (!image[index]) continue; const n = neighbors(x, y); const count = n.reduce((sum, value) => sum + value, 0);
      if (count < 2 || count > 6 || transitions(n) !== 1) continue;
      if (n[0] * n[2] * n[6] !== 0 || n[0] * n[4] * n[6] !== 0) continue; removeB.push(index);
    }
    for (const index of removeB) image[index] = 0;
    if (removeA.length + removeB.length === 0) break;
  }
  return image;
}

function removeTinyComponents(mask: Uint8Array, width: number, height: number, minimum = 4) {
  const visited = new Uint8Array(mask.length); const output = new Uint8Array(mask);
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const start = y * width + x; if (!mask[start] || visited[start]) continue;
    const queue = [start]; const component: number[] = []; visited[start] = 1;
    while (queue.length) {
      const index = queue.pop() as number; component.push(index); const cx = index % width; const cy = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue; const nx = cx + dx; const ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
        const next = ny * width + nx; if (mask[next] && !visited[next]) { visited[next] = 1; queue.push(next); }
      }
    }
    if (component.length < minimum) for (const index of component) output[index] = 0;
  }
  return output;
}

function traceSkeletonStrokes(skeleton: Uint8Array, width: number, height: number): SkeletonStroke[] {
  const points = new Set<string>();
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) if (skeleton[y * width + x]) points.add(`${x},${y}`);
  const neighborsOf = (point: Point) => {
    const result: Point[] = [];
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue; const candidate = {x: point.x + dx, y: point.y + dy}; if (points.has(pointKey(candidate))) result.push(candidate);
    }
    return result;
  };
  const visited = new Set<string>(); const strokes: SkeletonStroke[] = [];
  const seeds = [...points].map((key) => { const [x, y] = key.split(',').map(Number); return {x, y}; }).sort((a, b) => neighborsOf(a).length - neighborsOf(b).length);
  const follow = (seed: Point) => {
    const chain: Point[] = [seed]; let previous: Point | null = null; let current = seed;
    for (let guard = 0; guard < width * height; guard += 1) {
      const candidates = neighborsOf(current).filter((candidate) => !visited.has(pointKey(candidate))); if (!candidates.length) break;
      let best = candidates[0];
      if (previous) {
        const incoming = normalize(current.x - previous.x, current.y - previous.y); let bestScore = -Infinity;
        for (const candidate of candidates) {
          const outgoing = normalize(candidate.x - current.x, candidate.y - current.y); const score = dot(incoming.x, incoming.y, outgoing.x, outgoing.y) * 100 - distance(current, candidate);
          if (score > bestScore) { bestScore = score; best = candidate; }
        }
      }
      visited.add(pointKey(best)); chain.push(best); previous = current; current = best;
      if (neighborsOf(current).length > 2 && chain.length > 8) break;
    }
    return chain;
  };
  for (const seed of seeds) {
    if (visited.has(pointKey(seed))) continue; visited.add(pointKey(seed)); const chain = follow(seed); if (chain.length < 3) continue;
    const simplified = simplify(chain); const length = simplified.reduce((total, point, index) => index === 0 ? 0 : total + distance(simplified[index - 1], point), 0);
    if (length < MIN_STROKE_LENGTH) continue; const xs = simplified.map((point) => point.x); const ys = simplified.map((point) => point.y);
    strokes.push({points: simplified, length, centerX: (Math.min(...xs) + Math.max(...xs)) / 2, centerY: (Math.min(...ys) + Math.max(...ys)) / 2, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)});
  }
  return strokes;
}

function regionAffinity(stroke: SkeletonStroke, regions: ConstructionRegion[], width: number, height: number) {
  if (!regions.length) return 0; const x = stroke.centerX / width * 100; const y = stroke.centerY / height * 100; let best = 0;
  for (const region of regions) { const radius = Math.max(5, region.radius * 2.2); best = Math.max(best, clamp01(1 - Math.hypot(x - region.x, y - region.y) / radius) * (1.1 - region.start * 0.5)); }
  return best;
}
function isLikelyEnvironmentStroke(stroke: SkeletonStroke, width: number, height: number) {
  const x = stroke.centerX / width; const y = stroke.centerY / height;
  const horizontal = stroke.width > Math.max(28, stroke.height * 5);
  return horizontal && y > 0.67 && x > 0.01 && x < 0.99 && stroke.length > 55;
}
function mapSourcePoint(point: Point, naturalWidth: number, naturalHeight: number, boxWidth: number, boxHeight: number, fit: string, position: {x: number; y: number}) {
  const scale = fit === 'cover' ? Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight) : fit === 'contain' ? Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight) : 1;
  const contentWidth = naturalWidth * scale; const contentHeight = naturalHeight * scale;
  const offsetX = (boxWidth - contentWidth) * position.x; const offsetY = (boxHeight - contentHeight) * position.y;
  return {x: ((point.x * scale + offsetX) / boxWidth) * 100, y: ((point.y * scale + offsetY) / boxHeight) * 100};
}
function pathNumbers(d: string) { return (d.match(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? []).map(Number); }
function pathBounds(d: string) {
  const n = pathNumbers(d); if (n.length < 2) return {x: 0, y: 0, width: 0, height: 0};
  const xs: number[] = []; const ys: number[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) { xs.push(n[i]); ys.push(n[i + 1]); }
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  return {x: minX, y: minY, width: maxX - minX, height: maxY - minY};
}
function inheritedAttribute(element: Element, name: string) {
  let current: Element | null = element;
  while (current) {
    const value = current.getAttribute(name); if (value) return value;
    const style = current.getAttribute('style') ?? '';
    const match = style.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i'));
    if (match?.[1]) return match[1].trim();
    current = current.parentElement;
  }
  return undefined;
}
function numericAttr(element: Element, name: string, fallback = 0) { const value = Number.parseFloat(element.getAttribute(name) ?? ''); return Number.isFinite(value) ? value : fallback; }
function elementToPath(element: Element) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'path') return element.getAttribute('d') ?? '';
  if (tag === 'line') return `M${numericAttr(element, 'x1')} ${numericAttr(element, 'y1')} L${numericAttr(element, 'x2')} ${numericAttr(element, 'y2')}`;
  if (tag === 'polyline' || tag === 'polygon') {
    const values = pathNumbers(element.getAttribute('points') ?? ''); if (values.length < 4) return '';
    let d = `M${values[0]} ${values[1]}`; for (let i = 2; i + 1 < values.length; i += 2) d += ` L${values[i]} ${values[i + 1]}`; if (tag === 'polygon') d += ' Z'; return d;
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = numericAttr(element, 'cx'); const cy = numericAttr(element, 'cy'); const rx = tag === 'circle' ? numericAttr(element, 'r') : numericAttr(element, 'rx'); const ry = tag === 'circle' ? rx : numericAttr(element, 'ry');
    if (!rx || !ry) return ''; const k = 0.5522848;
    return `M${cx + rx} ${cy} C${cx + rx} ${cy + k * ry} ${cx + k * rx} ${cy + ry} ${cx} ${cy + ry} C${cx - k * rx} ${cy + ry} ${cx - rx} ${cy + k * ry} ${cx - rx} ${cy} C${cx - rx} ${cy - k * ry} ${cx - k * rx} ${cy - ry} ${cx} ${cy - ry} C${cx + k * rx} ${cy - ry} ${cx + rx} ${cy - k * ry} ${cx + rx} ${cy} Z`;
  }
  return '';
}
function mapSvgPathToPercent(d: string, box: {scale: number; offsetX: number; offsetY: number; boxWidth: number; boxHeight: number}, viewMinX = 0, viewMinY = 0) {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];
  const arity: Record<string, number> = {M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0};
  let command = ''; let i = 0; let output = ''; let currentX = 0; let currentY = 0; let subpathX = 0; let subpathY = 0;
  const mapX = (x: number) => ((x - viewMinX) * box.scale + box.offsetX) / box.boxWidth * 100;
  const mapY = (y: number) => ((y - viewMinY) * box.scale + box.offsetY) / box.boxHeight * 100;
  while (i < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[i])) { command = tokens[i++]; output += command; if (command.toUpperCase() === 'Z') { currentX = subpathX; currentY = subpathY; } continue; }
    if (!command) { i += 1; continue; }
    const upper = command.toUpperCase(); const relative = command === command.toLowerCase(); const count = arity[upper];
    if (!count) { command = ''; continue; }
    if (i + count > tokens.length) break;
    const values = tokens.slice(i, i + count).map(Number); i += count;
    const absolute = (index: number, axis: 'x' | 'y') => values[index] + (relative ? (axis === 'x' ? currentX : currentY) : 0);
    if (upper === 'M' || upper === 'L' || upper === 'T') {
      const x = absolute(0, 'x'); const y = absolute(1, 'y'); output += `${mapX(x).toFixed(3)} ${mapY(y).toFixed(3)} `; currentX = x; currentY = y;
      if (upper === 'M') { subpathX = x; subpathY = y; command = relative ? 'l' : 'L'; }
    } else if (upper === 'H') { const x = absolute(0, 'x'); output += `${mapX(x).toFixed(3)} `; currentX = x; }
    else if (upper === 'V') { const y = absolute(0, 'y'); output += `${mapY(y).toFixed(3)} `; currentY = y; }
    else if (upper === 'C') { const points = [absolute(0, 'x'), absolute(1, 'y'), absolute(2, 'x'), absolute(3, 'y'), absolute(4, 'x'), absolute(5, 'y')]; output += points.map((value, index) => (index % 2 === 0 ? mapX(value) : mapY(value)).toFixed(3)).join(' ') + ' '; currentX = points[4]; currentY = points[5]; }
    else if (upper === 'S' || upper === 'Q') { const points = [absolute(0, 'x'), absolute(1, 'y'), absolute(2, 'x'), absolute(3, 'y')]; output += points.map((value, index) => (index % 2 === 0 ? mapX(value) : mapY(value)).toFixed(3)).join(' ') + ' '; currentX = points[2]; currentY = points[3]; }
    else if (upper === 'A') { const x = absolute(5, 'x'); const y = absolute(6, 'y'); const arc = [values[0], values[1], values[2], values[3], values[4], mapX(x), mapY(y)]; output += arc.map((value) => Number(value).toFixed(3)).join(' ') + ' '; currentX = x; currentY = y; }
  }
  return output.trim();
}
async function traceSvgArtwork(image: HTMLImageElement, regions: ConstructionRegion[]): Promise<ContourPath[] | null> {
  const src = image.currentSrc || image.src; if (!src || !/\.svg(?:$|[?#])/i.test(src)) return null;
  const response = await fetch(src); if (!response.ok) return null; const text = await response.text();
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml'); const root = parsed.documentElement;
  if (!root || root.querySelector('parsererror')) return null;
  const viewBoxValues = pathNumbers(root.getAttribute('viewBox') ?? '');
  const sourceWidth = viewBoxValues.length >= 4 ? viewBoxValues[2] : numericAttr(root, 'width', image.naturalWidth);
  const sourceHeight = viewBoxValues.length >= 4 ? viewBoxValues[3] : numericAttr(root, 'height', image.naturalHeight);
  const viewMinX = viewBoxValues.length >= 4 ? viewBoxValues[0] : 0; const viewMinY = viewBoxValues.length >= 4 ? viewBoxValues[1] : 0;
  const style = getComputedStyle(image); const fit = style.objectFit || 'fill'; const position = parseObjectPosition(style.objectPosition || '50% 50%');
  const boxWidth = Math.max(1, image.clientWidth); const boxHeight = Math.max(1, image.clientHeight); const box = naturalBox(image, fit, position, boxWidth, boxHeight, sourceWidth, sourceHeight);
  const elements = Array.from(root.querySelectorAll('path,line,polyline,polygon,circle,ellipse'));
  const candidates = elements.map((element, sourceIndex) => {
    const d = elementToPath(element); const stroke = inheritedAttribute(element, 'stroke'); const fill = inheritedAttribute(element, 'fill'); const opacity = Number.parseFloat(inheritedAttribute(element, 'opacity') ?? '1');
    const strokeWidth = Number.parseFloat(inheritedAttribute(element, 'stroke-width') ?? '8');
    const visibleStroke = Boolean(stroke && stroke !== 'none' && opacity > 0.05);
    const visibleFill = Boolean(fill && fill !== 'none' && opacity > 0.05);
    // SVG masters often encode the illustration as filled paths rather than stroked paths. A filled
    // silhouette is still authored vector geometry, so its perimeter is a legitimate pen contour.
    const drawable = visibleStroke || visibleFill;
    const bounds = pathBounds(d); const centerX = bounds.x + bounds.width / 2; const centerY = bounds.y + bounds.height / 2;
    const boundsStroke: SkeletonStroke = {points: [{x: centerX, y: centerY}], length: Math.max(bounds.width, bounds.height, strokeWidth), centerX, centerY, width: bounds.width, height: bounds.height};
    return {d, sourceIndex, strokeWidth, boundsStroke, drawable};
  }).filter((entry) => entry.drawable && entry.d);
  if (!candidates.length) return null;
  const normalized = candidates.map((entry) => ({...entry, affinity: regionAffinity(entry.boundsStroke, regions, sourceWidth, sourceHeight), environment: isLikelyEnvironmentStroke(entry.boundsStroke, sourceWidth, sourceHeight)}));
  const subject = normalized.filter((entry) => !entry.environment).sort((a, b) => b.affinity - a.affinity || a.sourceIndex - b.sourceIndex);
  const support = normalized.filter((entry) => entry.environment).sort((a, b) => a.sourceIndex - b.sourceIndex);
  const ordered = [...subject, ...support].slice(0, MAX_STROKES);
  const subjectWeight = subject.reduce((sum, entry) => sum + Math.sqrt(entry.boundsStroke.length), 0); const supportWeight = support.reduce((sum, entry) => sum + Math.sqrt(entry.boundsStroke.length), 0);
  let subjectCursor = 0; let supportCursor = 0;
  return ordered.map((entry, index) => {
    const isSubject = index < subject.length; const weight = Math.sqrt(entry.boundsStroke.length); const totalWeight = Math.max(0.001, isSubject ? subjectWeight : supportWeight); const normalizedWeight = weight / totalWeight;
    const start = isSubject ? subjectCursor * SUBJECT_REVEAL_END : SUBJECT_REVEAL_END + supportCursor * (FULL_REVEAL_END - SUBJECT_REVEAL_END);
    const end = isSubject ? Math.min(SUBJECT_REVEAL_END + 0.045, start + Math.max(0.045, normalizedWeight * subject.length * 1.05)) : Math.min(1, start + Math.max(0.025, normalizedWeight * Math.max(1, support.length) * 0.85));
    if (isSubject) subjectCursor += normalizedWeight; else supportCursor += normalizedWeight;
    return {d: mapSvgPathToPercent(entry.d, box, viewMinX, viewMinY), start, end, color: INK, width: Math.max(0.8, Math.min(1.55, entry.strokeWidth * 0.13)), opacity: 0.94};
  }).filter((path) => Boolean(path.d));
}
function naturalBox(_image: HTMLImageElement, fit: string, position: {x: number; y: number}, boxWidth: number, boxHeight: number, naturalWidth: number, naturalHeight: number) {
  const scale = fit === 'cover' ? Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight) : fit === 'contain' ? Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight) : 1;
  return {scale, offsetX: (boxWidth - naturalWidth * scale) * position.x, offsetY: (boxHeight - naturalHeight * scale) * position.y, boxWidth, boxHeight};
}
function traceArtwork(image: HTMLImageElement, regions: ConstructionRegion[]): ContourPath[] {
  const naturalWidth = image.naturalWidth; const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) throw new Error('Master artwork has no intrinsic dimensions');
  const width = TRACE_WIDTH; const height = Math.max(64, Math.min(MAX_TRACE_HEIGHT, Math.round(naturalHeight / naturalWidth * width)));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true}); if (!ctx) throw new Error('Unable to create centerline tracing canvas');
  ctx.drawImage(image, 0, 0, width, height); const pixels = ctx.getImageData(0, 0, width, height).data;
  const sample = (x: number, y: number) => { const sx = Math.max(0, Math.min(width - 1, x)); const sy = Math.max(0, Math.min(height - 1, y)); const i = (sy * width + sx) * 4; return {r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3]}; };
  const luminances: number[] = []; for (let y = 2; y < height - 2; y += 3) for (let x = 2; x < width - 2; x += 3) { const p = sample(x, y); if (p.a >= 32) luminances.push(0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b); }
  luminances.sort((a, b) => a - b); const referenceLum = luminances.length ? luminances[Math.floor((luminances.length - 1) * 0.9)] : 220;
  const inkMask = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const p = sample(x, y); if (p.a < 32) continue; const lum = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b; const chroma = Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b);
    const left = sample(x - 1, y); const right = sample(x + 1, y); const up = sample(x, y - 1); const down = sample(x, y + 1);
    const gradient = Math.max(Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b), Math.hypot(up.r - down.r, up.g - down.g, up.b - down.b));
    if ((lum < referenceLum - 26 && chroma < 112) || (lum < 118 && chroma < 128) || (gradient > 28 && lum < referenceLum - 10 && chroma < 98)) inkMask[y * width + x] = 1;
  }
  const cleaned = removeTinyComponents(inkMask, width, height, 4); const skeleton = skeletonize(cleaned, width, height);
  const strokes = traceSkeletonStrokes(skeleton, width, height).sort((a, b) => b.length - a.length).slice(0, MAX_STROKES);
  if (!strokes.length) throw new Error(`Master artwork produced no centerline strokes (reference luminance ${referenceLum.toFixed(1)})`);
  const style = getComputedStyle(image); const fit = style.objectFit || 'fill'; const position = parseObjectPosition(style.objectPosition || '50% 50%'); const boxWidth = Math.max(1, image.clientWidth); const boxHeight = Math.max(1, image.clientHeight);
  const enriched = strokes.map((stroke) => ({stroke, affinity: regionAffinity(stroke, regions, width, height), environment: isLikelyEnvironmentStroke(stroke, width, height)}));
  const subject = enriched.filter((entry) => !entry.environment).sort((a, b) => b.affinity - a.affinity || b.stroke.length - a.stroke.length); const support = enriched.filter((entry) => entry.environment).sort((a, b) => b.stroke.length - a.stroke.length);
  const subjectWeight = subject.reduce((sum, entry) => sum + Math.sqrt(entry.stroke.length), 0); const supportWeight = support.reduce((sum, entry) => sum + Math.sqrt(entry.stroke.length), 0); let subjectCursor = 0; let supportCursor = 0;
  return [...subject, ...support].map((entry, index) => {
    const {stroke} = entry; const weight = Math.sqrt(stroke.length); const isSubject = index < subject.length; const normalized = weight / Math.max(0.001, isSubject ? subjectWeight : supportWeight);
    const start = isSubject ? subjectCursor * SUBJECT_REVEAL_END : SUBJECT_REVEAL_END + supportCursor * (FULL_REVEAL_END - SUBJECT_REVEAL_END); const end = isSubject ? Math.min(SUBJECT_REVEAL_END + 0.045, start + Math.max(0.03, normalized * subject.length * 0.95)) : Math.min(1, start + Math.max(0.02, normalized * Math.max(1, support.length) * 0.8));
    if (isSubject) subjectCursor += normalized; else supportCursor += normalized;
    const mapped = stroke.points.map((point) => mapSourcePoint({x: point.x / width * naturalWidth, y: point.y / height * naturalHeight}, naturalWidth, naturalHeight, boxWidth, boxHeight, fit, position));
    return {d: pathFromPoints(mapped), start, end, color: INK, width: stroke.centerY / height > 0.82 ? 0.92 : 1.02, opacity: 0.96};
  }).filter((path) => Boolean(path.d));
}
function Stroke({path, progress}: {path: ContourPath; progress: number}) {
  const local = clamp01((progress - path.start) / Math.max(0.01, path.end - path.start));
  if (local <= 0.001) return null;
  return <>
    <path d={path.d} fill="none" stroke={path.color} strokeWidth={path.width + 0.46} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - local} opacity={path.opacity * 0.13} filter="blur(0.45px)" vectorEffect="non-scaling-stroke" />
    <path d={path.d} fill="none" stroke={path.color} strokeWidth={path.width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - local} opacity={path.opacity} vectorEffect="non-scaling-stroke" />
  </>;
}
export function InkConstructionOverlay({regions, progress, opacity = 1, showGuide = true}: {regions: ConstructionRegion[]; progress: number; opacity?: number; showGuide?: boolean}) {
  const svgRef = useRef<SVGSVGElement | null>(null); const [paths, setPaths] = useState<ContourPath[] | null>(null); const [geometry, setGeometry] = useState<Geometry>({transform: 'none', transformOrigin: '50% 50%'});
  const {delayRender, continueRender, cancelRender} = useDelayRender(); const [handle] = useState(() => delayRender('Tracing master artwork centerline strokes', {retries: 2}));
  useEffect(() => {
    let cancelled = false; let frameHandle: number | null = null; let timeoutHandle: ReturnType<typeof setTimeout> | null = null; const startedAt = Date.now(); const parent = svgRef.current?.parentElement;
    const fail = (error: Error) => { if (!cancelled) cancelRender(error); };
    const traceWhenReady = () => {
      if (cancelled) return; const image = parent?.querySelector('img');
      if (!image) { if (Date.now() - startedAt > MAX_WAIT_MS) fail(new Error('InkConstructionOverlay could not find the master artwork <img>')); else frameHandle = requestAnimationFrame(traceWhenReady); return; }
      const finish = async () => {
        if (cancelled) return;
        try {
          const svgPaths = await traceSvgArtwork(image, regions); setPaths(svgPaths ?? traceArtwork(image, regions));
          const style = getComputedStyle(image); setGeometry({transform: style.transform === 'none' ? 'none' : style.transform, transformOrigin: style.transformOrigin || '50% 50%'}); continueRender(handle);
        } catch (error) { cancelRender(error); }
      };
      if (image.complete && image.naturalWidth > 0) void finish(); else image.addEventListener('load', () => void finish(), {once: true});
      timeoutHandle = setTimeout(() => { if (!image.complete || image.naturalWidth === 0) fail(new Error('Master artwork did not finish loading for centerline tracing')); }, MAX_WAIT_MS);
    };
    traceWhenReady();
    return () => { cancelled = true; if (frameHandle !== null) cancelAnimationFrame(frameHandle); if (timeoutHandle !== null) clearTimeout(timeoutHandle); continueRender(handle); };
  }, [cancelRender, continueRender, handle, regions]);
  if (regions.length === 0) return null; const progressValue = clamp01(progress);
  return <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity, transform: geometry.transform, transformOrigin: geometry.transformOrigin}} aria-hidden>
    {showGuide ? <g opacity={0.11 * (1 - progressValue)}><ellipse cx="50" cy="27" rx="18" ry="13.5" fill="none" stroke={GOLD} strokeWidth="0.48" strokeDasharray="1.2 2.8" /><path d="M50 8 C48 28 52 52 50 94" fill="none" stroke={GOLD} strokeWidth="0.36" strokeDasharray="1.2 3" /><path d="M25 41 Q50 35 75 41" fill="none" stroke={GOLD} strokeWidth="0.34" strokeDasharray="1 2.5" /></g> : null}
    {paths?.map((path, index) => <Stroke key={index} path={path} progress={progressValue} />)}
  </svg>;
}
