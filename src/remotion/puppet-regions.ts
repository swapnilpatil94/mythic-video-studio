import type {PuppetRegion} from './CutoutPuppet';

/**
 * Hand-authored displacement-warp regions, keyed by the SAME asset ref name the manifest/story
 * package uses (e.g. "karna.master") — not by filename, since a ref can be re-pointed to a
 * different generated file across projects while the subject's geometry (and so these regions)
 * stays the same. Only refs with an entry here get real localized motion; everything else falls
 * back to the existing whole-image camera pan/zoom/sway in FramedLayer, unchanged.
 *
 * Originally character-only ("puppet warp" — hair/arm/torso), now also covers environments: the
 * same CutoutPuppet mechanism doesn't care what the source image depicts, so a broad, low-strength
 * region over a cloud band or a water surface reads as ambient scene motion (cloud drift, water
 * ripple) using the exact same proven displacement pipeline, not a separate system. This was the
 * direct fix for backgrounds being completely static images with only camera movement over them —
 * real motion inside the scene, not just a moving window looking at a still picture.
 */
export type PuppetEntry = {
  regions: PuppetRegion[];
  naturalWidth: number;
  naturalHeight: number;
  /** 'character' gets the subtle perspective head-turn in FramedLayer (see the `faceTilt` comment
   * there) — a flat portrait reads as looking toward/away from camera. 'environment' never should:
   * a landscape doesn't have a "face" to turn, and tilting one would read as the ground tipping. */
  kind: 'character' | 'environment';
  /** Percent-of-image point the head-turn pivots around, so a character rotates like their head is
   * turning rather than the whole canvas swinging around its geometric center. Approximate (eyeballed
   * against each master image, not grid-measured like the regions below) — fine for a pivot point
   * since the tilt itself is only a few degrees. */
  faceAnchor?: {cx: number; cy: number};
  /** Index into `regions` that a director-triggered gesture (see MythicShort's gestureTriggersFor
   * usage) takes over for its one-shot anticipation/action/settle arc — always the character's
   * most expressive free limb (a raised arm/hand), the region a viewer's eye would actually go to
   * for "is this character doing something with intent". Left unset for a character with no region
   * suited to carrying a gesture. */
  gestureRegionIndex?: number;
};

