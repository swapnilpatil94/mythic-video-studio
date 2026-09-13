# KATHAAYA AI Engineering Squad

This repository is treated as a production system, not a sequence of isolated code patches. For visual features, every change must pass four review roles before it is considered complete.

## 1. Animation Systems Architect

Owns:
- Remotion lifecycle and deterministic rendering.
- Source-of-truth artwork geometry.
- Coordinate transforms, object-fit/object-position, SVG transforms, and raster fallback.
- Separation between construction strokes and final pigment artwork.
- Performance and render determinism.

Rejects:
- CSS/image-mask reveals presented as drawing.
- Generic character geometry replacing source artwork.
- Timing fixes that only move the failure later.
- Re-render loops caused by unstable dependencies.

## 2. Visual Director

Reviews the rendered frames as a human viewer, not only the TypeScript implementation.

The target sequence is:

`blank parchment -> construction guide -> recognizable protagonist -> denser authored linework -> restrained color wash -> finished illustration`

The protagonist must become recognizable early. Environment detail is support, not the lead. The final frame must look like one coherent illustration rather than a composited rectangular image sitting on top of the parchment.

Rejects:
- Late protagonist reveal.
- Blank-frame gaps.
- Generic scribbles.
- Hard rectangular artwork boundaries.
- Unintentional duplicate lines, ghosting, or construction artifacts left after completion.

## 3. Implementation Engineer

Owns the smallest correct architectural change. Prefer reusable behavior in the renderer over test-only special cases.

Before changing code:
1. Inspect the current render artifact.
2. Identify the actual failure mechanism.
3. Preserve the existing PR/branch and avoid parallel fix branches.
4. Change the source-of-truth layer, not merely the screenshot symptom.

After changing code:
1. Typecheck.
2. Run static acceptance checks.
3. Render both drawing proofs.
4. Inspect the rendered frames at early, middle, wash, and final timestamps.
5. Repeat until the visual acceptance criteria pass.

## 4. Visual QA / Release Gate

CI passing is necessary but not sufficient for visual work.

A visual change is complete only when:

- [ ] The construction layer contains independently animated SVG paths.
- [ ] Paths are derived from authored master geometry when vector geometry is available.
- [ ] Raster fallback uses real source pixels and centerline extraction.
- [ ] The protagonist is recognizable before the pigment wash.
- [ ] Construction progresses continuously without a reset or beat-cycle replay.
- [ ] The final master has no visible rectangular source-paper boundary.
- [ ] Final pigment does not hide or replace the construction animation prematurely.
- [ ] The master transform and construction transform remain aligned.
- [ ] Both `DrawingStageTest` and `ProductionDrawingTest` pass.
- [ ] The rendered artifact has been visually inspected, not only structurally validated.

## Operating rule

When implementation and rendered evidence disagree, rendered evidence wins.

Do not declare success because a static checker passes. Fix the renderer, rerender, and inspect the artifact until the intended visual behavior is actually present.
