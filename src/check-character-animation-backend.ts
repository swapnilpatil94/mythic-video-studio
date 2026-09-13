import {CutoutPuppetAnimationBackend} from './character/cutout-puppet-backend';
import {SynfigCharacterAnimationBackend, SynfigUnavailableError, buildSifDocument, isSynfigAvailable} from './character/synfig-backend';
import type {RigDefinition, AnimationClip} from './character/animation-backend';

const failures: string[] = [];

async function main() {
  // --- CutoutPuppetAnimationBackend: the backend actually exercised by the rendered films ---
  const cutout = new CutoutPuppetAnimationBackend();

  const shivaRig = await cutout.prepareRig('shiva.master', 'unused.png');
  if (shivaRig.anchors.length !== 4) failures.push(`CutoutPuppetAnimationBackend.prepareRig('shiva.master') expected 4 anchors (one per authored region), got ${shivaRig.anchors.length}`);
  if (shivaRig.naturalWidth !== 896 || shivaRig.naturalHeight !== 1584) failures.push('CutoutPuppetAnimationBackend.prepareRig should carry through puppet-regions.ts\'s own naturalWidth/naturalHeight');
  const gestureAnchor = shivaRig.anchors[1];
  if (gestureAnchor.part !== 'upper_arm') failures.push(`shiva.master's gesture-capable region (index 1) should infer part 'upper_arm', got '${gestureAnchor.part}'`);

  let threwForUnknown = false;
  try {
    await cutout.prepareRig('no-such-character', 'unused.png');
  } catch {
    threwForUnknown = true;
  }
  if (!threwForUnknown) failures.push('CutoutPuppetAnimationBackend.prepareRig should throw for a characterId with no puppet-regions.ts entry and no hint, not silently return an empty rig');

  const idleClip = await cutout.generateAnimation(shivaRig, [{kind: 'idle'}], 6, 30);
  const idleArtifact = await cutout.renderAnimation(shivaRig, idleClip, 'unused.png');
  if (idleArtifact.kind !== 'live-rig') failures.push(`CutoutPuppetAnimationBackend.renderAnimation should return a 'live-rig' artifact (no offline render pass), got '${idleArtifact.kind}'`);
  if (idleArtifact.kind === 'live-rig' && idleArtifact.gestureRegionIndex !== undefined) failures.push('an idle-only action list should not mark the gesture region active');

  const reachClip = await cutout.generateAnimation(shivaRig, [{kind: 'reach', intensity: 0.7}], 6, 30);
  const reachArtifact = await cutout.renderAnimation(shivaRig, reachClip, 'unused.png');
  if (reachArtifact.kind === 'live-rig' && reachArtifact.gestureRegionIndex !== 1) failures.push(`a 'reach' action should activate shiva.master's own gestureRegionIndex (1), got ${reachArtifact.kind === 'live-rig' ? reachArtifact.gestureRegionIndex : 'n/a'}`);

  // --- SynfigCharacterAnimationBackend: real, but honestly limited in this environment ---
  const synfig = new SynfigCharacterAnimationBackend('/tmp/kathaaya-synfig-check');
  const placeholderRig = await synfig.prepareRig('a-brand-new-character', 'unused.png');
  if (placeholderRig.anchors.length !== 3) failures.push(`SynfigCharacterAnimationBackend.prepareRig with no hint should return the 3-anchor placeholder rig (head/torso/hand), got ${placeholderRig.anchors.length}`);

  const hintedRig: RigDefinition = {
    characterId: 'a-brand-new-character',
    naturalWidth: 800,
    naturalHeight: 1200,
    anchors: [{id: 'a-brand-new-character-hand', part: 'hand', x: 30, y: 40}],
    bones: [],
  };
  const rehintedRig = await synfig.prepareRig('a-brand-new-character', 'unused.png', hintedRig);
  if (rehintedRig.anchors.length !== 1 || rehintedRig.anchors[0].id !== 'a-brand-new-character-hand') failures.push('SynfigCharacterAnimationBackend.prepareRig should use a provided hint verbatim instead of the placeholder rig');

  const synfigClip: AnimationClip = await synfig.generateAnimation(rehintedRig, [{kind: 'reach', anchorId: 'a-brand-new-character-hand', intensity: 0.6, durationSeconds: 1}], 2, 24);
  const sif = buildSifDocument(rehintedRig, synfigClip);
  if (!sif.includes('<?xml')) failures.push('buildSifDocument should emit a well-formed XML document (missing XML declaration)');
  if (!sif.includes('<canvas') || !sif.includes('</canvas>')) failures.push('buildSifDocument should emit a <canvas> root element (the real Synfig project root)');
  if (!sif.includes('a-brand-new-character-hand')) failures.push('buildSifDocument should emit a layer for every rig anchor, by id');
  if (!sif.includes('<animated type="vector">') || !sif.includes('<waypoint')) failures.push('buildSifDocument should emit animated/waypoint params, not a static pose — that\'s the actual keyframe data a Synfig render would consume');
  const openTags = (sif.match(/<canvas/g) ?? []).length;
  const closeTags = (sif.match(/<\/canvas>/g) ?? []).length;
  if (openTags !== closeTags) failures.push('buildSifDocument\'s <canvas> tag is unbalanced');

  // The real, current state of this environment: `synfig` is not on PATH (see synfig-backend.ts's
  // own top-of-file doc for exactly why, and what installing it would risk). This asserts the
  // backend actually fails loudly and specifically when that's true, rather than silently
  // no-op'ing or pretending to have rendered something — the contract this whole abstraction
  // depends on being trustworthy.
  const available = await isSynfigAvailable();
  if (!available) {
    let threw: unknown;
    try {
      await synfig.renderAnimation(rehintedRig, synfigClip, 'unused.png');
    } catch (error) {
      threw = error;
    }
    if (!(threw instanceof SynfigUnavailableError)) failures.push(`SynfigCharacterAnimationBackend.renderAnimation should throw SynfigUnavailableError when \`synfig\` isn't on PATH, got: ${threw instanceof Error ? threw.constructor.name + ': ' + threw.message : String(threw)}`);
  } else {
    console.log('Note: `synfig` IS on PATH in this environment — renderAnimation was not exercised end-to-end by this check (no assertion either way); the SynfigUnavailableError contract only gets tested on an environment without the binary.');
  }

  if (failures.length > 0) {
    console.error('Character animation backend checks failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('Character animation backend checks passed: CutoutPuppetAnimationBackend correctly adapts puppet-regions.ts (the backend actually driving rendered films), SynfigCharacterAnimationBackend generates valid, well-formed .sif project XML and fails clearly (not silently) when the synfig CLI is unavailable.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