export const PUPPET_REGIONS: Record<string, PuppetEntry> = {
  'karna.master': {
    kind: 'character',
    faceAnchor: {cx: 45, cy: 18},
    gestureRegionIndex: 0,
    naturalWidth: 896,
    naturalHeight: 1584,
    regions: [
      // Raised left arm + star-tipped weapon (shoulder ~38%,36% up through the hand to the weapon
      // tip near the top-left). A soft sway reads as the weapon/arm gently moving, not rigid — and
      // this is also the character's gestureRegionIndex (0): the same region carries a director-
      // triggered reach/offer gesture on beats that call for it (see puppet-regions.ts's own
      // gestureRegionIndex doc and MythicShort's gestureTriggersFor).
      {cx: 30, cy: 30, radius: 22, strength: 2.5, motion: 'sway', speedHz: 0.22, phase: 0},
      // Flowing hair strands, lower-left of the head — already drawn mid-flow in the source art, so
      // a sway here should read as continuation of that same flow, not new motion out of nowhere.
      {cx: 18, cy: 45, radius: 20, strength: 3.2, motion: 'sway', speedHz: 0.32, phase: 1.4},
      // Lowered right arm + staff, mid-right of frame.
      {cx: 68, cy: 45, radius: 18, strength: 1.8, motion: 'sway', speedHz: 0.16, phase: 2.6},
      // Torso — very subtle idle breathing, the "the figure is alive even standing still" cue.
      {cx: 48, cy: 45, radius: 26, strength: 0.9, motion: 'breathe', speedHz: 0.12, phase: 0.5},
      // Lower dhoti/robe — the single largest static mass in the whole figure (roughly 55-90% of
      // frame height) with nothing else driving it; a slow sway reads as fabric stirring, the cheap
      // cue that sells "standing in a real place" rather than "a cutout pasted on a background".
      {cx: 45, cy: 78, radius: 20, strength: 1.4, motion: 'sway', speedHz: 0.1, phase: 3.6},
    ],
  },
  // Placed against public/generated/karna-kavacha-ui-short/indra_master-indra_master.png (896x1584)
  // with a 10%-grid overlay rendered over the real asset, same convention as karna.master above.
  'indra.master': {
    kind: 'character',
    faceAnchor: {cx: 40, cy: 20},
    gestureRegionIndex: 2,
    naturalWidth: 896,
    naturalHeight: 1584,
    regions: [
      // Crown feather plumes + gold wing ornament, upper-left of the headdress.
      {cx: 32, cy: 25, radius: 20, strength: 2.2, motion: 'sway', speedHz: 0.2, phase: 0.3},
      // Flowing black hair tresses, left side, cascading past the shoulder.
      {cx: 15, cy: 50, radius: 22, strength: 2.6, motion: 'sway', speedHz: 0.28, phase: 1.7},
      // Raised right arm + hand gripping the trident, right side of frame.
      {cx: 85, cy: 60, radius: 16, strength: 1.6, motion: 'sway', speedHz: 0.18, phase: 2.9},
      // Torso + orange shawl — subtle idle breathing.
      {cx: 40, cy: 57, radius: 26, strength: 0.9, motion: 'breathe', speedHz: 0.13, phase: 0.9},
      // Lower black/gold robe — same rationale as karna.master's lower-dhoti region: the largest
      // static mass in the figure, otherwise completely inert.
      {cx: 35, cy: 82, radius: 22, strength: 1.3, motion: 'sway', speedHz: 0.11, phase: 4.1},
    ],
  },
  // Placed against projects/shiva-neelkanth/assets/characters/shiva_master.png (896x1584), the
  // clean regenerated version — same 10%-grid convention as the other entries above.
  'shiva.master': {
    kind: 'character',
    faceAnchor: {cx: 48, cy: 18},
    gestureRegionIndex: 1,
    naturalWidth: 896,
    naturalHeight: 1584,
    regions: [
      // Matted hair (jata) piled at the crown, flowing down either side of the face.
      {cx: 48, cy: 22, radius: 18, strength: 1.8, motion: 'sway', speedHz: 0.15, phase: 0.2},
      // Raised left hand gripping the trishul — a soft sway reads as the weapon/arm gently alive.
      {cx: 18, cy: 42, radius: 16, strength: 2.0, motion: 'sway', speedHz: 0.2, phase: 1.6},
      // Torso + rudraksha beads — subtle idle breathing, the meditative "still but alive" cue this
      // character needs more than any other in this cast.
      {cx: 48, cy: 48, radius: 22, strength: 0.8, motion: 'breathe', speedHz: 0.1, phase: 0.4},
      // Lower dhoti + crossed legs — the largest static mass, otherwise completely inert.
      {cx: 48, cy: 68, radius: 24, strength: 1.2, motion: 'sway', speedHz: 0.09, phase: 3.2},
    ],
  },
  // Placed against projects/shiva-neelkanth/assets/characters/parvati_master.png (896x1584), the
  // clean regenerated version — same 10%-grid convention as the other entries above.
  'parvati.master': {
    kind: 'character',
    faceAnchor: {cx: 40, cy: 14},
    gestureRegionIndex: 2,
    naturalWidth: 896,
    naturalHeight: 1584,
    regions: [
      // Crown ornament at the top of the head.
      {cx: 40, cy: 12, radius: 14, strength: 1.4, motion: 'sway', speedHz: 0.18, phase: 0.6},
      // Flowing loose hair + braids down the left side — the single most prominent moving element
      // in this illustration, already drawn mid-flow.
      {cx: 18, cy: 55, radius: 28, strength: 2.8, motion: 'sway', speedHz: 0.26, phase: 2.1},
      // Raised hand reaching forward with urgency — the character's defining gesture.
      {cx: 15, cy: 42, radius: 16, strength: 1.8, motion: 'sway', speedHz: 0.22, phase: 3.4},
      // Torso + draped garment — subtle idle breathing.
      {cx: 50, cy: 58, radius: 24, strength: 1.0, motion: 'breathe', speedHz: 0.12, phase: 1.1},
    ],
  },
  // Environment ambient motion — placed against projects/shiva-neelkanth/assets/environments/
  // kailash_abode.png (896x1584). Broad, low-strength, slow regions (large radius, small strength,
  // low speedHz) read as drifting cloud/mist rather than a limb sway — the opposite tuning from a
  // character region, deliberately: a tight fast wobble here would look like the mountain itself is
  // trembling, not like weather moving past it.
  'kailash.abode': {
    kind: 'environment',
    naturalWidth: 896,
    naturalHeight: 1584,
    regions: [
      // The cloud band wrapping the mountain's base, roughly a third of the way down the frame.
      {cx: 50, cy: 48, radius: 42, strength: 1.6, motion: 'sway', speedHz: 0.05, phase: 0},
      // A secondary, smaller cloud cluster upper-left, phase-offset so it doesn't drift in lockstep
      // with the main band.
      {cx: 18, cy: 38, radius: 22, strength: 1.3, motion: 'sway', speedHz: 0.07, phase: 2.4},
      // Faint shimmer across the snow peak itself — very subtle, "moonlight catching snow" rather
      // than the mountain moving.
      {cx: 50, cy: 22, radius: 26, strength: 0.6, motion: 'breathe', speedHz: 0.08, phase: 1.2},
    ],
  },
  // Environment ambient motion — placed against projects/shiva-neelkanth/assets/environments/
  // cosmic_ocean_churning.png (896x1584).
  'cosmic_ocean.churning': {
    kind: 'environment',
    naturalWidth: 896,
    naturalHeight: 1584,
    regions: [
      // The water surface across the lower half of the frame — broad and slow, real wave motion
      // rather than the localized flick a character region uses.
      {cx: 50, cy: 82, radius: 45, strength: 2.0, motion: 'sway', speedHz: 0.12, phase: 0},
      // The serpent's coiled body wound around Mandara, mid-right of frame — a tighter, slightly
      // faster sway since it's a living creature straining under tension, not open water.
      {cx: 65, cy: 55, radius: 22, strength: 1.6, motion: 'sway', speedHz: 0.18, phase: 1.8},
      // A second water region lower-left, phase-offset from the first so the whole ocean doesn't
      // pulse as one uniform sheet.
      {cx: 22, cy: 88, radius: 30, strength: 1.7, motion: 'sway', speedHz: 0.1, phase: 3.1},
    ],
  },
};
