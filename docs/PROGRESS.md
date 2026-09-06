# Progress

## 2026-09-06 — Deterministic pipeline-contract audit

### Completed this iteration

- [x] Added `src/check-pipeline.ts`.
- [x] Added `npm run check:pipeline -- examples/karna-short.json`.
- [x] Audit verifies the manifest exists.
- [x] Audit verifies every required production entrypoint exists.
- [x] Audit verifies expected npm scripts are exposed.
- [x] Audit verifies every major production stage is referenced by `src/produce.ts`.
- [x] Audit verifies all strict release gates are wired into the production runner.
- [x] Audit emits a machine-readable JSON report and exits non-zero on a contract mismatch.
- [x] Updated `docs/STATUS.md` with the new gate, command, blocker state and next milestone.

### Why this milestone

The repository has accumulated enough independent stages that a future refactor could silently leave a stage file or quality gate disconnected from the one-command path. This audit creates a cheap deterministic guard against that class of regression before spending time on local FLUX/TTS generation.

### Verification boundary

The implementation is committed to GitHub and source-reviewed. It has **not** been executed in this environment, so this turn does not claim that the audit command itself has passed locally. It is a structural contract check only and intentionally does not pretend to validate model quality or final-video quality.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run `npm install` and `npm run check:pipeline -- examples/karna-short.json` locally.
2. Run `npm run preflight -- examples/karna-short.json` and resolve any local runtime failures.
3. Execute the strict one-command Karna production with the real FLUX/ComfyUI and Chatterbox/deep-Hindi commands.
4. Record actual model runtimes, retries, generated asset count, reference usage and failures.
5. Review the rendered MP4, contact sheet, captions and technical/visual/audio QA reports.
6. Tune caption safe areas, camera/parallax strength, black-frame threshold and audio balance from real evidence.
7. Only after the real MP4 passes technical, visual and audible gates, record M1 as complete.

## Exact reproducible commands

```bash
npm install
npm run check:pipeline -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
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
- motion/crop notes
- visual quality notes
- audio quality notes
- caption/QA notes
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
- captions/subtitles
- technical and visual quality gates
- one-command local production after one-time setup
- three-Short daily batching
- 8–12 minute long-form episodes using the same engine
- serialized season/episode automation later
