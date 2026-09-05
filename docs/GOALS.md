# Master Goals

## Product goal

Build a local-first, one-command production studio for premium Hindi mythology storytelling.

The finished system must turn a structured story package into a polished Short or long-form episode without manual editing in a timeline application.

## Creative target

The output is **not** a slideshow, generic stock-footage documentary, or crude whiteboard animation.

Target visual identity:

- hand-illustrated Indian ink-and-wash aesthetic
- warm cream/parchment base
- black/dark ink linework
- restrained gold and red accents
- expressive composition and depth
- Hindi typography integrated into the scene
- hand-drawn reveals, camera movement, parallax and layered motion
- cinematic pacing with frequent meaningful visual changes
- newly generated characters/environments when the story requires them

## Story target

Use a high-retention structure:

`hook → curiosity → context → tension → reveal → consequence → emotional payoff`

The story must remain understandable with the visuals muted and compelling with the narration alone.

## Mythology rules

- Separate sourced tradition from interpretation.
- Never invent a canonical event and present it as established scripture.
- Revered figures must remain dignified and non-comedic.
- Visual ambiguity is preferred when source traditions disagree.
- Source references belong in the production package.

## Publishing target

### Short-form

- 60–90 seconds as the default target
- 3 Shorts per day once the pipeline is stable
- Hindi-first narration
- optimized for retention, replay, sharing and saves

### Long-form

- 8–12 minutes initially
- one polished episode per week
- reusable season/source bible
- 22–60+ meaningful visual beats depending on story complexity

## Production target

The user should eventually need only one command:

```bash
./run.sh examples/karna-short.json
```

That command must orchestrate validation, asset generation/checking, voice generation/checking, music/SFX preparation, animation and final MP4 rendering.

## Performance philosophy

Do not generate one unique AI image for every shot.

Instead:

1. Generate a small set of high-quality master assets.
2. Cache them per project.
3. Derive many beats through crops, layers, camera moves, masks, reveals, parallax, procedural graphics and controlled transformations.
4. Generate new assets only when the story genuinely requires them.

## Definition of success

A milestone is not complete because code executes.

It is complete only when:

- the command is reproducible;
- the generated video is visually coherent;
- characters remain consistent;
- Hindi text is correct;
- narration sounds natural;
- visual changes support the narration;
- audio is balanced;
- the final MP4 is publishable;
- runtime and resource usage are recorded.

## North-star principle

> **AI creates the artwork. Code creates the movie.**
