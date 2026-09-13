import type {CharacterAnimationBackend, RigDefinition, RigAnchor, AnimationClip, CharacterAction, AnimationArtifact, BodyPart} from './animation-backend';
import {PUPPET_REGIONS} from '../remotion/puppet-regions';
import type {PuppetRegion} from '../remotion/CutoutPuppet';

/**
 * Adapts the project's existing, proven character-animation system (CutoutPuppet's SVG
 * feDisplacementMap warp, driven by puppet-regions.ts's hand-authored regions) to the generic
 * CharacterAnimationBackend contract, instead of writing a second animation system. This is the
 * backend actually exercised by the rendered Shiva/Karna films today — everything here is a
 * faithful re-description of behavior that already works and has been verified against real
 * rendered frames, not new animation logic.
 *
 * Two honest limitations worth stating rather than glossing over:
 *  - `prepareRig` can only derive a rig for a characterId with an existing puppet-regions.ts entry.
 *    There is no automatic part-segmentation of a flat raster illustration in this project (see
 *    synfig-backend.ts's own doc for why that's a real, unsolved gap, not an oversight) — a new
 *    character's regions still have to be hand-placed the way karna.master/shiva.master/etc were.
 *  - `renderAnimation` never writes a file. It hands back a 'live-rig' artifact: the same region
 *    data CutoutPuppet has always consumed directly inside the Remotion render, per-frame. That is
 *    what makes this backend cheap (no offline render pass, no subprocess, no intermediate
 *    artifact) — genuinely different from what a 'rendered-file' backend does, not a shortcut.
 */
export class CutoutPuppetAnimationBackend implements CharacterAnimationBackend {
  async prepareRig(characterId: string, _masterAssetPath: string, hint?: Partial<RigDefinition>): Promise<RigDefinition> {
    if (hint?.anchors?.length) {
      return {
        characterId,
        naturalWidth: hint.naturalWidth ?? 896,
        naturalHeight: hint.naturalHeight ?? 1584,
        anchors: hint.anchors,
        bones: hint.bones ?? [],
      };
    }
    const entry = PUPPET_REGIONS[characterId];
    if (!entry) {
      throw new Error(`CutoutPuppetAnimationBackend: no puppet-regions.ts entry for "${characterId}" and no rig hint provided — this backend derives rigs from that hand-authored table, it doesn't segment master art automatically (see this file's own doc).`);
    }
    const anchors: RigAnchor[] = entry.regions.map((region, i) => ({
      id: `${characterId}-region-${i}`,
      // puppet-regions.ts's regions don't carry a body-part label today (they're described in prose
      // comments instead) — inferring a coarse part from each region's own motion/strength keeps
      // this adapter honest about what it actually knows rather than guessing a specific part like
      // 'hand' it has no real basis for. `i === entry.gestureRegionIndex` is the one region this
      // project's own data DOES single out as a specific kind of part (the expressive limb).
      part: inferPart(region, i === entry.gestureRegionIndex),
      x: region.cx,
      y: region.cy,
    }));
    return {characterId, naturalWidth: entry.naturalWidth, naturalHeight: entry.naturalHeight, anchors, bones: []};
  }

  async generateAnimation(rig: RigDefinition, actions: CharacterAction[], durationSeconds: number, fps: number): Promise<AnimationClip> {
    return {characterId: rig.characterId, fps, durationSeconds, actions};
  }

  async renderAnimation(rig: RigDefinition, clip: AnimationClip, _masterAssetPath: string): Promise<AnimationArtifact> {
    const entry = PUPPET_REGIONS[rig.characterId];
    if (!entry) {
      throw new Error(`CutoutPuppetAnimationBackend: cannot render "${rig.characterId}" — no puppet-regions.ts entry (its rig anchors have nowhere to get real displacement-region data from; this backend doesn't invent regions from anchors alone).`);
    }
    // A gesture-shaped action (reach/raise_hand/gesture_forward/point) in the clip marks the rig's
    // own gestureRegionIndex as active — the same mechanism MythicShort already drives directly via
    // gestureTriggersFor(visual_role); this just exposes it through the generic interface too, for
    // a caller that arrived at the action list some other way (e.g. a future story-director step)
    // rather than beat visual_role alone.
    const hasGesture = clip.actions.some((a) => GESTURE_ACTION_KINDS.has(a.kind));
    return {
      kind: 'live-rig',
      regions: entry.regions,
      naturalWidth: entry.naturalWidth,
      naturalHeight: entry.naturalHeight,
      gestureRegionIndex: hasGesture ? entry.gestureRegionIndex : undefined,
    };
  }
}

const GESTURE_ACTION_KINDS = new Set<CharacterAction['kind']>(['reach', 'raise_hand', 'gesture_forward', 'point']);

function inferPart(region: PuppetRegion, isGestureRegion: boolean): BodyPart {
  if (isGestureRegion) return 'upper_arm';
  if (region.motion === 'breathe') return 'torso';
  // Everything else in this project's actual authored data is a sway region over hair, a held
  // weapon, or a lower garment — 'accessory' is the honest catch-all rather than guessing which.
  return 'accessory';
}
