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
  /** Human-readable label for logs/debugging only. */
  label: string;
};

const SHOT_BY_ROLE: Record<string, ShotPreset> = {
  hook: {zoom: 1.08, focusY: 40, label: 'wide'},
  armor_reveal: {zoom: 1.42, focusY: 33, label: 'chest/armor'},
  stakes: {zoom: 1.28, focusY: 22, label: 'face'},
  threat: {zoom: 1.05, focusY: 42, label: 'wide'},
  visitor_reveal: {zoom: 1.2, focusY: 28, label: 'entrance'},
  request: {zoom: 1.28, focusY: 34, label: 'two-shot'},
  decision: {zoom: 1.34, focusY: 20, label: 'face'},
  sacrifice: {zoom: 1.4, focusY: 42, label: 'hand/detail'},
  reveal: {zoom: 1.12, focusY: 30, label: 'wide two-shot'},
  payoff: {zoom: 1.02, focusY: 38, label: 'wide'},
};

/** Generic shot archetypes (face / chest / hand-detail / wide) cycled by appearance order for
 * any `visual_role` not in the curated table above, so an unfamiliar story's beat vocabulary
 * still gets real shot variety instead of one flat default crop repeated every beat. */
const GENERIC_ROTATION: ShotPreset[] = [
  {zoom: 1.08, focusY: 40, label: 'wide'},
  {zoom: 1.4, focusY: 32, label: 'chest'},
  {zoom: 1.3, focusY: 20, label: 'face'},
  {zoom: 1.38, focusY: 45, label: 'hand/detail'},
];

// Hard ceiling: even combined with the (dampened) camera-preset scale in MythicShort's
// FramedLayer, this keeps a crop from zooming past the character's own art into blank
// margin/fabric, which renders as "nothing there" rather than an intentional close-up.
const MAX_ZOOM = 1.45;

/**
 * `variant` (e.g. how many times this character has already appeared) nudges zoom/focus a little
 * so two beats that land on the same role — or the same generic fallback slot — don't produce
 * pixel-identical framing back to back.
 */
export function shotFor(role: string, variant = 0): ShotPreset {
  const base = SHOT_BY_ROLE[role] ?? GENERIC_ROTATION[variant % GENERIC_ROTATION.length];
  const jitterZoom = base.zoom + (variant % 3 === 1 ? 0.05 : variant % 3 === 2 ? -0.04 : 0);
  const jitterFocus = base.focusY + (variant % 2 === 1 ? 3 : -2);
  return {...base, zoom: Math.min(jitterZoom, MAX_ZOOM), focusY: Math.max(10, Math.min(70, jitterFocus))};
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
  hook: [{zoom: 1.05, focusY: 42, label: 'wide-entrance'}, {zoom: 1.32, focusY: 20, label: 'face-reaction'}],
  armor_reveal: [
    {zoom: 1.15, focusY: 35, label: 'chest-wide'},
    {zoom: 1.48, focusY: 30, label: 'armor-detail'},
    {zoom: 1.3, focusY: 18, label: 'face-reaction'},
  ],
  stakes: [
    {zoom: 1.1, focusY: 38, label: 'wide'},
    {zoom: 1.3, focusY: 20, label: 'face'},
    {zoom: 1.42, focusY: 16, label: 'eyes'},
  ],
  threat: [{zoom: 1.02, focusY: 44, label: 'wide'}, {zoom: 1.26, focusY: 22, label: 'face-reaction'}],
  visitor_reveal: [{zoom: 1.18, focusY: 30, label: 'entrance-wide'}, {zoom: 1.36, focusY: 18, label: 'face'}],
  request: [
    {zoom: 1.22, focusY: 36, label: 'two-shot'},
    {zoom: 1.4, focusY: 44, label: 'hand-gesture'},
    {zoom: 1.3, focusY: 20, label: 'face-reaction'},
  ],
  decision: [
    {zoom: 1.28, focusY: 22, label: 'face'},
    {zoom: 1.44, focusY: 16, label: 'eyes-close'},
    {zoom: 1.28, focusY: 22, label: 'face-resolve'},
  ],
  sacrifice: [
    {zoom: 1.42, focusY: 44, label: 'hand-detail'},
    {zoom: 1.2, focusY: 32, label: 'chest-wide'},
    {zoom: 1.3, focusY: 18, label: 'face'},
  ],
  reveal: [{zoom: 1.1, focusY: 30, label: 'wide-two-shot'}, {zoom: 1.32, focusY: 18, label: 'face'}],
  payoff: [{zoom: 1.0, focusY: 40, label: 'wide'}, {zoom: 1.22, focusY: 20, label: 'face-settle'}],
};

/** Generic 2-shot sequences (wide->face, chest->hand-detail, face->eyes) rotated by `variant` for
 * an unfamiliar `visual_role`, so any story's beats still get real within-beat shot variety. */
const GENERIC_SUB_SEQUENCES: ShotPreset[][] = [
  [{zoom: 1.08, focusY: 40, label: 'wide'}, {zoom: 1.3, focusY: 20, label: 'face'}],
  [{zoom: 1.4, focusY: 32, label: 'chest'}, {zoom: 1.38, focusY: 45, label: 'hand-detail'}],
  [{zoom: 1.3, focusY: 20, label: 'face'}, {zoom: 1.44, focusY: 16, label: 'eyes'}],
];

/** Same variant-jitter as `shotFor`, applied across every shot in the sequence. */
export function subShotSequence(role: string, variant = 0): ShotPreset[] {
  const base = SUB_SHOTS_BY_ROLE[role] ?? GENERIC_SUB_SEQUENCES[variant % GENERIC_SUB_SEQUENCES.length];
  return base.map((s) => {
    const jitterZoom = s.zoom + (variant % 3 === 1 ? 0.03 : variant % 3 === 2 ? -0.03 : 0);
    const jitterFocus = s.focusY + (variant % 2 === 1 ? 2 : -2);
    return {...s, zoom: Math.min(jitterZoom, MAX_ZOOM), focusY: Math.max(10, Math.min(70, jitterFocus))};
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
