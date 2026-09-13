# Credits

## getByteRush

**KATHAAYA is built by getByteRush.**

---

## Who actually runs and creates a KATHAAYA movie

KATHAAYA doesn't have a traditional studio roster — it's an AI-native production system, so "who
makes the movie" is a set of disciplines the pipeline embodies rather than a list of job titles.
Two tiers, kept honest about what's real today versus what the architecture is built toward:

### Proven in production — the roles that have actually shipped a real, rendered movie

These are not aspirational. Every one of them has caught a real defect in a real rendered frame at
some point in this project's history (see `docs/STATUS.md`/`docs/PROGRESS.md` for the evidence
trail) — see `docs/AI_ENGINEERING_SQUAD.md` for the full operating rules each one follows.

- **Animation Systems Architect** — owns the Remotion lifecycle, deterministic rendering, coordinate
  transforms and object-fit/position, and the boundary between construction strokes and final
  pigment artwork.
- **Visual Director** — reviews rendered frames as a human viewer would, not just the code. The
  final authority on whether the protagonist reads early, whether a composition is intentional, and
  whether a shot is genuinely wide/close/detail or just a different zoom number.
- **Implementation Engineer** — makes the smallest correct change at the actual source-of-truth
  layer, never a test-only patch or a symptom fix that just moves the failure later.
- **Visual QA / Release Gate** — the rule that makes all three roles above matter: CI passing is
  necessary but never sufficient. When implementation and rendered evidence disagree, **rendered
  evidence wins.**

### The rest of the pipeline (spec-defined, partially built)

The fuller `TOPIC → RESEARCH → CANON VALIDATION → STORY → SCREENPLAY → SCENE PLAN → SHOT PLAN →
VISUAL BIBLE → ASSET PLAN → ANIMATION PLAN → CHARACTER/ENVIRONMENT ART → 2D ANIMATION → HINDI VOICE
→ MUSIC/SFX → REMOTION COMPOSITING → RENDER → VISUAL QA → AUTOMATIC FIX/RETRY → FINAL MOVIE` chain
KATHAAYA is being built toward. Some of these already exist as real, working code (Asset Director →
`src/generate-assets.ts` + the asset-reuse/classification system; TTS Provider → Chatterbox and
VibeVoice Hindi 7B via `src/pipeline/tts-provider.ts`; Remotion Renderer → the compositor itself;
Visual QA → `src/generate-visual-qa.ts`/`check-output.ts`). Others (a dedicated Research Agent, Canon
Validation, an automated Story Architect / Screenplay Agent, a fully closed-loop Automatic Fix/Retry
cycle) are still structured intent, not yet a shipped stage — see `docs/STATUS.md`'s own honest
"not started" list rather than this file claiming otherwise.

---

*This file credits disciplines and the studio building them, not named individuals, because that's
the accurate picture of how this project has actually been built so far. If that should change,
update this file the same way the rest of the project's documentation works: only claim what's
real.*
