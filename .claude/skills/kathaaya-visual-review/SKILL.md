---
name: kathaaya-visual-review
description: Use this whenever working on KATHAAYA's (mythic-video-studio) Remotion compositor or drawing/animation engine — any file under src/remotion/ (MythicShort.tsx, InkConstructionOverlay.tsx, artwork-construction.tsx, ProductionDrawingTest.tsx, DrawingStageTest.tsx, and friends), or anything touching shot composition, camera motion, the ink-construction/drawing reveal, or master-artwork compositing. Load this before making a visual change and before declaring one done — this project has two real, documented incidents of a static check passing while the actual rendered video was still broken, so treat a passing TypeScript build or a passing check-drawing-acceptance.ts run as necessary but never sufficient proof. Trigger this even if the user only asks to "fix" or "improve" something visual without naming this skill — e.g. "the drawing looks wrong", "make the protagonist show up earlier", "there's a weird boundary in the render", "the shot doesn't read as wide/close", "add camera movement", or any request to touch the compositor.
---

# KATHAAYA visual review

## Why this exists

Two real bugs shipped past a passing `npm run check:drawing-acceptance` and a clean `tsc --noEmit`
in this project's own history: a hard rectangular seam around master artwork (a CSS blend-mode
"fix" that only worked by coincidence, depending on what happened to be behind the master at
render time), and a double-`mapPoint()` call that collapsed nearly every construction stroke onto
one small blob — invisible in the code, invisible in a static check, and only found by rendering
the real video and looking at real frames at multiple timestamps. Both are documented in
`docs/STATUS.md`'s most recent milestone entries with the full diagnostic trail. This skill exists
so that history doesn't repeat: it packages the operating discipline this project's own
`docs/AI_ENGINEERING_SQUAD.md` already defines, so it gets followed by default instead of
re-derived (or skipped) each session.

**The one rule everything else here serves**: when the implementation and the rendered evidence
disagree, the rendered evidence wins. A visual change is not done because the code looks right or
a checker passed — it's done when the actual rendered frames show the intended behavior.

## The four roles

Read `docs/AI_ENGINEERING_SQUAD.md` in full before significant compositor work — it's short, and
it's the actual source of truth this skill summarizes. The short version:

1. **Animation Systems Architect** — owns the Remotion lifecycle, deterministic rendering,
   coordinate transforms, `object-fit`/`object-position`, SVG transforms and raster fallback, and
   the separation between construction strokes and final pigment artwork. Rejects CSS/mask reveals
   presented as real drawing, generic geometry standing in for source artwork, and timing fixes
   that just move the failure to a different frame.
2. **Visual Director** — reviews the rendered frames as a human viewer, not the TypeScript. The
   target sequence for any drawing/reveal work is `blank parchment -> construction guide ->
   recognizable protagonist -> denser authored linework -> restrained color wash -> finished
   illustration`, and the protagonist must read early — environment detail is support, not the
   lead. Rejects late protagonist reveal, blank-frame gaps, generic scribbles, hard rectangular
   artwork boundaries, and unintentional duplicate lines/ghosting/leftover construction artifacts.
3. **Implementation Engineer** — owns the smallest correct architectural change, in the
   renderer/source-of-truth layer, not a test-only special case. Before changing code: inspect the
   current render artifact, identify the *actual* failure mechanism (not the first plausible guess
   — see "How to actually diagnose a visual bug" below), and keep working in the existing
   branch/PR rather than spinning up a parallel fix branch. After changing code: typecheck, run the
   static acceptance checks, render both drawing proofs, inspect frames at early/middle/wash/final
   timestamps, and repeat until the visual behavior is actually present — not just plausible.
4. **Visual QA / Release Gate** — CI passing is necessary but not sufficient. Before calling
   anything done, walk the checklist in `docs/AI_ENGINEERING_SQUAD.md` (construction layer is real
   independently-animated SVG paths; paths derive from authored geometry when available; the
   protagonist is recognizable before pigment wash; construction progresses continuously with no
   reset; no visible rectangular source-paper boundary; the master and construction transforms stay
   aligned; both `DrawingStageTest` and `ProductionDrawingTest` pass) — and confirm it against the
   rendered artifact, not from memory of what the code should do.

## The render -> inspect -> fix -> rerender loop

This is the actual, proven workflow — not aspirational. Do this for any change that touches what
gets drawn on screen, no matter how small or "obviously correct" it looks in the diff:

