# Progress

## 2026-09-06 — Deterministic cinematic motion primitives

### Completed this iteration

- [x] Added `src/remotion/motion.ts` with typed camera presets and deterministic eased motion.
- [x] Added push-in, slow-push, reverse-push, pull-back, pan, tilt-up, edge-reveal, shot-reverse and armor-crop camera behaviors.
- [x] Added depth-weighted parallax offsets so foreground and background layers respond differently to the same camera move.
- [x] Added composable layer transform generation for scale + camera translation + depth offset.
- [x] Wired environment, prop and character layers in `MythicShort` to different depth strengths.
- [x] Replaced the prior generic generated-art drift with manifest camera presets for generated artwork.
- [x] Added deterministic SVG draw-reveal progress and wired it to the armor highlight path.
- [x] Added `src/check-motion.ts` smoke checks for monotonic camera motion, depth separation, reveal endpoints and transform composition.
- [x] Added `npm run check:motion` to the package scripts.
- [x] Updated `docs/STATUS.md` with the new implementation state, verification boundary, commands and next milestone.

### Verification boundary

The motion module and wiring are repository-verified by accepted GitHub commits and source review. The smoke-check command exists but has not been executed in this environment, and the compositor has not been rendered against real FLUX/ComfyUI masters here. Therefore cinematic quality, depth strength, crop safety and perceived motion are **not** claimed as runtime-verified.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run `npm run check:motion` locally and then render a real generated-art beat to tune depth strengths and crop safety.
2. Add captions/subtitles as a manifest-driven render layer with safe-area rules.
3. Add automated technical QA for duration, resolution, fps, audio presence, clipping and black-frame detection.
4. Add visual QA artifact generation for contact sheets/keyframes so the first real Karna render can be reviewed systematically.
5. Verify FLUX/ComfyUI and Chatterbox/deep-Hindi against the user's actual local installations.
6. Run the complete Karna Short on the target Mac and record runtime, generated asset count, retries, motion notes and audio notes.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run check:motion
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run check:asset-requirements -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
npm run align:audio -- examples/karna-short.json
npm run mix:audio -- examples/karna-short.json
npm run stage:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

## Verification policy

A checkbox means the repository implementation exists and has been structurally reviewed. It does **not** mean a local model executed successfully. M1 remains open until a real MP4 is rendered and reviewed.

For every completed milestone record:

- implementation status
- exact command
- machine/model
- runtime
- generated asset count
- failures/retries
- reference usage when applicable
- motion/crop notes
- visual quality notes
- audio quality notes
- next bottleneck

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The final system must support:

- 60–90s high-retention Hindi mythology Shorts
- reusable master assets rather than shot-per-image generation
- reference-guided character consistency where useful
- dignified/source-aware mythology treatment
- fast visual pacing with controlled camera/motion
- deep Hindi narration
- sound design/music
- one-command local production after one-time setup
- three-Short daily batching
- 8–12 minute long-form episodes using the same engine
- serialized season/episode automation later
