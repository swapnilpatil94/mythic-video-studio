# Progress

## 2026-09-06 — Resumable local image generation stage

### Completed this iteration

- [x] Added `src/generate-assets.ts` as the executable image-generation stage.
- [x] The stage reads the manifest-derived asset plan and processes unique master assets only.
- [x] Existing ready files are skipped instead of regenerated.
- [x] Existing files found on disk can be adopted into the registry.
- [x] Each missing asset receives a deterministic output path and a JSON job file under the project logs directory.
- [x] Each job includes project ID, asset ID, kind, story role, prompt and output path.
- [x] Local image generation is provider-neutral: `IMAGE_GENERATOR_COMMAND` or `FLUX_COMMAND` can be used.
- [x] Optional argument templates support `{job}` and `{output}` placeholders.
- [x] A generation job is accepted only when the command succeeds and the requested output file exists.
- [x] Registry status is persisted after each asset, so a later run can resume without repeating successful work.
- [x] `REQUIRE_GENERATED_ASSETS=1` provides a strict gate for the first real model run.
- [x] Added `npm run generate:assets`.
- [x] Updated `src/produce.ts` so the one-command flow now validates → prepares → generates/adopts assets → renders.
- [x] Updated status documentation with the exact adapter contract and verification boundary.

### Not claimed complete

The local image-generation stage is implemented in the repository, but **FLUX itself is not runtime-verified**. No claim is made yet about the user's model path, ComfyUI workflow, generation speed, image quality, alpha/background handling, or output dimensions. Those require execution on the target machine.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Verify the image runner against the user's actual FLUX/ComfyUI installation.
2. Add image inspection/normalization: readable image, PNG/JPEG policy, dimensions, optional alpha, file size and metadata.
3. Record generation runtime, retry count and output dimensions in the asset registry.
4. Add optional reference-image inputs for consistent characters and controlled edits.
5. Define provider-neutral TTS adapter and Chatterbox command/API adapter.
6. Add narration timing metadata and audio cache.
7. Build generated-art compositor with procedural fallback.
8. Add SVG stroke/path draw-on primitives and true layered 2.5D camera/parallax.
9. Add audio mix, captions and automated technical QA.
10. Run the complete Karna Short on the user's Mac and record real runtime/quality metrics.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run inspect -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

For a strict first model run:

```bash
REQUIRE_GENERATED_ASSETS=1 bash run.sh examples/karna-short.json
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
