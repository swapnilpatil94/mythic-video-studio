/**
 * Per-beat "cinematographer" presets, keyed by the manifest's existing `visual_role` field
 * (no manifest schema change). Each preset picks which region of a full-body master-asset
 * image to feature (cover-fit + zoom + focus point), so the same master asset reads as a
 * different shot in every beat instead of the same full-body pose repeating. Role names here
 * are generic story-grammar beats (hook/stakes/decision/sacrifice/reveal/payoff...), not specific
 * to any one myth — a manifest for a different story supplies its own `visual_role` values per
 * beat, and unrecognized ones fall through to a rotating set of generic archetypes below so
 * variety doesn't depend on the story happening to reuse this exact vocabulary.
 */
export type ShotPreset = {
  /** Extra zoom applied on top of a cover-fit crop. 1 = character roughly fills the frame. */
  zoom: number;
  /** Vertical focus point, 0 (top/head) - 100 (bottom/feet). */
  focusY: number;
  /** Horizontal focus point, 0 (left) - 100 (right). Deliberately off-center (rule-of-thirds-ish)
   * on most presets — a single-character shot with no explicit focusX otherwise defaults to dead
   * center, which is what made every solo shot read as a static portrait card. */
  focusX: number;
  /** Human-readable label for logs/debugging only. */
  label: string;
};

const SHOT_BY_ROLE: Record<string, ShotPreset> = {
  hook: {zoom: 1.0, focusY: 40, focusX: 42, label: 'wide'},
  armor_reveal: {zoom: 1.55, focusY: 33, focusX: 58, label: 'chest/armor'},
  stakes: {zoom: 1.4, focusY: 22, focusX: 40, label: 'face'},
  threat: {zoom: 0.98, focusY: 42, focusX: 58, label: 'wide'},
  visitor_reveal: {zoom: 1.25, focusY: 28, focusX: 32, label: 'entrance'},
  request: {zoom: 1.28, focusY: 34, focusX: 50, label: 'two-shot'},
  decision: {zoom: 1.48, focusY: 20, focusX: 45, label: 'face'},
  sacrifice: {zoom: 1.5, focusY: 42, focusX: 62, label: 'hand/detail'},
  reveal: {zoom: 1.05, focusY: 30, focusX: 50, label: 'wide two-shot'},
  payoff: {zoom: 0.96, focusY: 38, focusX: 46, label: 'wide'},
};

/** Generic shot archetypes (face / chest / hand-detail / wide) cycled by appearance order for
 * any `visual_role` not in the curated table above, so an unfamiliar story's beat vocabulary
 * still gets real shot variety instead of one flat default crop repeated every beat. */
const GENERIC_ROTATION: ShotPreset[] = [
  {zoom: 1.0, focusY: 40, focusX: 44, label: 'wide'},
  {zoom: 1.5, focusY: 32, focusX: 56, label: 'chest'},
  {zoom: 1.42, focusY: 20, focusX: 40, label: 'face'},
  {zoom: 1.5, focusY: 45, focusX: 60, label: 'hand/detail'},
];

// Hard ceiling: even combined with the (dampened) camera-preset scale in MythicShort's
// FramedLayer, this keeps a crop from zooming past the character's own art into blank
// margin/fabric, which renders as "nothing there" rather than an intentional close-up.
// Raised from 1.65 now that `ShotFrameTreatment`'s vignette/loupe masks hide any crop edge past
// the character's own art at the tightest "close"/"detail" shots — real headroom for scale
// contrast that the plain-rectangle crop couldn't previously get away with.
const MAX_ZOOM = 1.78;

/**
 * `variant` (e.g. how many times this character has already appeared) nudges zoom/focus a little
 * so two beats that land on the same role — or the same generic fallback slot — don't produce
 * pixel-identical framing back to back. focusX alternates sides by variant parity so a repeat
 * appearance reads as a different angle on the same master art, not the same crop again.
 */
export function shotFor(role: string, variant = 0): ShotPreset {
  const base = SHOT_BY_ROLE[role] ?? GENERIC_ROTATION[variant % GENERIC_ROTATION.length];
  const jitterZoom = base.zoom + (variant % 3 === 1 ? 0.08 : variant % 3 === 2 ? -0.06 : 0);
  const jitterFocus = base.focusY + (variant % 2 === 1 ? 5 : -4);
  const jitterFocusX = base.focusX + (variant % 2 === 1 ? 9 : -9);
  return {
    ...base,
    zoom: Math.min(jitterZoom, MAX_ZOOM),
    focusY: Math.max(10, Math.min(70, jitterFocus)),
    focusX: Math.max(22, Math.min(78, jitterFocusX)),
  };
}

