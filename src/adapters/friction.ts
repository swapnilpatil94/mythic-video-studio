import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

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

const animate = (attributeName: string, frames: FrictionKeyframe[] | undefined): string => {
  if (!frames || frames.length < 2) return '';
  const begin = frames[0]?.frame ?? 0;
  const end = frames[frames.length - 1]?.frame ?? begin;
  const values = frames.map((frame) => keyframeValue(frame.value)).join(';');
  const keyTimes = frames.map((frame) => ((frame.frame - begin) / Math.max(1, end - begin)).toFixed(5)).join(';');
  return `<animate attributeName="${attributeName}" begin="0s" dur="${Math.max(1, end - begin)}f" values="${values}" keyTimes="${keyTimes}" fill="freeze" />`;
};

const transform = (layer: FrictionLayer): string => {
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

const renderLayer = (layer: FrictionLayer): string => {
  const opacity = layer.opacity ?? 1;
  const attrs = ` id="${escapeXml(layer.id)}" data-friction-motion="${layer.motionIntent ?? 'none'}" opacity="${opacity}"${transform(layer)}`;
  const animations = [
    animate('opacity', layer.keyframes?.opacity),
    animate('transform', undefined),
  ].filter(Boolean).join('');

  if (layer.kind === 'group') return `<g${attrs}>${animations}</g>`;
  if (!layer.asset) throw new Error(`Friction layer "${layer.id}" requires an asset`);

  if (layer.kind === 'image') {
    return `<image${attrs} href="${escapeXml(layer.asset)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${animations}</image>`;
  }

  return `<g${attrs} data-friction-path-effect="${layer.pathEffect ?? 'none'}"><image href="${escapeXml(layer.asset)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />${animations}</g>`;
};

export function buildFrictionSvg(spec: FrictionSceneSpec): string {
  const layers = [...spec.layers].sort((a, b) => a.z - b.z).map(renderLayer).join('\n');
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
