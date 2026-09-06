# Progress

## 2026-09-06 — Reference-aware master assets

### Completed this iteration

- [x] Added an optional local reference-image resolver for character/master assets.
- [x] Supports project-local `references/` and configurable `ASSET_REFERENCE_DIR`.
- [x] Supports PNG, JPEG and WebP reference files.
- [x] Added `reference_required` to the asset planning contract.
- [x] Character assets can require references with `REQUIRE_CHARACTER_REFERENCES=1`.
- [x] Character prompts now request stable facial features, costume and proportions and a composition suitable for later compositing.
- [x] Reference paths are persisted in each image job JSON.
- [x] Image generator command supports `{reference}` in `FLUX_ARGS` / `IMAGE_GENERATOR_ARGS`.
- [x] Strict generation fails clearly when a required character reference is missing.
- [x] Updated `docs/STATUS.md` with the exact reference contract and reproducible strict command.

### Verification boundary

The reference mechanism is implemented in the repository and structurally reviewed. It is **not** runtime verification of a specific FLUX/ComfyUI workflow. The local generator must actually consume the supplied reference path correctly before reference consistency can be claimed.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Add remaining semantic asset requirements (isolated/transparent character handling versus opaque environments).
2. Add per-segment narration timing/alignment and waveform inspection.
3. Add music/SFX adapter and final audio mix.
4. Connect generated master artwork to the Remotion compositor with layered crops, pans, zooms and draw-on transitions.
5. Add true 2.5D/parallax and SVG stroke primitives.
6. Add automated captions and technical/visual QA report.
7. Verify FLUX/ComfyUI and Chatterbox/deep-Hindi against the user's actual local installations.
8. Run the complete Karna Short on the target Mac and record real runtime/quality metrics.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Reference-aware strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Optional reference layout:

```text
projects/<project_id>/references/karna.master.png
projects/<project_id>/references/indra.master.png
```

or set:

```bash
ASSET_REFERENCE_DIR=/path/to/references
```

If the local image command supports a separate reference argument, configure `{reference}` in its argument template. The job JSON always includes `reference_path` when one is resolved.

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
