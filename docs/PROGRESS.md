# Progress

## 2026-09-06 — Captions + final-output technical QA

### Completed this iteration

- [x] Added `src/generate-captions.ts` for deterministic beat-timed Hindi SRT/VTT generation.
- [x] Caption source priority is `beat.narration`, then `beat.text`.
- [x] Caption files and a generation report are persisted under `projects/<project_id>/captions/`.
- [x] Added `src/check-output.ts` for final MP4 technical QA.
- [x] QA checks 1080x1920 resolution, 30fps, duration tolerance, video/audio stream presence, black-frame intervals and audio peak.
- [x] QA report is persisted under `projects/<project_id>/logs/output-qa-report.json`.
- [x] Added `REQUIRE_OUTPUT_QA=1` strict failure behavior.
- [x] Added `npm run generate:captions` and `npm run check:output` scripts.
- [x] Integrated caption generation and output QA into the one-command production path.
- [x] Fixed the output QA implementation to inspect FFmpeg diagnostics from stderr and keep the final QA invocation single-pass.
- [x] Updated `docs/STATUS.md` with implementation state, commands, blockers, verification boundary and next milestone.

### Verification boundary

The new code is repository-verified by accepted GitHub commits and source review. It has not been executed here against a real rendered MP4 because the local FLUX/ComfyUI and Chatterbox/deep-Hindi runtime are machine-specific and not available in this environment. Therefore the new QA checks and caption timing are implemented but **not runtime-verified** on actual footage.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run `npm install` and `npm run check:motion` locally.
2. Execute the real FLUX/ComfyUI and Chatterbox/deep-Hindi adapters and record runtime, retries and outputs.
3. Run the strict one-command Karna production with output QA enabled.
4. Review the generated MP4 visually and audibly; inspect the generated SRT/VTT and QA report.
5. Add automated contact-sheet/keyframe visual QA so crop, parallax, character consistency and dark-frame findings can be reviewed systematically.
6. Tune caption safe-area styling and motion strengths against real masters.
7. Only after the real MP4 passes those gates, record M1 as complete.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run check:motion
npm run generate:captions -- examples/karna-short.json
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
