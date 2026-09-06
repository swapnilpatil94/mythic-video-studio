# Progress

## 2026-09-06 — Semantic asset requirements

### Completed this iteration

- [x] Added `src/pipeline/asset-requirements.ts` with deterministic requirements by asset kind.
- [x] Character masters are classified as `isolated-transparent` and require alpha-capable artwork.
- [x] Environment/background assets are classified as `opaque-full-frame`.
- [x] Overlay assets are classified as `transparent-overlay`.
- [x] Supporting props default to `opaque-supporting` until segmentation is explicitly requested.
- [x] Added minimum/maximum dimension requirements per asset class.
- [x] Added `src/check-asset-requirements.ts` to generate a non-mutating requirement report.
- [x] Added `npm run check:asset-requirements`.
- [x] Strict production can now fail on semantic requirement errors with `REQUIRE_ASSET_REQUIREMENTS=1`.
- [x] Updated `src/produce.ts` to run the semantic gate before narration/rendering when strict mode is enabled.
- [x] Updated `package.json` with the new check command.
- [x] Updated `docs/STATUS.md` to track the semantic contract and its verification boundary.

### Verification boundary

The new TypeScript files and package integration were committed and re-read through GitHub. This is **structural verification only**. No claim is made that an actual FLUX-generated transparent character master passes the alpha requirement until a real generated asset is inspected on the target machine.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Make semantic requirements enforceable after image inspection/normalization, including persisted `alpha` metadata in the registry.
2. Add per-segment narration timing/alignment and waveform inspection.
3. Add music/SFX adapter and final audio mix.
4. Expand compositor into reusable layered crops, pans, zooms and SVG draw-on transitions.
5. Add true 2.5D/parallax and deterministic depth rules.
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
npm run check:asset-requirements -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
npm run stage:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
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
