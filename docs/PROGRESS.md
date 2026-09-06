# Progress

## 2026-09-06 — Caption render/source alignment

### Completed this iteration

- [x] Updated `src/remotion/MythicShort.tsx` so the on-video caption uses `beat.narration` when present, falling back to `beat.text`.
- [x] Kept the same beat timing model used by `src/generate-captions.ts`, so the burned-in caption content and generated SRT/VTT content share the same authoritative source field.
- [x] Added an explicit mobile-safe caption layout with 70px side margins and a 150px bottom baseline.
- [x] Added a high-contrast backing panel and centered typography for caption readability over generated artwork.
- [x] Preserved the beat-role label beneath the caption without changing the mythology-respect content model.
- [x] Updated `docs/STATUS.md` to record the new renderer contract and verification boundary.

### Why this milestone

The previous pipeline generated subtitle files, but the compositor displayed `beat.text` independently. That created a real consistency risk when narration differed from the short display text. This iteration closes that source-of-truth mismatch before real MP4 review.

### Verification boundary

The renderer change is committed and source-reviewed. It has **not** been rendered against a real FLUX/ComfyUI asset set in this environment. Caption readability, line wrapping, safe-area behavior and visual interaction with generated characters therefore remain runtime review items. This iteration does not claim M1 completion.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run `npm install` and `npm run check:pipeline -- examples/karna-short.json` locally.
2. Run `npm run preflight -- examples/karna-short.json` and resolve local runtime failures.
3. Execute the strict one-command Karna production with the real FLUX/ComfyUI and Chatterbox/deep-Hindi commands.
4. Record actual model runtimes, retries, generated asset count, reference usage and failures.
5. Review the rendered MP4, contact sheet, captions and technical/visual/audio QA reports.
6. Tune caption wrapping/safe area, camera/parallax strength, black-frame threshold and audio balance from real evidence.
7. Only after the real MP4 passes technical, visual, audible, caption and mythology-respect gates, record M1 as complete.

## Exact reproducible commands

```bash
npm install
npm run check:pipeline -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run inspect -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run check:asset-requirements -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
npm run align:audio -- examples/karna-short.json
npm run mix:audio -- examples/karna-short.json
npm run generate:captions -- examples/karna-short.json
npm run stage:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
npm run generate:visual-qa -- examples/karna-short.json renders/karna-short.mp4
npm run check:output -- examples/karna-short.json renders/karna-short.mp4
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
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
- caption/QA notes
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
- captions/subtitles
- technical and visual quality gates
- one-command local production after one-time setup
- three-Short daily batching
- 8–12 minute long-form episodes using the same engine
- serialized season/episode automation later
