# Progress

## 2026-09-06 — Generated-art compositing

### Completed this iteration

- [x] Added `src/stage-assets.ts` to bridge validated project assets into Remotion's public asset space.
- [x] Added `npm run stage:assets`.
- [x] Staging is limited to registry assets marked `ready` and whose files exist.
- [x] Deterministic runtime asset URLs are written to `src/remotion/runtime-assets.ts`.
- [x] Added generated-art layers to `src/remotion/MythicShort.tsx`.
- [x] Environment/background-like references can fill the frame with restrained opacity and camera drift.
- [x] Character/master references can enter as foreground layers with simple lateral motion.
- [x] Supporting prop/other references can appear as a secondary layer.
- [x] Existing procedural illustration remains as a fallback when a beat has no staged generated art.
- [x] Updated `src/produce.ts` so staging happens after image/audio gates and before Remotion rendering.
- [x] Added `npm run stage:assets` to the package scripts.
- [x] Updated `docs/STATUS.md` with the compositing contract, verification boundary and commands.

### Verification boundary

The repository wiring was written and re-read through GitHub after each sequential update. This is **structural verification only**. The actual Remotion render with a real FLUX-generated character/environment asset has not been executed in the target Mac environment here, so visual placement, transparency behavior, crop quality and performance are not claimed as verified.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Add semantic asset requirements (isolated/transparent character versus opaque environment) and make staging honor those requirements.
2. Add per-segment narration timing/alignment and waveform inspection.
3. Add music/SFX adapter and final audio mix.
4. Expand the compositor into reusable layered crops, pans, zooms and SVG draw-on transitions.
5. Add true 2.5D/parallax and deterministic depth rules.
6. Add automated captions and technical/visual QA report.
7. Verify FLUX/ComfyUI and Chatterbox/deep-Hindi against the user's actual local installations.
8. Run the complete Karna Short on the target Mac and record real runtime/quality metrics.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
npm run stage:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
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
