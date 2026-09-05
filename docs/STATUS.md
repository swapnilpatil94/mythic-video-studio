# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation

**North star:** one command produces a publishable Hindi mythology video.

**Current engineering focus:** local asset generation/validation plus the provider-neutral Hindi narration boundary, while preserving resumability and the master-asset strategy.

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
- [x] One-command runner now executes the narration stage before rendering

## In progress

- [ ] Runtime verification against the user's actual FLUX/ComfyUI installation
- [ ] Runtime verification against the user's actual Chatterbox/deep-Hindi voice setup
- [ ] Record image generation runtime, retries and SHA-256 hashes in registry
- [ ] Reference-image inputs for consistent characters and controlled edits
- [ ] Better semantic asset requirements (transparent character vs opaque environment)
- [ ] Voice asset cache plus actual duration/waveform inspection
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

## Current audio contract

The voice stage reads `beat.narration` and falls back to `beat.text`. It writes a deterministic job at `projects/<project_id>/logs/narration-job.json`. A configured command receives the job JSON as its final argument and must create the requested WAV output. Optional command arguments support `{job}` and `{output}` placeholders.

Environment variables:

```bash
TTS_COMMAND=<local executable>
TTS_ARGS=<optional arguments with {job} and/or {output}>
TTS_VOICE=<optional voice identifier>
TTS_REFERENCE_AUDIO=<optional reference voice path>
REQUIRE_TTS=1
```

`CHATTERBOX_COMMAND`, `CHATTERBOX_ARGS`, `CHATTERBOX_VOICE`, and `CHATTERBOX_REFERENCE_AUDIO` are accepted aliases.

The repository does not claim Chatterbox compatibility is runtime-proven until the user's actual installation executes successfully and the resulting audio is inspected.

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

Set `FLUX_COMMAND` (or `IMAGE_GENERATOR_COMMAND`) to an executable that receives one JSON job as its final argument. The job contains `project_id`, `asset_id`, `kind`, `role`, `prompt`, and `output_path`. Optional `FLUX_ARGS` / `IMAGE_GENERATOR_ARGS` may contain `{job}` and `{output}` placeholders. The command must create the requested output file; otherwise the job is marked failed.

For unattended strict generation:

```bash
REQUIRE_GENERATED_ASSETS=1
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
bash run.sh examples/karna-short.json
```

Strict real-model run:

```bash
REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 bash run.sh examples/karna-short.json
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
