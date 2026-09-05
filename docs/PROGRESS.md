# Progress

## 2026-09-06 — Audio duration validation gate

### Completed this iteration

- [x] Added `src/inspect-audio.ts`.
- [x] Added `npm run inspect:audio`.
- [x] Narration WAV is probed with `ffprobe` rather than trusted solely because the TTS command exited successfully.
- [x] Total narration duration is compared with the manifest duration.
- [x] Configurable tolerance via `AUDIO_DURATION_TOLERANCE_SECONDS` (default `0.35`).
- [x] Persisted `projects/<project_id>/logs/audio-report.json` with measured duration, target, delta and tolerance.
- [x] Strict production now fails before rendering when narration duration is outside tolerance.
- [x] Updated `package.json`, `src/produce.ts`, and `docs/STATUS.md`.

### Verification boundary

This milestone is repository-implemented and structurally reviewed. It is **not** runtime verification of Chatterbox. No claim is made about the user's actual TTS installation until a real WAV is generated and successfully inspected on the target machine.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Verify FLUX/ComfyUI and Chatterbox against the user's actual local installations.
2. Add image runtime, retry and SHA-256 metadata to the asset registry.
3. Add reference-image inputs and semantic asset requirements for character/environment outputs.
4. Add per-segment narration timing/alignment and waveform inspection.
5. Add music/SFX adapter and final audio mix.
6. Connect generated master artwork to the Remotion compositor with layered crops, pans, zooms and draw-on transitions.
7. Add true 2.5D/parallax and SVG stroke primitives.
8. Add automated captions and technical/visual QA report.
9. Run the complete Karna Short on the target Mac and record real runtime/quality metrics.

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
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 bash run.sh examples/karna-short.json
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
- visual quality notes
- audio quality notes
- next bottleneck

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The final system must support:

- 60–90s high-retention Hindi mythology Shorts
- reusable master assets rather than shot-per-image generation
- dignified/source-aware mythology treatment
- fast visual pacing with controlled camera/motion
- deep Hindi narration
- sound design/music
- one-command local production after one-time setup
- three-Short daily batching
- 8–12 minute long-form episodes using the same engine
- serialized season/episode automation later
