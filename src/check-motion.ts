import {cameraMotion, drawRevealProgress, layerTransform, parallaxOffset} from './remotion/motion.js';

const failures: string[] = [];
const approx = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const start = cameraMotion('push_in', 0);
const end = cameraMotion('push_in', 1);
if (!(end.scale > start.scale)) failures.push('push_in must increase scale');

const panStart = cameraMotion('pan', 0);
const panEnd = cameraMotion('pan', 1);
if (!(panStart.translateX < panEnd.translateX)) failures.push('pan must move left-to-right');

const far = parallaxOffset(1, 1, {x: 100, y: 40});
const near = parallaxOffset(0.1, 1, {x: 100, y: 40});
if (!(Math.abs(far.x) > Math.abs(near.x))) failures.push('far layers must move more than near layers');

if (!approx(drawRevealProgress(0), 0)) failures.push('draw reveal should start hidden');
if (!approx(drawRevealProgress(1), 1)) failures.push('draw reveal should finish visible');

const transform = layerTransform(start, 0.5, 0.5);
if (!transform.includes('translate(') || !transform.includes('scale(')) failures.push('layer transform must include translation and scale');

if (failures.length > 0) {
  console.error('Motion primitive checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Motion primitive checks passed.');
