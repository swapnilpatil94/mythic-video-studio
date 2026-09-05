# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation

**North star:** one command produces a publishable Hindi mythology video.

**Current engineering focus:** resumable local master-asset generation, with a provider-neutral FLUX/ComfyUI command boundary and deterministic renderer fallback.

## Done — verified in repository

- [x] GitHub repository created
- [x] Product vision documented
- [x] Architecture documented
- [x] Short-first strategy documented
- [x] Long-form scaling strategy documented
- [x] Mythology Respect Mode documented
- [x] High-retention story structure documented
- [x] Master-asset generation strategy documented
- [x] Frontier/Work creative artifact workflow documented
- [x] Goals and quality criteria tracking
- [x] Sample/reference tracking
- [x] JSON Short manifest contract
- [x] Shared production manifest types
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
- [x] Shared validation wired into CLI
- [x] One-command entry point exists (`bash run.sh <manifest>`)
- [x] Provider-neutral image adapter interface
- [x] Command-based local image adapter contract
- [x] Master-asset prompt planner derived from beat references
- [x] Sacred-figure prompt guardrails in the generated image contract
- [x] Local adapter configuration documented
- [x] Resumable missing-master-asset generation runner
- [x] Existing output adoption into the asset registry
- [x] Per-job JSON handoff containing prompt, role, asset ID and output path
- [x] Optional strict image-generation mode (`REQUIRE_GENERATED_ASSETS=1`)
- [x] One-command runner now prepares the project and executes the image stage before rendering

## In progress

- [ ] Verify the image runner against the user's actual FLUX/ComfyUI installation
- [ ] Generate and validate real character master art
- [ ] Environment/prop generation and normalization
- [ ] Transparent/layered asset preparation
- [ ] Image dimensions/format validation
- [ ] Asset registry metadata such as dimensions/hash/runtime
- [ ] Optional reference-image paths for character consistency/editing
- [ ] Chatterbox adapter
- [ ] Deep Hindi voice-clone adapter
- [ ] Voice asset cache + timing alignment
- [ ] Music/SFX adapter
- [ ] SVG draw-on animation primitives
- [ ] True layered 2.5D camera/parallax system
- [ ] Generated-art compositing with procedural fallback
- [ ] Automated subtitles/captions
- [ ] Final audio mix
- [ ] Automated visual/technical QA report
- [ ] End-to-end real Karna render on the user's machine

## Blockers

No repository-level blocker is preventing further coding. The remaining integration blocker is machine-specific: the exact local FLUX/ComfyUI invocation is not verified in this environment. The runner accepts a configured command but deliberately does not invent a model-specific command.

## Image adapter contract

Set `FLUX_COMMAND` (or the more generic `IMAGE_GENERATOR_COMMAND`) to an executable that receives one JSON job as its final argument. The job contains `project_id`, `asset_id`, `kind`, `role`, `prompt`, and `output_path`. Optional `FLUX_ARGS` / `IMAGE_GENERATOR_ARGS` may contain `{job}` and `{output}` placeholders. The command must create the requested output file; otherwise the job is marked failed.

For unattended strict generation, set:

```bash
REQUIRE_GENERATED_ASSETS=1
```

Without strict mode, missing/unconfigured image generation is recorded and the procedural renderer may continue. This preserves recoverability while preventing a missing model from being mistaken for a successful generated-art stage.

## Pending user inputs — only when adapter wiring begins

1. FLUX model location **or** local API/ComfyUI endpoint/command.
2. Chatterbox installation/command **or** local API endpoint.
3. Deep Hindi voice-clone model location/invocation method.
4. Optional local music/SFX model if available; otherwise use the adapter contract.
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
bash run.sh examples/karna-short.json
```

For the first real FLUX run, configure the local command in `.env` and use strict mode:

```bash
REQUIRE_GENERATED_ASSETS=1 bash run.sh examples/karna-short.json
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
