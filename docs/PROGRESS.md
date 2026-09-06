# Progress

## 2026-09-06 — Per-beat narration alignment and silence analysis

### Completed this iteration

- [x] Added `src/align-audio.ts` as a provider-neutral narration timing analysis stage.
- [x] Added `npm run align:audio -- examples/karna-short.json`.
- [x] Probes the real narration WAV duration with `ffprobe`.
- [x] Detects silence intervals using FFmpeg `silencedetect` with configurable noise floor and minimum silence duration.
- [x] Maps detected speech regions into each manifest beat's start/end window.
- [x] Persists per-beat target duration, detected speech duration, silence duration and narration text to `projects/<project_id>/logs/audio-alignment-report.json`.
- [x] Added `REQUIRE_TTS_ALIGNMENT=1` strict mode.
- [x] Integrated alignment into `src/produce.ts` after whole-track audio inspection and before asset staging/rendering when strict TTS mode is enabled.
- [x] Added `AUDIO_SILENCE_NOISE_DB`, `AUDIO_MIN_SILENCE_SECONDS`, and `AUDIO_ALIGNMENT_TOLERANCE_SECONDS` configuration boundaries.
- [x] Updated `docs/STATUS.md` with the new gate, commands, blockers and next milestone.

### Why this is intentionally not word-level alignment

The current manifest provides beat-level narration text but no word timestamps. This stage therefore measures actual speech/silence occupancy inside deterministic beat windows rather than fabricating word timings. Word-level alignment can be added later through a local forced-alignment provider if the real narration workflow needs it.

### Verification boundary

The implementation is repository-verified by accepted GitHub commits and source review. It is **not runtime-verified against a real generated Chatterbox WAV** in this environment. The silence detector, thresholds and per-beat results must be validated with actual deep-Hindi narration before treating the audio alignment gate as production-proven.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Validate alignment against the first real Chatterbox/deep-Hindi WAV and tune silence thresholds from evidence.
2. Add music/SFX adapter and deterministic final audio mix.
3. Expand compositor into reusable layered crops, pans, zooms and SVG draw-on transitions.
4. Add true 2.5D/parallax and deterministic depth rules.
5. Add automated captions and technical/visual QA report.
6. Verify FLUX/ComfyUI and Chatterbox/deep-Hindi against the user's actual local installations.
7. Run the complete Karna Short on the target Mac and record real runtime/quality metrics.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run check:asset-requirements -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
npm run align:audio -- examples/karna-short.json
npm run stage:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
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
