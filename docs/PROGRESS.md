# Progress

## 2026-09-06 — Asset provenance, retry and runtime tracking

### Completed this iteration

- [x] Added SHA-256 hashing for asset files.
- [x] Extended `AssetRecord` with provenance fields: `sha256`, `generated_at`, `generation_runtime_ms`, `attempts`, and `last_error`.
- [x] Existing ready assets without a hash are hashed instead of regenerated.
- [x] Existing output files are adopted with a SHA-256 digest.
- [x] Image generation now has a configurable retry loop via `IMAGE_GENERATION_MAX_ATTEMPTS` (default `2`).
- [x] Each successful generation records total wall-clock generation time.
- [x] Failed generation records cumulative attempts and the last error.
- [x] Strict mode still stops on failed or missing assets.
- [x] Updated `docs/STATUS.md` with the new contract and exact commands.

### Verification boundary

The implementation is repository-complete for this milestone and was written against the current asset-generation contract. It is **not** runtime verification of FLUX/ComfyUI. No claim is made about actual model generation speed, image quality, or provider-specific behavior until the configured local command executes on the target machine.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Add reference-image inputs and semantic asset requirements for character/environment outputs.
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

Strict first real-model run:

```bash
REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
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