/**
 * Per-beat "shot list": 2-3 crops of the SAME master asset that a character's layer cuts between
 * within a single beat, mimicking real coverage (a wide/establishing framing, then a reaction or
 * hand/weapon/eyes detail) instead of one static crop held for the whole beat. This is what makes
 * a beat read as several directed shots rather than one reveal-then-hold: no new image generation,
 * just different windows into the existing full-body master. Ordered roughly establishing -> tight
 * reaction/detail -> resolution, matching how the role's narrative beat actually plays out.
 */
const SUB_SHOTS_BY_ROLE: Record<string, ShotPreset[]> = {
  hook: [{zoom: 0.98, focusY: 42, focusX: 38, label: 'wide-entrance'}, {zoom: 1.4, focusY: 20, focusX: 60, label: 'face-reaction'}],
  armor_reveal: [
    {zoom: 1.12, focusY: 35, focusX: 60, label: 'chest-wide'},
    {zoom: 1.6, focusY: 30, focusX: 55, label: 'armor-detail'},
    {zoom: 1.35, focusY: 18, focusX: 42, label: 'face-reaction'},
  ],
  stakes: [
    {zoom: 1.02, focusY: 38, focusX: 40, label: 'wide'},
    {zoom: 1.35, focusY: 20, focusX: 62, label: 'face'},
    {zoom: 1.72, focusY: 16, focusX: 48, label: 'eyes'},
  ],
  threat: [{zoom: 0.95, focusY: 44, focusX: 62, label: 'wide'}, {zoom: 1.3, focusY: 22, focusX: 38, label: 'face-reaction'}],
  visitor_reveal: [{zoom: 1.1, focusY: 30, focusX: 28, label: 'entrance-wide'}, {zoom: 1.4, focusY: 18, focusX: 58, label: 'face'}],
  request: [
    {zoom: 1.18, focusY: 36, focusX: 50, label: 'two-shot'},
    {zoom: 1.48, focusY: 44, focusX: 65, label: 'hand-gesture'},
    {zoom: 1.35, focusY: 20, focusX: 40, label: 'face-reaction'},
  ],
  decision: [
    {zoom: 1.3, focusY: 22, focusX: 44, label: 'face'},
    {zoom: 1.75, focusY: 16, focusX: 56, label: 'eyes-close'},
    {zoom: 1.3, focusY: 22, focusX: 40, label: 'face-resolve'},
  ],
  sacrifice: [
    {zoom: 1.55, focusY: 44, focusX: 60, label: 'hand-detail'},
    {zoom: 1.15, focusY: 32, focusX: 38, label: 'chest-wide'},
    {zoom: 1.35, focusY: 18, focusX: 55, label: 'face'},
  ],
  reveal: [{zoom: 1.0, focusY: 30, focusX: 42, label: 'wide-two-shot'}, {zoom: 1.4, focusY: 18, focusX: 62, label: 'face'}],
  payoff: [{zoom: 0.95, focusY: 40, focusX: 45, label: 'wide'}, {zoom: 1.25, focusY: 20, focusX: 58, label: 'face-settle'}],
  // These five roles previously had no curated entry and fell to the generic rotation — most
  // visibly, `T2`'s `loyalty` landing on a similarly wide framing to `T1`'s `decision` at the same
  // point in their beats, reading as a near-repeat of the same shot. Each below is deliberately a
  // different shot-kind SEQUENCE from its narrative neighbors, not just different numbers.
  rescue: [
    {zoom: 0.96, focusY: 44, focusX: 40, label: 'wide'},
    {zoom: 1.5, focusY: 46, focusX: 62, label: 'hand-detail'},
    {zoom: 1.3, focusY: 20, focusX: 45, label: 'face'},
  ],
  rejection: [
    {zoom: 1.05, focusY: 32, focusX: 58, label: 'chest-wide'},
    {zoom: 1.38, focusY: 20, focusX: 40, label: 'face'},
    {zoom: 1.3, focusY: 22, focusX: 55, label: 'face-resolve'},
  ],
  elevation: [
    {zoom: 1.08, focusY: 30, focusX: 30, label: 'entrance-wide'},
    {zoom: 1.2, focusY: 34, focusX: 60, label: 'chest-wide'},
    {zoom: 1.32, focusY: 18, focusX: 45, label: 'face'},
  ],
  abandonment: [
    {zoom: 0.94, focusY: 42, focusX: 42, label: 'wide'},
    {zoom: 1.48, focusY: 48, focusX: 58, label: 'hand-detail'},
    {zoom: 1.36, focusY: 18, focusX: 40, label: 'face'},
  ],
  // Deliberately opens medium (not wide, unlike T1/`decision`) so the two beats read as different
  // shot grammar even though they share a setting and both eventually punch into a face.
  loyalty: [
    {zoom: 1.18, focusY: 34, focusX: 58, label: 'chest-wide'},
    {zoom: 1.4, focusY: 20, focusX: 42, label: 'face'},
    {zoom: 0.98, focusY: 40, focusX: 48, label: 'wide'},
  ],
};

