# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation

**North star:** one command produces a publishable Hindi mythology video.

**Current engineering focus:** trustworthy master-asset provenance/retries, then character references and generated-art compositing.

## Done — implemented and structurally verified in repository

- [x] GitHub repository created
- [x] Product vision and architecture documented
- [x] Short-first and long-form scaling strategy documented
- [x] Mythology Respect Mode documented
- [x] High-retention story structure documented
- [x] Master-asset generation strategy documented
- [x] Frontier/Work creative artifact workflow documented
- [x] Goals, quality criteria and sample/reference tracking
- [x] JSON Short manifest contract and shared production types
- [x] Strict duration/beat/duplicate-ID validation
- [x] Manifest-driven Remotion beat timeline
- [x] 1080x1920 / 30fps Short composition
- [x] Procedural illustrated fallback renderer
- [x] Beat-driven camera/animation system
- [x] Hindi text layer
- [x] Local production runner skeleton
- [x] Project path manager
- [x] Resumable per-project asset registry/cache contract
- [x] Automatic unique asset-plan derivation from a manifest
- [x] Project preparation stage
- [x] Provider-neutral image adapter and command-based local image contract
- [x] Master-asset prompt planner with sacred-figure guardrails
- [x] Resumable missing-master-asset generation runner
- [x] Existing output adoption into the registry
- [x] Per-job JSON image handoff
- [x] Optional strict image-generation mode
- [x] PNG/JPEG probing, dimension validation and PNG alpha detection
- [x] Optional FFmpeg oversized-image normalization
- [x] Registry width/height metadata after inspection/normalization
- [x] Strict image inspection gate before rendering
- [x] Provider-neutral Hindi TTS job contract
- [x] Chatterbox-compatible command boundary (`TTS_COMMAND` / `CHATTERBOX_COMMAND`)
- [x] Beat narration extraction with timing metadata
- [x] Narration job JSON persisted under project logs
- [x] Optional reference-voice path passed through the TTS job
- [x] Resumable narration output check
- [x] Optional strict TTS gate (`REQUIRE_TTS=1`)
- [x] WAV duration inspection with `ffprobe`
- [x] Audio duration report persisted under project logs
- [x] Strict narration-duration gate before rendering
- [x] One-command runner executes audio validation in strict mode
- [x] SHA-256 asset provenance fields in the registry
- [x] Asset generation attempt counting
- [x] Asset generation runtime measurement
- [x] Asset generation last-error persistence
- [x] Automatic retry loop for missing generated assets

## In progress

- [ ] Runtime verification against the user's actual FLUX/ComfyUI installation
- [ ] Runtime verification against the user's actual Chatterbox/deep-Hindi voice setup
- [ ] Reference-image inputs for consistent characters and controlled edits
- [ ] Semantic asset requirements (transparent character vs opaque environment)
- [ ] Per-segment narration duration/alignment and waveform inspection
- [ ] Music/SFX adapter
- [ ] SVG draw-on animation primitives
- [ ] True layered 2.5D camera/parallax system
- [ ] Generated-art compositing with procedural fallback
- [ ] Automated subtitles/captions
- [ ] Final audio mix
- [ ] Automated visual/technical QA report
- [ ] End-to-end real Karna render on the user's machine

## Blockers

No repository-level blocker is preventing further coding. The remaining integration blockers are machine-specific: the exact local FLUX/ComfyUI invocation and Chatterbox/deep-Hindi invocation are not verified in this environment. The adapters deliberately do not invent model-specific commands.

## Asset provenance contract

Every successful generated/adopted asset can now carry a SHA-256 digest, generation timestamp, total generation runtime, cumulative attempt count and last error. Missing/failed jobs remain resumable. Existing ready files without a digest are hashed when encountered, without regenerating them.

Useful variable:

```bash
IMAGE_GENERATION_MAX_ATTEMPTS=2
```

This is repository implementation only; it does not prove model quality or local generation performance.

## Audio inspection contract

`src/inspect-audio.ts` probes the configured narration WAV using `ffprobe`, records duration/target/delta/tolerance in `projects/<project_id>/logs/audio-report.json`, and fails strict production when the total narration differs from the manifest target by more than `AUDIO_DURATION_TOLERANCE_SECONDS` (default `0.35`).

Useful variables:

```bash
FFPROBE_COMMAND=ffprobe
AUDIO_DURATION_TOLERANCE_SECONDS=0.35
REQUIRE_TTS=1
```

This is a total-duration gate only; beat-level waveform alignment is still pending.

## Current image contract

Supported inspection inputs are PNG and JPEG. Default validation requires dimensions of at least 256px and no dimension above 4096px. `NORMALIZE_ASSETS=1` enables FFmpeg conversion of oversized assets to deterministic PNG outputs, targeting 2048px maximum dimension by default.

Useful environment variables:

```bash
MAX_ASSET_DIMENSION=4096
NORMALIZED_ASSET_DIMENSION=2048
NORMALIZE_ASSETS=1
FFMPEG_COMMAND=ffmpeg
```

## Image adapter contract

Set `FLUX_COMMAND` (or `IMAGE_GENERATOR_COMMAND`) to an executable that receives one JSON job as its final argument. The job contains `project_id`, `asset_id`, `kind`, `role`, `prompt`, and `output_path`. Optional `FLUX_ARGS` / `IMAGE_GENERATOR_ARGS` may contain `{job}` and `{output}` placeholders. The command must create the requested output file; otherwise the job is retried and eventually marked failed.

For unattended strict generation:

```bash
REQUIRE_GENERATED_ASSETS=1
IMAGE_GENERATION_MAX_ATTEMPTS=2
```

## Pending user inputs — only when adapter wiring begins

1. FLUX model location or local API/ComfyUI endpoint/command.
2. Chatterbox installation/command or local API endpoint.
3. Deep Hindi voice-clone model location/invocation method.
4. Optional local music/SFX model if available.
5. Approved visual samples/references when available.

Do not commit credentials, tokens, private keys, or model weights.

## Verification boundary

Repository implementation is not the same as runtime verification. M1 cannot be marked complete until local dependencies/models are actually executed and a real MP4 is rendered and visually reviewed on the target machine.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run inspect -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict real-model run:

```bash
REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

## Release gates

### Gate M1 — first real Short

Final MP4 from one manifest using local FLUX/TTS/audio adapters, with technical and visual QA passed.

### Gate M2 — repeatability

Three different Shorts through the same pipeline without renderer code changes.

### Gate M3 — daily production

Queue of three Shorts/day with caching, resumability and failure recovery.

### Gate M4 — long-form

8–12 minute episodes using the same visual engine and larger manifests.

### Gate M5 — season automation

Source/season bible, episode manifests and recoverable batch queue.
