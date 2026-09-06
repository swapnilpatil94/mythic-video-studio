# Progress

## 2026-09-06 — Research-informed whiteboard draw primitive

### Completed this iteration

- [x] Researched current open-source whiteboard approaches before changing the compositor.
- [x] Confirmed the useful pattern from HandDraw-Skill: path-oriented SVG assets, explicit draw timelines and deterministic render/verification; it is not suitable as a replacement renderer because our system intentionally keeps raster FLUX masters.
- [x] Confirmed SVG stroke-dash progression as the dependency-free primitive for deterministic path drawing.
- [x] Added a reusable `DrawSweep` primitive to `src/remotion/visual-beats.tsx` with multiple independently delayed SVG strokes and deterministic `strokeDashoffset` progression.
- [x] Added a moving artist-hand cue and leading cursor to make the drawing action legible rather than presenting only a finished-image clip reveal.
- [x] Kept the existing FLUX raster master strategy, Remotion renderer, Short/Long format profiles and one-command pipeline unchanged.
- [x] Updated `docs/STATUS.md` with the implementation boundary and exact next verification step.

### Verification boundary

The code change is committed to GitHub, but this automation environment cannot execute the user's local FLUX/ComfyUI/Draw Things, Chatterbox and Whisper stack or visually inspect a newly rendered MP4 from that machine. Therefore this iteration is **implemented but not visually verified**. No M1 completion claim is made.

## Previous milestone — Audio pacing + kinetic timing + ink-to-color compositor

- [x] Added `tempo_profile` with `short`, `medium` and `longform` modes.
- [x] Added narration pacing profile and bounded FFmpeg pacing.
- [x] Added deterministic word timing fallback and runtime timing contract.
- [x] Added grayscale/ink → color/wash treatment.
- [x] Added character entrance/bob motion and kinetic Hindi captions.
- [x] Added strict output-QA wiring and TypeScript/CI checks.

## Current M1 sequence

1. Run `npm run typecheck` and all structural gates against the latest commit.
2. Run the strict Karna production on the target Mac.
3. Inspect dense frames specifically for the new artist-hand + staged draw sweep; if it still reads as finished-image reveal, continue the compositor work rather than closing M1.
4. Inspect narration, Whisper timing, kinetic keywords, captions and mythology-respect treatment.
5. Capture visual/audio/output/release evidence and hashes.
6. Only close M1 after the real MP4 passes technical, visual, audio, caption and mythology-respect gates.
7. After M1, validate repeatability with three different mythology Shorts without renderer changes; long-form remains supported by the same engine and should later receive a real end-to-end manifest test.

## Exact reproducible commands

```bash
npm install
npm run typecheck
npm run discover:local -- examples/karna-short.json
npm run check:pipeline -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run check:visual-beats -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
```

Strict production:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Post-render evidence:

```bash
npm run generate:visual-qa -- examples/karna-short.json renders/karna-short.mp4
npm run check:output -- examples/karna-short.json renders/karna-short.mp4
npm run check:release -- examples/karna-short.json renders/karna-short.mp4
```

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The system must support 60–90s high-retention Hindi mythology Shorts and 8–15+ minute long-form episodes using the same universal, format-aware visual engine, reusable master assets, reference-guided consistency, mythology-respect mode, controlled cinematic motion, Hindi narration, sound design/music, kinetic captions, quality gates and one-command local production.
