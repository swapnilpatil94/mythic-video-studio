import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type FrictionKeyframe = {
  frame: number;
  value: number | [number, number] | [number, number, number];
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
};

export type FrictionLayer = {
  id: string;
  kind: 'svg' | 'image' | 'group' | 'path';
  asset?: string;
  z: number;
  opacity?: number;
  transform?: {
    position?: [number, number];
    scale?: [number, number];
    rotation?: number;
    pivot?: [number, number];
  };
  keyframes?: {
    position?: FrictionKeyframe[];
    scale?: FrictionKeyframe[];
    rotation?: FrictionKeyframe[];
    opacity?: FrictionKeyframe[];
  };
  pathEffect?: 'trim' | 'dash' | 'morph' | 'follow-path';
  motionIntent?: 'breathing' | 'eye-shift' | 'head-turn' | 'cloth' | 'hair' | 'camera' | 'ambient' | 'ink-draw';
};

export type FrictionSceneSpec = {
  schemaVersion: 1;
  sceneId: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  startFrame: number;
  endFrame: number;
  background?: string;
  layers: FrictionLayer[];
};

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const keyframeValue = (value: FrictionKeyframe['value']): string =>
  Array.isArray(value) ? value.join(' ') : String(value);

const keyTimes = (frames: FrictionKeyframe[], start: number, end: number): string =>
  frames.map((frame) => ((frame.frame - start) / Math.max(1, end - start)).toFixed(5)).join(';');

const durationSeconds = (frames: FrictionKeyframe[], fps: number): string => {
  const start = frames[0]?.frame ?? 0;
  const end = frames[frames.length - 1]?.frame ?? start;
  return Math.max(1 / fps, (end - start) / fps).toFixed(4);
};

const animateNumber = (attributeName: string, frames: FrictionKeyframe[] | undefined, fps: number): string => {
  if (!frames || frames.length < 2) return '';
  const start = frames[0]?.frame ?? 0;
  const end = frames[frames.length - 1]?.frame ?? start;
  return `<animate attributeName="${attributeName}" begin="${(start / fps).toFixed(4)}s" dur="${durationSeconds(frames, fps)}s" values="${frames.map((frame) => keyframeValue(frame.value)).join(';')}" keyTimes="${keyTimes(frames, start, end)}" fill="freeze" />`;
};

const animateTransform = (type: 'translate' | 'scale' | 'rotate', frames: FrictionKeyframe[] | undefined, fps: number): string => {
  if (!frames || frames.length < 2) return '';
  const start = frames[0]?.frame ?? 0;
  const end = frames[frames.length - 1]?.frame ?? start;
  const values = frames.map((frame) => {
    const value = Array.isArray(frame.value) ? frame.value : [frame.value];
    if (type === 'translate' || type === 'scale') return `${value[0]} ${value[1] ?? value[0]}`;
    return `${value[0]}`;
  }).join(';');
  return `<animateTransform attributeName="transform" type="${type}" begin="${(start / fps).toFixed(4)}s" dur="${durationSeconds(frames, fps)}s" values="${values}" keyTimes="${keyTimes(frames, start, end)}" fill="freeze" additive="sum" />`;
};

const staticTransform = (layer: FrictionLayer): string => {
  const commands: string[] = [];
  const pivot = layer.transform?.pivot;
  const position = layer.transform?.position;
  const scale = layer.transform?.scale;
  const rotation = layer.transform?.rotation;
  if (pivot) commands.push(`translate(${pivot[0]} ${pivot[1]})`);
  if (position) commands.push(`translate(${position[0]} ${position[1]})`);
  if (rotation) commands.push(`rotate(${rotation})`);
  if (scale) commands.push(`scale(${scale[0]} ${scale[1]})`);
  if (pivot) commands.push(`translate(${-pivot[0]} ${-pivot[1]})`);
  return commands.length ? ` transform="${commands.join(' ')}"` : '';
};

const renderLayer = (layer: FrictionLayer, fps: number): string => {
  const opacity = layer.opacity ?? 1;
  const attrs = ` id="${escapeXml(layer.id)}" data-friction-motion="${layer.motionIntent ?? 'none'}" opacity="${opacity}"${staticTransform(layer)}`;
  const animations = [
    animateNumber('opacity', layer.keyframes?.opacity, fps),
    animateTransform('translate', layer.keyframes?.position, fps),
    animateTransform('scale', layer.keyframes?.scale, fps),
    animateTransform('rotate', layer.keyframes?.rotation, fps),
  ].filter(Boolean).join('');

  if (layer.kind === 'group') return `<g${attrs}>${animations}</g>`;
  if (!layer.asset) throw new Error(`Friction layer "${layer.id}" requires an asset`);

  return `<g${attrs} data-friction-path-effect="${layer.pathEffect ?? 'none'}"><image href="${escapeXml(layer.asset)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />${animations}</g>`;
};

export function buildFrictionSvg(spec: FrictionSceneSpec): string {
  const layers = [...spec.layers].sort((a, b) => a.z - b.z).map((layer) => renderLayer(layer, spec.fps)).join('\n');
  const background = spec.background ? `<rect width="100%" height="100%" fill="${escapeXml(spec.background)}" />` : '';
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">`,
    `<!-- KATHAAYA / FRICTION HANDOFF schema=${spec.schemaVersion} fps=${spec.fps} frames=${spec.startFrame}-${spec.endFrame} -->`,
    background,
    layers,
    '</svg>',
  ].filter(Boolean).join('\n');
}

export async function writeFrictionScene(spec: FrictionSceneSpec, outputDir: string): Promise<{ svgPath: string; manifestPath: string }> {
  const root = resolve(outputDir);
  await mkdir(root, { recursive: true });
  const svgPath = resolve(root, `${spec.sceneId}.svg`);
  const manifestPath = resolve(root, `${spec.sceneId}.friction-scene.json`);
  await Promise.all([
    writeFile(svgPath, buildFrictionSvg(spec), 'utf8'),
    writeFile(manifestPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8'),
  ]);
  return { svgPath, manifestPath };
}
