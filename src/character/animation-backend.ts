/**
 * The character-animation abstraction KATHAAYA's director layer talks to. Two implementations
 * exist (see cutout-puppet-backend.ts and synfig-backend.ts) precisely so the rest of the pipeline
 * — the action system, the rig schema, the pipeline steps that call this — never has to know or
 * care which one actually moved a character's parts. That's the whole point of the interface: a
 * future character whose master art is authored as proper vector cutout layers (not a single flat
 * raster illustration, which is all this project's FLUX-generated assets currently are) could get
 * a real Synfig-driven rig without touching a single caller.
 *
 * Every type here is intentionally generic — no `shiva`/`karna`/`mythology` anywhere in this file.
 * Story-specific behavior belongs in the manifest data and in shots.ts's role-keyed defaults, never
 * in this contract.
 */

export type BodyPart =
  | 'head' | 'face' | 'eyes' | 'hair' | 'neck' | 'torso'
  | 'upper_arm' | 'lower_arm' | 'hand'
  | 'upper_leg' | 'lower_leg' | 'foot'
  | 'clothing' | 'weapon' | 'accessory';

/** A single point of articulation on a character's master art. Percent-of-image coordinates
 * (0-100), the same convention puppet-regions.ts already uses for its displacement regions — so an
 * existing hand-authored region can be reinterpreted as a rig anchor without re-measuring anything
 * against the source art. */
export type RigAnchor = {
  id: string;
  part: BodyPart;
  x: number;
  y: number;
};

/** An optional parent/child relationship between two anchors, for a backend that can actually use
 * bone hierarchies (Synfig can; a pure displacement-region system like CutoutPuppet has no notion
 * of bone parenting and simply ignores this). Not every rig needs bones — a rig can be anchors-only
 * and still drive independent per-region motion. */
export type RigBone = {
  id: string;
  fromAnchor: string;
  toAnchor: string;
};

export type RigDefinition = {
  characterId: string;
  naturalWidth: number;
  naturalHeight: number;
  anchors: RigAnchor[];
  bones: RigBone[];
};

/** The reusable action vocabulary — see docs on each group below. Kept flat (one string union)
 * rather than nested per-category, since a caller picking an action for a beat wants to reason
 * about "which one action fits this moment", not navigate a category tree first. */
export type CharacterActionKind =
  // idle
  | 'idle' | 'breathing' | 'blink' | 'micro_shift'
  // head / face
  | 'look_left' | 'look_right' | 'look_up' | 'look_down' | 'head_tilt' | 'head_turn' | 'nod' | 'shake_head' | 'gaze_shift'
  // gestures
  | 'raise_hand' | 'lower_hand' | 'point' | 'reach' | 'open_hand' | 'close_hand' | 'gesture_forward' | 'gesture_back'
  // physical
  | 'stand' | 'sit' | 'kneel' | 'turn' | 'recoil' | 'step_back' | 'lean' | 'settle'
  // cinematic
  | 'anticipation' | 'impact' | 'reaction' | 'hero_pose' | 'dramatic_turn' | 'slow_reveal';

export type Easing = 'linear' | 'ease_in_out' | 'anticipation_settle';

export type CharacterAction = {
  kind: CharacterActionKind;
  /** Which rig anchor this action primarily drives, when the action is localized (a gesture, a
   * head turn). Idle/breathing-type actions usually omit this and apply across the whole rig. */
  anchorId?: string;
  /** 0..1. Kept small by convention (per the spec this whole system serves: "KATHAAYA movement is
   * restrained and cinematic", not cartoon-exaggerated) — callers should default well under 1. */
  intensity?: number;
  durationSeconds?: number;
  easing?: Easing;
};

export type AnimationClip = {
  characterId: string;
  fps: number;
  durationSeconds: number;
  actions: CharacterAction[];
};

/**
 * What `renderAnimation` hands back. Two shapes because the two backends genuinely produce
 * different kinds of thing, and pretending otherwise would be the "fake it" this project's own
 * spec explicitly rules out:
 *  - 'live-rig': no file gets written. The backend hands back rig data a React component
 *    interprets live, per-frame, inside the Remotion render itself (this is what CutoutPuppet
 *    always did, before this abstraction existed — see cutout-puppet-backend.ts).
 *  - 'rendered-file': an actual pre-rendered artifact on disk (an image sequence, in Synfig's
 *    case) that a later compositing step loads, the way a real offline character-animation render
 *    would work.
 */
export type AnimationArtifact =
  | {
      kind: 'live-rig';
      regions: Array<{cx: number; cy: number; radius: number; strength: number; motion: 'sway' | 'breathe' | 'arc'; speedHz?: number; phase?: number}>;
      naturalWidth: number;
      naturalHeight: number;
      gestureRegionIndex?: number;
    }
  | {
      kind: 'rendered-file';
      /** Directory containing the rendered frames (PNG sequence) or a single video file, depending
       * on `format`. */
      path: string;
      format: 'png-sequence' | 'mov';
      frameCount?: number;
    };

export interface CharacterAnimationBackend {
  /** Derive (or look up) a rig for a character from its master art. `hint` lets a caller that
   * already knows anchor placement (e.g. adapting an existing hand-authored puppet-regions.ts
   * entry) skip any auto-derivation the backend would otherwise attempt. */
  prepareRig(characterId: string, masterAssetPath: string, hint?: Partial<RigDefinition>): Promise<RigDefinition>;
  /** Turn a director's action list into a concrete, timed clip against a specific rig. Pure data —
   * no rendering happens here, so this is cheap to call speculatively or re-call with a different
   * action list for the same rig. */
  generateAnimation(rig: RigDefinition, actions: CharacterAction[], durationSeconds: number, fps: number): Promise<AnimationClip>;
  renderAnimation(rig: RigDefinition, clip: AnimationClip, masterAssetPath: string): Promise<AnimationArtifact>;
}