1. **Render the real composition.** Not a snippet, not a mental simulation —
   `npx remotion render src/remotion/index.ts <CompositionName> <output>.mp4`, or this project's
   own `npm run render:drawing-test` / `npm run render:production-drawing-test` for the two drawing
   proof compositions. For the raster-master path specifically, don't only test against
   `test-assets/kathaya-master-fallback.svg` — that fallback SVG has a simple, hand-authored
   structure that can mask bugs specific to real, detailed raster masters (both real incidents in
   this project's history were raster-specific and invisible on the SVG fallback). Test against a
   real generated character PNG too, e.g. `DrawingStageTest`'s own default
   `generated/karna-full-journey/karna-karna.png`, or whatever real master the current story
   actually uses.
2. **Extract real frames**, not just the last one: `ffmpeg -ss <t> -i <output>.mp4 -frames:v 1 -q:v
   2 <frame>.jpg` at several timestamps spanning the whole reveal — early (still blank/guide
   phase), a point where the protagonist should just be becoming recognizable, mid-construction,
   right before the pigment wash, and the final settled frame. For a timing-sensitive question
   ("did this actually finish revealing, or does it only look empty because nothing has started
   yet"), also check a frame *near the very end of the timeline* — this is what actually
   distinguished a real bug from a red herring in this project's own history: a stroke that never
   paints stays invisible even at the last frame, long after its own reveal window should have
   completed, which rules out "hasn't gotten there yet" as an explanation.
3. **Actually look.** If something might be subtle (a thin stroke, a faint seam), crop to the
   relevant region and boost contrast/brightness before concluding it isn't there — a defect that's
   merely hard to see at normal scale is still a defect, but don't mistake genuine absence for
   subtlety either (see the diagnostic escalation path below for how to tell the difference for
   real).
4. **Fix at the source-of-truth layer** — the actual compositing/geometry/mapping logic, not a
   downstream symptom. If a fix only changes when or where a problem shows up rather than removing
   it, it isn't the real fix yet.
5. **Rerender and recheck** — including the *other* master type you didn't just fix (SVG fallback
   if you fixed a raster bug, or vice versa) to confirm no regression. Both drawing proofs
   (`DrawingStageTest`, `ProductionDrawingTest`) should be rendered and inspected before considering
   compositor work done, not just the one you were actively debugging.

Never skip straight from "the code change looks right" or "the static check passed" to declaring
victory. Both are useful signals, neither is sufficient — this project has direct, recent proof
that they can both pass while the real output is still broken.

## How to actually diagnose a visual bug (not just the first plausible guess)

The double-`mapPoint()` bug (see `docs/STATUS.md`) took several real, disprovable hypotheses before
the actual cause surfaced — each one looked plausible, each one was tested against real evidence,
and each one turned out to be wrong or incomplete. That's the normal shape of this kind of
debugging, not a failure mode to avoid. The pattern that actually worked:

- **Prefer a direct measurement over a plausible story.** Don't reason your way to "this is probably
  because of X" and stop there — compute or dump the actual numbers (stroke positions, sizes,
  mapped coordinates, the literal `d` attribute) and check whether they support X or contradict it.
  A `throw new Error(JSON.stringify({...}))` placed right before the suspect code path, triggered
  via a single-frame `npx remotion render ... --frames=N-N` (or `npx remotion still ... --frame=N`),
  is a fast, reliable way to get real values out of a Remotion render without fighting the Studio
  preview's seeking UI — always remove the debug throw and any temporary instrumentation before
  finishing.
- **Isolate variables one at a time.** When several candidate causes exist, change or bypass only
  one mechanism per test. Rendering every stroke as a solid, undashed, fixed-width colored line
  (bypassing `pathLength`/`strokeDasharray`/`vector-effect` entirely) is what actually distinguished
  "the reveal-timing math is wrong" from "the strokes are positioned wrong" from "the strokes aren't
  in the DOM at all" in this project's history — each hypothesis was testable independently.
- **Compare the working case against the broken one, precisely.** When one code path works (e.g.
  the SVG-native tracing path) and a parallel one doesn't (the raster tracing path), the bug is
  usually in what's *different* between them, not in the shared downstream code both paths call —
  read both paths side by side rather than assuming the shared code is innocent.
- **A hypothesis that's "probably right" but hasn't been checked against a real render is not yet
  a fix.** Every real fix in this project's history was confirmed by rendering again and looking,
  not by the diagnostic reasoning alone, however solid the reasoning seemed.

## Where to look

- `docs/AI_ENGINEERING_SQUAD.md` — the full four-role discipline this skill summarizes.
- `docs/STATUS.md` — search for "Latest milestone" for the most recent real incidents and their
  full diagnostic trail (what was tried, what turned out to be wrong, what the actual fix was).
  Reading a past incident before starting new compositor work is often the fastest way to avoid
  repeating it.
- `src/check-drawing-acceptance.ts` — the static acceptance contract. Update it (never weaken it to
  make an implementation pass) when the underlying mechanism it checks genuinely changes.
- `src/remotion/InkConstructionOverlay.tsx`, `src/remotion/artwork-construction.tsx` — the drawing
  engine itself (skeletonization/centerline tracing, SVG-native tracing, paper-to-alpha
  normalization, the construction-stroke reveal).
