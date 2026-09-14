/**
 * The reusable character-state vocabulary the director layer (shots.ts's gestureTriggersFor/
 * gestureStyleFor, MythicShort.tsx's state-cutaway handling) maps a beat's `visual_role` and
 * `state_cutaway` onto. This file is the formal, documented home for that vocabulary — it doesn't
 * replace shots.ts's role-matching functions (which stay where the rest of the director-default
 * logic already lives, to avoid destabilizing tested code for the sake of moving it), it names and
 * explains the states/transitions those functions are actually implementing, and is where a NEW
 * story's manifest author should look to understand what's available.
 *
 * Nothing here is mythology-specific. A cartoon character going through "focused work -> a tool
 * breaks -> surprise -> resolve -> back to work" uses exactly the same states as Ganesha writing.
 *
 * HOW THIS ENGINE ACTUALLY REALIZES EACH STATE — stated plainly, not aspirationally:
 *   - A POSE-level state change (the character looks meaningfully different — a different hand
 *     position, a different expression, a different body orientation) requires a DIFFERENT
 *     character-art asset. A flat raster illustration plus a displacement-warp nudge cannot
 *     synthesize a genuinely new pose; there is no skeletal rig in this engine deforming one
 *     source image into another (that is exactly what Synfig would offer, and exactly why it
 *     remains an explicit future backend rather than a promise — see character/synfig-backend.ts's
 *     own doc for the concrete reason it isn't safely usable in this project's environment today).
 *   - A MOTION-level state change (the same pose, but now visibly doing something — writing,
 *     reaching) is realized by CutoutPuppet's region-based displacement warp: an 'arc' one-shot
 *     gesture for a single decisive action, or a 'write'-shape sustained gesture (two regions,
 *     hand + forearm, moving together) for an ongoing repeated activity. See CutoutPuppet.tsx.
 *   - A same-beat state SEQUENCE (the character starts a beat in one pose and a story event mid-
 *     beat changes them to another, WITHOUT this being a full separate beat/shot of its own) is
 *     `state_cutaway` on a manifest beat — see MythicShort.tsx's own handling.
 */

/** The state graph this engine's states.md-equivalent example walks through, generalized past any
 * one story. Each is realized by SOME combination of {a specific character-art asset} + {a gesture
 * shape} + {camera/lighting emphasis} — see the module doc above for which combination does what. */
export type CharacterState =
  | 'idle' // ambient sway/breathe only, no directed motion, no story event driving it
  | 'active' // a sustained, directed activity is underway ('write'-shape gesture)
  | 'accelerating' // the same activity, camera/pacing intensifying (still 'write'-shape; the
  // escalation reads through cut rhythm and camera, not a different motion primitive)
  | 'interrupted' // the activity has just stopped — realized via state_cutaway to a distinct pose,
  // not a continuation of the same asset with motion merely halted
  | 'reacting' // a held emotional beat on a distinct reaction-pose asset
  | 'deciding' // the reaction resolves into resolve/intent — same or a further distinct asset,
  // typically paired with an 'arc' one-shot gesture for the moment of commitment
  | 'acting' // performing the decisive action itself ('arc' gesture on a distinct asset)
  | 'resolved'; // calm aftermath — ambient idle again, often on yet another distinct asset if the
  // action left a lasting visible change (e.g. this story's ganesha.broken)

export type GestureShape = 'arc' | 'write';

/**
 * A mid-beat pose change: the beat's primary single character renders as `until.length` reveals
 * `ref` normally starts (or continues from an earlier appearance — asset_continuity still applies)
 * and then, at beat-local progress `at`, swaps to `ref` for the remainder of the beat. This is what
 * makes a state TRANSITION (not just a state) visible within one continuous shot — confirmed
 * necessary directly: without it, this project's own "tool breaks" beat had no way to show a pose
 * actually changing at the moment of the break, only a hard cut to the NEXT beat's own asset,
 * which read as "the break happened between shots" rather than "the break caused this character to
 * visibly react". Deliberately scoped to the single-character case (mirrors MythicShort's own
 * single-vs-two-character branching) — a beat already showing two characters side by side has a
 * different framing problem a mid-beat swap wouldn't solve cleanly.
 */
export type StateCutaway = {
  ref: string;
  /** Beat-local 0..1 progress at which the swap happens. */
  at: number;
};
