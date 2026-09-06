import fs from 'node:fs';
import {profileForAnimation} from './remotion/visual-beats.js';

type Manifest = {beats: Array<{beat_id: string; animation?: string; visual_role: string}>};

const manifestPath = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
const allowedWash = new Set(['none', 'gold', 'red', 'warm']);
const allowedAnimations = new Set([
  'draw_reveal', 'gold_highlight', 'sun_pulse', 'ink_motion', 'hand_reveal',
  'subtle_parallax', 'gold_fade', 'light_reveal', 'ink_settle',
]);
const failures: string[] = [];

for (const beat of manifest.beats) {
  const animation = beat.animation ?? 'draw_reveal';
  if (!allowedAnimations.has(animation)) failures.push(`${beat.beat_id}: unsupported animation ${animation}`);
  const profile = profileForAnimation(animation, beat.visual_role);
  if (!allowedWash.has(profile.wash)) failures.push(`${beat.beat_id}: invalid wash ${profile.wash}`);
  if (profile.washStrength < 0 || profile.washStrength > 1) failures.push(`${beat.beat_id}: washStrength outside 0..1`);
  if (!['up', 'down', 'left', 'right', 'center'].includes(profile.reveal)) failures.push(`${beat.beat_id}: invalid reveal ${profile.reveal}`);
  if (!['caption', 'keyword', 'reveal'].includes(profile.textMode)) failures.push(`${beat.beat_id}: invalid textMode ${profile.textMode}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`visual-beat-check: PASS (${manifest.beats.length} beats)`);
