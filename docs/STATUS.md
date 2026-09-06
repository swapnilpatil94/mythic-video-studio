# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation

**North star:** one command produces a publishable Hindi mythology video.

**Current engineering focus:** the production path now has runtime preflight, a deterministic pipeline-contract audit, source-aligned captions, and a post-render release-evidence audit. The remaining decisive work is real FLUX/ComfyUI + Chatterbox/deep-Hindi execution and review of the resulting MP4.

## Latest milestone — release evidence

Implemented and source-verified:

- `src/check-release.ts` verifies the final MP4 and required post-render evidence artifacts in strict mode.
- The release audit fingerprints the manifest and final MP4 with SHA-256.
- It records final video/audio stream metadata through `ffprobe`.
- It verifies the applicable preflight, audio, output-QA, visual-QA and contact-sheet artifacts.
- It persists `projects/<project_id>/logs/release-evidence-report.json`.
- `REQUIRE_RELEASE_EVIDENCE=1` is wired into `src/produce.ts` after render and QA.
- `src/check-pipeline.ts` now verifies the release-audit source, npm script, production wiring and strict gate.

This is an evidence boundary, not an artistic-quality certification. Human mythology-respect, visual, audio and caption review remain required.

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
- Motion smoke checks
- Manifest-driven SRT/VTT generation
- Remotion burned-in captions use the same narration source as SRT/VTT with mobile-safe treatment
- Final MP4 technical QA with ffprobe/FFmpeg
- Automated 9-frame contact sheet and visual-QA report
- Local runtime preflight and persisted preflight report
- Deterministic pipeline-contract audit
- Release-evidence audit and strict release gate

## In progress

- Runtime verification against the user's actual FLUX/ComfyUI installation
- Runtime verification against the user's actual Chatterbox/deep-Hindi voice setup
- Real generated master-asset quality/consistency review
- Real narration alignment and mix-level review
- Visual review/tuning of 2.5D camera language
- Expanded SVG draw-on language
- Caption wrapping/safe-area review on real footage
- Human contact-sheet review
- End-to-end real Karna render
- Runtime verification of release-evidence report

## Blockers

No repository-level blocker prevents further coding. The decisive blocker is machine-specific execution: the exact local FLUX/ComfyUI invocation and Chatterbox/deep-Hindi invocation are not executable from this environment. Structural audits can verify wiring and evidence contracts, but cannot prove model output quality. Output/visual/release evidence becomes meaningful only after a real MP4 exists. The black-frame QA threshold is intentionally conservative and must be reviewed against legitimate dark mythic footage.

## Exact reproducible commands

```bash
npm install
npm run check:pipeline -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run check:release -- examples/karna-short.json renders/karna-short.mp4
```

Full strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Manual post-render sequence if needed:

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
