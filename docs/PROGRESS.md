# Progress

## 2026-09-06 — Deterministic final audio mix

### Completed this iteration

- [x] Added `src/mix-audio.ts` as a provider-neutral FFmpeg final-audio stage.
- [x] Added `npm run mix:audio -- examples/karna-short.json`.
- [x] Uses the generated narration WAV as the primary track.
- [x] Supports optional manifest-configured music and loops it to the narration duration.
- [x] Applies deterministic music attenuation through `MUSIC_VOLUME` (default `0.16`).
- [x] Discovers optional per-beat SFX from `audio.sfx_dir` using `<beat_id>.wav`, `.mp3`, or `.m4a` naming.
- [x] Delays each discovered SFX to its manifest beat start and applies `SFX_VOLUME` (default `0.55`).
- [x] Mixes active tracks with FFmpeg `amix` and applies a final limiter.
- [x] Writes a deterministic 48 kHz stereo PCM WAV at `projects/<project_id>/audio/final-mix.wav`.
- [x] Added `REQUIRE_AUDIO_MIX=1` strict mode.
- [x] Integrated the mix gate into `src/produce.ts` after narration validation/alignment and before staging/rendering.
- [x] Stages `final-mix.wav` into `public/audio/<project_id>/`.
- [x] Added generated `runtime-audio.ts` and wired Remotion to play the staged final mix when present.
- [x] Updated `docs/STATUS.md` with implementation state, commands, blockers and next milestone.

### Verification boundary

The implementation is repository-verified by accepted GitHub commits and source review. It is **not runtime-verified with real Chatterbox narration, music and SFX files** in this environment. Therefore the gain defaults are engineering defaults, not a claim of final mastering quality. A real listening pass is required before M1 can close.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run the real Chatterbox/deep-Hindi narration plus optional music/SFX through the mix and inspect perceived loudness.
2. Expand the Remotion compositor into reusable asset-aware crop/pan/zoom and SVG draw-on primitives.
3. Add true layered 2.5D depth/parallax with deterministic depth rules.
4. Add automated captions and technical/visual QA report.
5. Verify FLUX/ComfyUI and Chatterbox/deep-Hindi against the user's actual local installations.
6. Run the complete Karna Short on the target Mac and record runtime, generated asset count, retries, visual notes and audio notes.

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
npm run mix:audio -- examples/karna-short.json
npm run stage:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Audio input layout:

```text
projects/karna-kavacha-demo/audio/
  narration.wav
  music.wav              # optional; point manifest audio.music_path here
  sfx/
    B01.wav              # optional beat-start SFX
    B02.wav
    ...
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