/** Generic 2-shot sequences (wide->face, chest->hand-detail, face->eyes) rotated by `variant` for
 * an unfamiliar `visual_role`, so any story's beats still get real within-beat shot variety. */
const GENERIC_SUB_SEQUENCES: ShotPreset[][] = [
  [{zoom: 1.0, focusY: 40, focusX: 40, label: 'wide'}, {zoom: 1.35, focusY: 20, focusX: 60, label: 'face'}],
  [{zoom: 1.48, focusY: 32, focusX: 58, label: 'chest'}, {zoom: 1.48, focusY: 45, focusX: 40, label: 'hand-detail'}],
  [{zoom: 1.35, focusY: 20, focusX: 42, label: 'face'}, {zoom: 1.72, focusY: 16, focusX: 58, label: 'eyes'}],
];

/** Same variant-jitter as `shotFor`, applied across every shot in the sequence. */
export function subShotSequence(role: string, variant = 0): ShotPreset[] {
  const base = SUB_SHOTS_BY_ROLE[role] ?? GENERIC_SUB_SEQUENCES[variant % GENERIC_SUB_SEQUENCES.length];
  return base.map((s) => {
    const jitterZoom = s.zoom + (variant % 3 === 1 ? 0.05 : variant % 3 === 2 ? -0.05 : 0);
    const jitterFocus = s.focusY + (variant % 2 === 1 ? 3 : -3);
    const jitterFocusX = s.focusX + (variant % 2 === 1 ? 6 : -6);
    return {
      ...s,
      zoom: Math.min(jitterZoom, MAX_ZOOM),
      focusY: Math.max(10, Math.min(70, jitterFocus)),
      focusX: Math.max(22, Math.min(78, jitterFocusX)),
    };
  });
}

/** A short, large-type Hindi keyword per beat role — a last-resort fallback only, used when
 * Whisper alignment isn't available so there's no real spoken text to pull a keyword from. */
const KEYWORD_BY_ROLE: Record<string, string> = {
  hook: 'रहस्य',
  armor_reveal: 'कवच',
  stakes: 'नियति',
  threat: 'युद्ध',
  visitor_reveal: 'आगंतुक',
  request: 'याचना',
  decision: 'धर्मसंकट',
  sacrifice: 'त्याग',
  reveal: 'सत्य',
  payoff: 'धर्म',
};

export function keywordFor(role: string): string | undefined {
  return KEYWORD_BY_ROLE[role];
}

// Short, high-frequency Hindi function words — excluded when picking the "important" word out of
// real speech so the kinetic flourish lands on a content word (a noun/concept) instead of a
// grammatical particle that happens to be a similar length.
const STOPWORDS = new Set([
  'और', 'से', 'को', 'है', 'था', 'थे', 'थी', 'कि', 'जो', 'यह', 'वह', 'में', 'पर', 'ने', 'का', 'के', 'की',
  'हुए', 'हुआ', 'भी', 'तो', 'ही', 'एक', 'अपने', 'अपना', 'उसे', 'उसके', 'उसकी', 'उस', 'यही', 'वही',
]);

const TRAILING_PUNCT = /[।,.!?"'()]+$/;

/**
 * Picks the most salient real word spoken in this beat (longest content word, ties broken by
 * first occurrence) directly from Whisper's word-level alignment — this is what drives both the
 * keyword flourish and the kinetic-caption emphasis, so "important word" is discovered from the
 * actual narration of whatever story a manifest tells, never a fixed per-story vocabulary table.
 */
export function importantWordFor<T extends {word: string}>(words: T[]): T | undefined {
  let best: T | undefined;
  let bestLen = 0;
  for (const w of words) {
    const clean = w.word.replace(TRAILING_PUNCT, '');
    if (clean.length < 3 || STOPWORDS.has(clean)) continue;
    if (clean.length > bestLen) {
      best = w;
      bestLen = clean.length;
    }
  }
  return best;
}
