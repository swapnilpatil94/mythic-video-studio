# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation; Studio UI foundation added.

**North star:** one command produces a publishable Hindi mythology video.

**Brand:** **KATHAAYA — Ancient Stories. Reimagined Through Ink.**

**Current engineering focus:** reusable Cinematic Indian Ink Whiteboard production plus a minimal local project UI and a universal Short/Long-form manifest contract.

## Latest milestone — Kathaaya Studio UI + format-aware manifest foundation

Implemented in GitHub:

- Added `studio/server.mjs`: dependency-light local HTTP API for project listing, creation, deletion, Story Package import and canonical JSON editing.
- Added `studio/index.html`: local dashboard with project management, Short/Long-form selection, Story Package paste/import, JSON tabs, validation/format/copy controls and reproducible production-command display.
- Added `prompts/story-package.md`: canonical one-paste ChatGPT/Claude prompt covering story, script, characters, environments, props, visual events, audio and publishing metadata.
- Added `schemas/story-package.schema.json` for the import package contract.
- Added `schemas/production-manifest.schema.json` for the universal production manifest contract.
- Added `examples/karna-longform-test.json` as a 180-second format/validation smoke fixture.
- Made `src/pipeline/validate-manifest.ts` format-aware: Short remains 45–120s; Long-form accepts 120–1800s and requires at least 10 beats.
- Extended the pipeline contract audit to require the Studio UI, Story Package prompt/schema and universal manifest schema.
- Added `npm run studio` to launch the local UI.
- Kept the existing FLUX, Chatterbox, Whisper and Remotion pipeline unchanged; the UI is a control/data layer, not a second renderer.

## Verification boundary

The new UI/API source is committed and repository structure is inspectable, but this automation environment cannot install dependencies or execute the user's Mac-local runtime. A direct local verification attempt was blocked because this environment has no outbound DNS/network access to clone the GitHub repository. Therefore **the UI is implemented but not locally runtime-verified here**.

The long-form validator logic is implemented and a 180-second fixture exists, but a real long-form MP4 has **not** been verified. Full long-form production remains open.

## Previous milestone — research-informed whiteboard draw primitive

- Added reusable staged `DrawSweep` in `src/remotion/visual-beats.tsx` with independently timed SVG strokes, deterministic dash progression, artist-hand cue and leading cursor.
- Preserved raster FLUX master assets and Remotion; no second renderer or one-image-per-shot architecture.
- Kept Short and Long-form format support conceptually within one engine.
- This remains a source implementation milestone until a real local render with the latest commit is inspected.

## Implemented — structurally verified

- Product vision, architecture, short-first strategy and long-form scaling
- Kathaaya brand layer and mythology-respect/source-aware direction
- Master-asset strategy and creative artifact workflow
- Goals, quality criteria and sample/reference tracking
- JSON Short manifest contract and strict validation
- Universal production-manifest schema and format-aware duration validation
- Story Package prompt/schema and local project importer
- Manifest-driven Remotion 1080x1920 / 30fps composition
- Procedural fallback renderer and beat-driven camera system
- Project preparation, resumable asset registry/cache and automatic asset planning
- Provider-neutral image generation with command-based local adapter
- Sacred-figure-aware master-asset prompt planner
- Resumable missing-asset generation, adoption, retries, provenance and runtime tracking
- Character-reference resolver and strict reference enforcement
- PNG/JPEG inspection, dimensions, alpha detection and normalization
- Semantic asset requirements and strict asset gate
- Provider-neutral Hindi TTS / Chatterbox command boundary
- Narration job generation, reference voice forwarding and pacing profile
- Bounded narration pacing stage
- WAV duration inspection and strict narration-duration gate
- Per-beat narration alignment using FFmpeg `silencedetect`
- Deterministic fallback word timing for kinetic typography
- Deterministic narration/music/SFX mixer with limiter and configurable gains
- Final mix staging and Remotion audio playback
- Deterministic camera presets, easing, depth-weighted 2.5D parallax and SVG draw-reveal primitives
- Research-informed staged whiteboard draw sweep
- Ink-to-color reveal treatment and kinetic caption compositor path
- Motion smoke checks
- Manifest-driven SRT/VTT generation
- Final MP4 technical QA with ffprobe/FFmpeg
- Automated contact sheet and visual-QA report
- Local runtime preflight and persisted preflight report
- Deterministic pipeline-contract audit and release-evidence audit
- Local runtime discovery report and production integration
- TypeScript verification configuration and CI workflow

## In progress

- Local runtime verification of the new Studio UI
- Story Package import against a real local install
- Real local FLUX/ComfyUI or Draw Things verification
- Real Chatterbox/deep-Hindi voice verification
- Real Whisper word-timestamp verification
- Real generated master-asset quality/consistency review
- Real narration alignment and final-mix review
- Visual review/tuning of draw sweep, ink-to-color, action and kinetic captions on current generated assets
- Expanded layer/mask extraction for richer master-art animation
- Caption safe-area/collision review on actual footage
- End-to-end real Karna render using the latest GitHub commit
- Long-form 3–4 minute end-to-end render and visual/audio review
- Long-form-specific beat-density and chapter-level quality gates

## Known blocker / limitation

No repository-level blocker prevents further coding. The decisive verification blocker is machine-specific execution: GitHub cannot inspect the user's Mac filesystem or prove that the local ComfyUI/Draw Things/FLUX, Chatterbox or Whisper integrations work. The Studio UI also intentionally exposes the exact `run.sh` command rather than executing arbitrary shell commands from a browser page; this preserves the one-command local workflow without adding a second execution service. Local verification on the target Mac is required before calling the UI or a real long-form render complete.

## Exact reproducible commands

Studio UI:

```bash
npm install
npm run typecheck
npm run studio
# open http://127.0.0.1:4317
```

Structural checks:

```bash
npm run typecheck
npm run discover:local -- examples/karna-short.json
npm run check:pipeline -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run check:visual-beats -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
```

Long-form manifest smoke check:

```bash
npm run validate -- examples/karna-longform-test.json
npm run check:pipeline -- examples/karna-longform-test.json
```

Full strict real-model Short run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Long-form target test after local runtime is confirmed:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-longform-test.json
```

Post-render evidence:

```bash
npm run generate:visual-qa -- <manifest> <render.mp4>
npm run check:output -- <manifest> <render.mp4>
npm run check:release -- <manifest> <render.mp4>
```

## Release gates

### M1 — first real Short
Real local FLUX/TTS/audio MP4, technical + visual + audio + caption + mythology-respect QA and release evidence.

### M2 — repeatability
Three different mythology Shorts through the same pipeline without renderer code changes.

### M3 — daily production
Queue of three Shorts/day with caching, resumability and failure recovery.

### M4 — long-form
Real 3–4 minute architecture test, then 8–12 minute episodes using the same engine and larger manifests.

### M5 — season automation
Source/season bible, episode manifests and recoverable batch queue.

## Product goal

**AI creates the artwork. Code creates the movie.**

The final system must support Kathaaya 60–90s Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, controlled cinematic motion, deep Hindi narration, sound design/music, kinetic captions, technical/visual quality gates, one-command local production, three-Short daily batching, 8–15+ minute long-form episodes and later serialized season automation.
