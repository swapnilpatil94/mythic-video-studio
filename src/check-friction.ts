import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = process.argv[2] ?? 'examples/friction-karna-scene.json';
const spec = JSON.parse(await readFile(resolve(input), 'utf8')) as {
  schemaVersion: number;
  fps: number;
  startFrame: number;
  endFrame: number;
  layers: Array<{ id: string; z: number; kind: string; motionIntent?: string; keyframes?: Record<string, unknown[]>; pathEffect?: string }>;
};

const failures: string[] = [];
if (spec.schemaVersion !== 1) failures.push('schemaVersion must be 1');
if (!Number.isInteger(spec.fps) || spec.fps < 24 || spec.fps > 60) failures.push('fps must be an integer between 24 and 60');
if (spec.endFrame <= spec.startFrame) failures.push('endFrame must be greater than startFrame');
if (!spec.layers.length) failures.push('scene must contain layers');
if (new Set(spec.layers.map((layer) => layer.id)).size !== spec.layers.length) failures.push('layer ids must be unique');

for (const layer of spec.layers) {
  if (!Number.isFinite(layer.z)) failures.push(`layer ${layer.id}: z must be finite`);
  if (layer.kind !== 'group' && !layer.id) failures.push('non-group layer requires id');
  if (layer.motionIntent === 'ink-draw' && layer.pathEffect !== 'trim') failures.push(`layer ${layer.id}: ink-draw requires trim path effect`);
}

if (failures.length) {
  console.error('Friction handoff FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Friction handoff OK: ${spec.layers.length} layers, ${spec.endFrame - spec.startFrame + 1} frames @ ${spec.fps}fps`);
