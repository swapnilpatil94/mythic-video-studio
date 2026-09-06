# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation

**North star:** one command produces a publishable Hindi mythology video.

**Current engineering focus:** turn the Remotion compositor from a motion-comic/slideshow treatment into a reusable **Cinematic Indian Ink Whiteboard** visual-beat engine while preserving the master-asset strategy and provider-neutral local model boundary.

## Latest milestone — reusable visual beat engine

Implemented in GitHub:

- Added `src/remotion/visual-beats.tsx` with reusable `InkReveal`, `WashReveal`, and `InkTransition` primitives.
- Added animation-to-visual profiles for `draw_reveal`, `gold_highlight`, `sun_pulse`, `hand_reveal`, `ink_motion`, `subtle_parallax`, `gold_fade`, `light_reveal` and `ink_settle`.
- Updated `src/remotion/MythicShort.tsx` to use beat profiles rather than treating every beat as the same caption + camera treatment.
- Added beat-specific framing for hook, armor, stakes, threat, visitor, request, decision, sacrifice, reveal and payoff roles so the same master character asset can produce materially different crops/compositions.
- Added progressive asset reveals, ink-stroke overlays, restrained wash pulses, transition wipes and smaller caption modes (caption/keyword/reveal).
- Added `src/check-visual-beats.ts` and `npm run check:visual-beats` as a deterministic manifest-to-compositor contract check.
- Kept FLUX/master assets, Chatterbox/TTS, audio, captions, QA, mythology-respect behavior and one-command orchestration unchanged.

This is a **compositor implementation milestone**, not an M1 release claim. The new engine is source-implemented in GitHub, but a real Remotion render against the user's local assets/model outputs has not been executed from this environment.

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
- Narration job generation, reference voice forwarding and resumable output checks
- WAV duration inspection and strict narration-duration gate
- Per-beat narration alignment using FFmpeg `silencedetect`
- Deterministic narration/music/SFX mixer with limiter and configurable gains
- Final mix staging and Remotion audio playback
- Deterministic camera presets, easing, depth-weighted 2.5D parallax and SVG draw-reveal primitive
- Reusable visual beat reveal/wash/transition primitives and beat-profile contract check
- Motion smoke checks
- Manifest-driven SRT/VTT generation
- Remotion burned-in captions use the same narration source as SRT/VTT with mobile-safe treatment
- Final MP4 technical QA with ffprobe/FFmpeg
- Automated 9-frame contact sheet and visual-QA report
- Local runtime preflight and persisted preflight report
- Deterministic pipeline-contract audit
- Release-evidence audit and strict release gate
- Local runtime discovery report and production integration

## In progress

- Runtime verification against the user's actual FLUX/ComfyUI or Draw Things installation
- Runtime verification against the user's actual Chatterbox/deep-Hindi voice setup
- Runtime verification against Whisper, if used for word/segment timing
- Real generated master-asset quality/consistency review
- Real narration alignment and mix-level review
- Visual review/tuning of the new visual-beat engine on actual generated assets
- Expanded layer/mask extraction for richer master-art animation where source assets support it
- Caption wrapping/safe-area review on real footage
- Human contact-sheet review
- End-to-end real Karna render
- Runtime verification of release-evidence report

## Blockers

No repository-level blocker prevents further coding. The decisive M1 blocker remains machine-specific execution: GitHub cannot inspect the user's Mac filesystem or prove that a particular ComfyUI/Draw Things/FLUX or Chatterbox/Whisper workflow works. Structural audits can verify wiring; only a real local run can prove model output and final visual/audio quality.

## Exact reproducible commands

Structural checks:

```bash
npm install
npm run discover:local -- examples/karna-short.json
npm run check:pipeline -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run check:visual-beats -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
```

Full strict first real-model run:

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

A completed checkbox means the repository implementation exists and has been structurally reviewed. It does not mean local models executed successfully. M1 remains open until a real MP4 is rendered and passes technical, visual, audio, caption and mythology-respect review.

For the first real run record: machine/model, runtime, generated asset count, retries/failures, reference usage, motion/crop notes, visual notes, audio notes, caption notes, QA reports and output/release hashes.

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

The final system must support 60–90s Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, fast controlled motion, deep Hindi narration, sound design/music, captions, technical/visual quality gates, one-command local production, three-Short daily batching, 8–12 minute long-form episodes and later serialized season automation.
