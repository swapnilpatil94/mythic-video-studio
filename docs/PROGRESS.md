# Progress

## 2026-09-06 — Local image integration foundation

### Completed this iteration

- [x] Added a provider-neutral `ImageAdapter` contract.
- [x] Added a JSON-command image adapter that can wrap a local FLUX/ComfyUI runner without hard-coding its installation.
- [x] Added deterministic output-path and missing-output checks to the image adapter.
- [x] Added a master-asset prompt planner that deduplicates asset references across beats.
- [x] Prompt planning now carries story-role context into each unique asset job instead of creating one generation job per shot.
- [x] Added explicit sacred-figure visual guardrails to generated prompts: dignified, non-comedic, non-caricatured, no UI/text/watermarks.
- [x] Rewired the asset plan to use the richer prompt planner.
- [x] Documented the local adapter configuration surface in `config/.env.example`.
- [x] Updated `docs/STATUS.md` with the new milestone, blocker boundary and verification rules.

### Not claimed complete

The adapter is intentionally **not** marked as FLUX-integrated. The repository has a stable contract, but the user's actual FLUX/ComfyUI command or endpoint has not been executed here. No model runtime, generation speed, image quality, or output compatibility is being claimed.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Add a concrete local FLUX/ComfyUI bridge against the configured command or endpoint.
2. Generate only missing master assets from `asset-plan.json` and update the registry after each successful file.
3. Add image dimensions/format validation and normalization.
4. Add optional reference-image paths for character consistency/editing.
5. Define provider-neutral TTS adapter and Chatterbox command/API adapter.
6. Add narration timing metadata and audio cache.
7. Replace procedural-only visuals with generated assets when available, retaining fallback rendering.
8. Add SVG stroke/path draw-on primitives and true layered 2.5D camera/parallax.
9. Add audio mix, captions and automated technical QA.
10. Run the complete Karna Short on the user's Mac and record real runtime/quality metrics.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run inspect -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
bash run.sh examples/karna-short.json
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
