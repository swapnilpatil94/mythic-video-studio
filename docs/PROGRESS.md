# Progress

## 2026-09-06 — Semantic asset alpha persistence and enforcement

### Completed this iteration

- [x] Added optional `alpha` metadata to `AssetRecord`.
- [x] Updated `inspect-assets.ts` to persist measured PNG/JPEG alpha capability into the project registry.
- [x] Updated `normalize-assets.ts` to re-probe normalized output and persist its actual alpha capability.
- [x] Semantic asset requirements now evaluate the persisted probe result instead of relying on an unpopulated field.
- [x] Strict production already invokes `check:asset-requirements` after image inspection/normalization when `REQUIRE_ASSET_REQUIREMENTS=1`, so the semantic gate now has the metadata it needs to reject non-transparent character/overlay masters.
- [x] Updated `docs/STATUS.md` with the implementation boundary and exact strict command.

### Verification boundary

The changed repository files were written through GitHub and the resulting commits were accepted. This is repository-level structural verification only. No claim is made that a real FLUX-generated character master has passed the gate until an actual image is generated and inspected on the target machine.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Add per-segment narration timing/alignment and waveform inspection, including measured duration for each beat's narration rather than only whole-track duration.
2. Add music/SFX adapter and deterministic final audio mix.
3. Expand compositor into reusable layered crops, pans, zooms and SVG draw-on transitions.
4. Add true 2.5D/parallax and deterministic depth rules.
5. Add automated captions and technical/visual QA report.
6. Verify FLUX/ComfyUI and Chatterbox/deep-Hindi against the user's actual local installations.
7. Run the complete Karna Short on the target Mac and record real runtime/quality metrics.

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
