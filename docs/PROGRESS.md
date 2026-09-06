# Progress

## 2026-09-06 — Audio pacing + kinetic timing + ink-to-color compositor

### Completed this iteration

- [x] Added `tempo_profile` to the production contract with `short`, `medium` and `longform` modes.
- [x] Added `narration_profile` for target WPM, pause guidance and speed factor.
- [x] Tuned `examples/karna-short.json` to short-form pacing: 155 WPM target, 0.45s preferred pause ceiling and 1.08 default speed factor.
- [x] Added `src/tune-narration.ts` to bound narration speed when generated audio exceeds target duration; it records a pacing report and does not claim the provider voice itself has changed.
- [x] Added pacing instructions to the TTS/Chatterbox job for conversational Hindi, lower dead air and reveal-driven pauses.
- [x] Added `src/prepare-timing.ts` to create deterministic word timing from beat windows plus the existing audio-alignment report.
- [x] Added checked-in `src/remotion/runtime-timing.ts` fallback map; production replaces it with generated timing data.
- [x] Updated `MythicShort.tsx` so generated artwork has an early grayscale/ink reveal followed by color/wash reveal rather than a single completed-image reveal.
- [x] Added subtle independent character entrance/bob motion while preserving master-asset reuse.
- [x] Replaced the single static caption treatment with word-level kinetic Hindi captions and a progressive reveal-text mode.
- [x] Added `kinetic_keywords` to the manifest contract for stronger future word-triggered effects.
- [x] Extended pipeline audit and one-command production to run narration pacing and timing preparation.
- [x] Added TypeScript checking for `.ts` and `.tsx` sources and a CI workflow that runs typecheck plus structural gates.

### Evidence from the latest uploaded render

The latest uploaded Karna MP4 was technically inspected in this environment: 1080×1920, 30fps, 81.045s. FFmpeg silence detection at -35dB / 0.20s found several internal pauses above 1.5s, including approximately 1.66s, 1.87s, 1.66s, 1.30s and 1.77s. This validates the user's observation that the narration has excessive dead air. It is evidence about the uploaded render only; it is not proof that the updated GitHub code has been rendered on the target Mac.

### Verification boundary

The new code is committed in GitHub and the repository contract now includes the new stages. A real local Remotion render using the user's actual FLUX/ComfyUI or Draw Things assets, Chatterbox voice and Whisper setup is still required before claiming M1 visual/audio completion.

## Previous milestone — Visual beat engine / cinematic ink compositor

- [x] Added reusable ink reveal, wash reveal and transition primitives.
- [x] Added animation profiles and beat-role framing.
- [x] Added progressive image reveals, ink overlays, wash pulses and transition wipes.
- [x] Preserved provider-neutral FLUX/image generation, Chatterbox/TTS, audio gates, master-asset reuse and one-command orchestration.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run the new TypeScript/structural gates on the target Mac.
2. Run local discovery and map only working FLUX/ComfyUI/Draw Things, Chatterbox and Whisper commands into existing adapters.
3. Execute the strict one-command Karna production; pacing and timing stages are now automatic.
4. Inspect the generated voice, pacing report, alignment report, word-timing report, master assets, visual beat motion, kinetic captions, contact sheet and QA.
5. If Whisper is available, add a provider adapter that replaces deterministic word timing with real word timestamps without changing the compositor contract.
6. Tune the compositor from real footage, especially ink-line visibility, wash timing, character actions and mobile text density.
7. Capture release evidence and hashes.
8. Close M1 only after technical, visual, audio, caption and mythology-respect gates pass.

## Exact reproducible commands

Structural:

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

Targeted audio/timing:

```bash
npm run generate:voice -- examples/karna-short.json
npm run tune:narration -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
npm run align:audio -- examples/karna-short.json
npm run prepare:timing -- examples/karna-short.json
```

Strict one-command production:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Post-render:

```bash
npm run generate:visual-qa -- examples/karna-short.json renders/karna-short.mp4
npm run check:output -- examples/karna-short.json renders/karna-short.mp4
npm run check:release -- examples/karna-short.json renders/karna-short.mp4
```

### Verification policy

A checkbox means repository implementation exists and has been structurally reviewed. It does not mean a local model executed successfully. M1 remains open until a real MP4 is rendered and reviewed using the updated pipeline.

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The system must support 60–90s high-retention Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, controlled cinematic motion, deep Hindi narration, sound design/music, kinetic captions, technical and visual quality gates, one-command local production, three-Short daily batching, 8–12 minute long-form episodes and later serialized season automation.
