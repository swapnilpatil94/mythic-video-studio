# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation

**North star:** one command produces a publishable Hindi mythology video.

**Current engineering focus:** turn the Remotion compositor into a reusable **Cinematic Indian Ink Whiteboard** engine with audio-led pacing, hand-draw → ink → wash treatment, kinetic Hindi typography and master-asset reuse.

## Latest milestone — research-informed whiteboard draw primitive

Implemented in GitHub:

- Reviewed current open-source whiteboard approaches before changing the compositor: HandDraw-Skill's explicit path-oriented draw timelines, SVG stroke-dash progression, and hand-drawn procedural approaches such as Rough.js-style path treatment. The research confirms that convincing whiteboard drawing depends on path-oriented progressive construction and explicit animation timing, not merely revealing a finished raster with a camera move.
- Reworked `src/remotion/visual-beats.tsx` so `InkReveal` now uses a reusable staged `DrawSweep` primitive with multiple independently timed SVG strokes, deterministic stroke-dash progression, a moving artist-hand cue and a leading draw cursor.
- Preserved the existing raster FLUX master-asset strategy: the new primitive is an overlay/reveal language inside Remotion rather than a second renderer or a one-image-per-shot system.
- Kept Short and Long-form format support unchanged.

This is a **source implementation milestone**, not an M1 visual-release claim. The new draw primitive has been committed, but a real local Karna render using the updated commit has not yet been verified in this environment.

## Previous milestone — pacing + kinetic timing contract

Implemented in GitHub:

- Added manifest-level `tempo_profile` (`short | medium | longform`).
- Added `narration_profile` with target WPM, maximum pause guidance and optional speed factor.
- Tuned the Karna Short manifest to `short`, target 155 WPM, 0.45s preferred max pause and 1.08 default pacing factor.
- Added `src/tune-narration.ts`: if generated narration exceeds the manifest duration beyond tolerance, it applies bounded FFmpeg `atempo` pacing and records `narration-pacing-report.json`.
- Added pacing instructions to the Chatterbox/TTS job so the provider receives conversational, low-dead-air narration guidance.
- Added `src/prepare-timing.ts`: creates deterministic word-level fallback timings from beat windows and audio-alignment data.
- Updated `MythicShort.tsx` to use progressive grayscale/ink treatment followed by color/wash reveal and kinetic word-by-word Hindi captions.
- Added independent character entrance/bob motion while preserving master-asset reuse.
- Added `kinetic_keywords` to the beat contract.
- Added TypeScript checking and CI structural/typecheck workflow.
- Extended pipeline audit so pacing/timing, strict output-QA and typecheck are contract-checked.
- Fixed shared project-path typing, local-runtime discovery and strict output-QA wiring.
- CI run #13 passed typecheck, manifest validation, motion checks, visual-beat checks and pipeline audit.

## Implemented — structurally verified

- Product vision, architecture, short-first strategy and long-form scaling
- Mythology Respect Mode and high-retention story structure
- Master-asset strategy and creative artifact workflow
- Goals, quality criteria and sample/reference tracking
- JSON Short manifest contract and strict validation
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
- Reusable visual beat reveal/wash/transition primitives and beat-profile contract check
- Research-informed staged whiteboard draw sweep with SVG stroke progression and artist-hand cue
- Ink-to-color reveal treatment and kinetic caption compositor path
- Motion smoke checks
- Manifest-driven SRT/VTT generation
- Remotion burned-in captions use the same narration source as SRT/VTT with mobile-safe treatment
- Final MP4 technical QA with ffprobe/FFmpeg
- Automated 9-frame contact sheet and visual-QA report
- Local runtime preflight and persisted preflight report
- Deterministic pipeline-contract audit
- Release-evidence audit and strict release gate
- Local runtime discovery report and production integration
- TypeScript verification configuration and CI workflow

## In progress

- Real local render verification of the new whiteboard draw primitive
- Runtime verification against the user's actual FLUX/ComfyUI or Draw Things installation
- Runtime verification against the user's actual Chatterbox/deep-Hindi voice setup
- Runtime verification against Whisper; current word timing remains a deterministic fallback unless the local adapter supplies word timestamps
- Real generated master-asset quality/consistency review
- Real narration alignment and mix-level review
- Visual review/tuning of the new draw sweep, ink-to-color and kinetic caption engine on actual generated assets
- Expanded layer/mask extraction for richer master-art animation where source assets support it
- Caption wrapping/safe-area review on real footage
- Human contact-sheet review
- End-to-end real Karna render using the latest GitHub commit
- Runtime verification of release-evidence report

## Blockers

No repository-level blocker prevents further coding. The decisive M1 blocker remains machine-specific execution: GitHub cannot inspect the user's Mac filesystem or prove that a particular ComfyUI/Draw Things/FLUX, Chatterbox or Whisper workflow works. Structural audits and CI can prove code contracts; only a real local run can prove model output and final visual/audio quality.

## Exact reproducible commands

Structural checks:

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

Full strict real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Post-render evidence checks:

```bash
npm run generate:visual-qa -- examples/karna-short.json renders/karna-short.mp4
npm run check:output -- examples/karna-short.json renders/karna-short.mp4
npm run check:release -- examples/karna-short.json renders/karna-short.mp4
```

## Verification policy

A completed checkbox means the repository implementation exists and has been structurally reviewed. It does not mean local models executed successfully. M1 remains open until a real MP4 is rendered and reviewed with the latest code.

For the next real run record: commit, machine/model, runtime, generated asset count, retries/failures, reference usage, draw/reveal notes, motion/crop notes, visual notes, audio notes, caption notes, QA reports and output/release hashes.

## Release gates

### M1 — first real Short

Final MP4 from one manifest using local FLUX/TTS/audio adapters, with technical and visual QA passed and release evidence captured.

### M2 — repeatability

Three different Shorts through the same pipeline without renderer code changes.

### M3 — daily production

Queue of three Shorts/day with caching, resumability and failure recovery.

### M4 — long-form

8–12 minute episodes using the same visual engine and larger manifests.

### M5 — season automation

Source/season bible, episode manifests and recoverable batch queue.

## Product goal

**AI creates the artwork. Code creates the movie.**

The final system must support 60–90s Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, fast controlled motion, deep Hindi narration, sound design/music, kinetic captions, technical/visual quality gates, one-command local production, three-Short daily batching, 8–12 minute long-form episodes and later serialized season automation.
