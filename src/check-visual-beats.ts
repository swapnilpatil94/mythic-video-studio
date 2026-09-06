import fs from 'node:fs';
import {profileForAnimation} from './remotion/visual-beats.js';

type Manifest = {beats: Array<{beat_id: string; animation?: string; visual_role: string}>};

const manifestPath = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
const allowed = new Set(['none', 'gold', 'red', 'warm']);
const failures: string[] = [];

for (const beat of manifest.beats) {
  const profile = profileForAnimation(beat.animation, beat.visual_role);
  if (!allowed.has(profile.wash)) failures.push(`${beat.beat_id}: invalid wash ${profile.wash}`);
  if (profile.washStrength < 0 || profile.washStrength > 1) failures.push(`${beat.beat_id}: washStrength outside 0..1`);
  if (!['up', 'down', 'left', 'right', 'center'].includes(profile.reveal)) failures.push(`${beat.beat_id}: invalid reveal ${profile.reveal}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`visual-beat-check: PASS (${manifest.beats.length} beats)`);
