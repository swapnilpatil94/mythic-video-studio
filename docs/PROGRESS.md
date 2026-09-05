# Progress

## 2026-09-05 — Pipeline foundation iteration

### Completed this iteration

- [x] Replaced loose CLI validation with shared production-manifest validation.
- [x] Validation now requires the beat-duration sum to equal the manifest duration exactly (0.01s tolerance).
- [x] Duplicate beat IDs are rejected.
- [x] Added typed production pipeline contracts for manifests and assets.
- [x] Added deterministic project directory/path management.
- [x] Added per-project asset registry with missing/ready/failed states.
- [x] Added asset existence reconciliation so stale `ready` records become `missing`.
- [x] Added automatic unique asset-plan generation from manifest references.
- [x] Added resumable project-preparation stage.
- [x] Preparation persists `manifest.json`, `asset-plan.json` and `assets/registry.json` inside the project.
- [x] Remotion composition consumes the generated runtime manifest rather than a hard-coded beat list.
- [x] Added `npm run prepare` to the supported local workflow.
- [x] Updated status tracking to distinguish implementation completion from machine-level verification.

### Not claimed complete

The following are intentionally still open:

- FLUX generation/editing adapter
- character identity/consistency workflow
- environment and prop generation
- image normalization and transparent/layered asset preparation
- Chatterbox and deep-Hindi voice integration
- audio timing/mixing
- generated-art compositing
- true SVG stroke/path draw-on system
- 2.5D layered camera/parallax
- captions
- automated QA
- real end-to-end MP4 verification

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Define provider-neutral image-generation adapter.
2. Implement local FLUX/ComfyUI-compatible adapter without hard-coding a user's installation.
3. Add asset prompt files generated from the visual bible and asset plan.
4. Add image normalization/validation and registry updates.
5. Define provider-neutral TTS adapter and Chatterbox command/API adapter.
6. Add narration timing metadata to manifests.
7. Replace procedural-only visuals with generated assets when available, while retaining fallback rendering.
8. Add audio mix and captions.
9. Run the complete Karna Short on the user's Mac.
10. Record runtime, failures, generated asset count, final render status and visual QA.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run inspect -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

## Verification policy

A checkbox means the repository implementation exists and has been structurally reviewed. It does **not** mean the local model has been executed successfully. M1 remains open until a real MP4 is rendered and reviewed.

For every completed milestone we record:

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
