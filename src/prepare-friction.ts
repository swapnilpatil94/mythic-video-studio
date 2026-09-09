import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeFrictionScene, type FrictionSceneSpec } from './adapters/friction.js';

const input = process.argv[2];
const outputDir = process.argv[3] ?? 'renders/friction';

if (!input) {
  console.error('Usage: npm run friction:prepare -- <scene.json> [output-dir]');
  process.exit(1);
}

const raw = await readFile(resolve(input), 'utf8');
const spec = JSON.parse(raw) as FrictionSceneSpec;

if (spec.schemaVersion !== 1) throw new Error(`Unsupported Friction scene schema: ${spec.schemaVersion}`);
if (!Number.isInteger(spec.fps) || spec.fps <= 0) throw new Error('fps must be a positive integer');
if (spec.endFrame <= spec.startFrame) throw new Error('endFrame must be greater than startFrame');
if (!spec.layers.length) throw new Error('Friction scene must contain at least one layer');

const result = await writeFrictionScene(spec, outputDir);
console.log(`Friction handoff ready:\n- ${result.svgPath}\n- ${result.manifestPath}`);
console.log('Next step: open the generated SVG/assets in Friction and author/keyframe the scene using the motion intents in the manifest.');
