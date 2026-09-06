# Progress

## 2026-09-06 — Local runtime preflight + strict early-failure gate

### Completed this iteration

- [x] Added `src/preflight.ts` for local production prerequisite checks.
- [x] Preflight verifies the manifest exists and checks Node, FFmpeg, FFprobe and npx availability.
- [x] Preflight verifies the configured image-generator executable when `REQUIRE_GENERATED_ASSETS=1` is enabled.
- [x] Preflight verifies the configured TTS executable when `REQUIRE_TTS=1` is enabled.
- [x] Preflight verifies the character-reference directory when `REQUIRE_CHARACTER_REFERENCES=1` is enabled.
- [x] Added persisted `projects/<project_id>/logs/preflight-report.json`.
- [x] Added `npm run preflight -- examples/karna-short.json`.
- [x] Integrated preflight into `src/produce.ts` before expensive generation for strict image/TTS runs.
- [x] Kept non-strict development runs permissive so the procedural fallback renderer remains usable without local model setup.
- [x] Updated `package.json` with the new preflight script.
- [x] Updated `docs/STATUS.md` with implementation state, commands, blockers, verification boundary and next milestone.

### Why this milestone

The repository had reached the point where the remaining M1 blocker is primarily machine-specific runtime verification. A strict run should therefore fail immediately and explain exactly which local prerequisite is missing instead of spending time preparing a project or starting model generation. This milestone creates that deterministic boundary without pretending to validate model quality.

### Verification boundary

The new code is committed to GitHub and source-reviewed. It has **not** been executed in this environment against the user's Mac, FLUX/ComfyUI installation or Chatterbox/deep-Hindi setup. Therefore the preflight implementation is not being represented as proof that those model commands work. The report only verifies executable/configuration prerequisites when run locally.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run `npm install` and `npm run preflight -- examples/karna-short.json` locally.
2. If preflight passes, execute the strict one-command Karna production.
3. Record actual FLUX/ComfyUI and Chatterbox/deep-Hindi runtime, retries, generated assets and reference usage.
4. Review the generated MP4, contact sheet, SRT/VTT, preflight report and all QA reports.
5. Tune caption safe-area styling, crop/parallax strength, black-frame thresholds and audio balance against real masters.
6. Add stronger beat-boundary visual QA only if the real footage reveals gaps not covered by the current contact sheet.
7. Only after the real MP4 passes technical, visual and audible gates, record M1 as complete.

## Exact reproducible commands

```bash
npm install
npm run preflight -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run generate:captions -- examples/karna-short.json
npm run generate:visual-qa -- examples/karna-short.json renders/karna-short.mp4
npm run check:output -- examples/karna-short.json renders/karna-short.mp4
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

The strict runner now performs the preflight before generation whenever the image or TTS strict gates are enabled.

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
