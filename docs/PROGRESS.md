# Progress

## 2026-09-06 — Release evidence and post-render integrity

### Completed this iteration

- [x] Added `src/check-release.ts` as the post-render release-evidence boundary.
- [x] Added `npm run check:release -- <manifest> <mp4>`.
- [x] Strict mode (`REQUIRE_RELEASE_EVIDENCE=1`) requires the final MP4 and applicable evidence artifacts.
- [x] Release audit fingerprints the manifest and final MP4 with SHA-256.
- [x] Release audit records final video/audio stream metadata with `ffprobe`.
- [x] Release audit checks preflight, audio-duration, audio-alignment, output-QA, visual-QA and contact-sheet evidence when those gates are enabled.
- [x] Release audit persists `projects/<project_id>/logs/release-evidence-report.json`.
- [x] Wired the release-evidence gate into `src/produce.ts` after rendering and existing QA stages.
- [x] Extended `src/check-pipeline.ts` so the structural audit covers the release-evidence source, npm script, production wiring and strict gate.
- [x] Updated status tracking with the new evidence contract and verification boundary.

### Why this milestone

The pipeline already had many independent quality stages, but there was no final machine-readable artifact tying a specific manifest to a specific rendered MP4 and its QA evidence. The release audit closes that provenance gap without pretending that hashes or automated checks certify artistic quality.

### Verification boundary

The new code is committed and source-reviewed. It has **not** been executed against a real FLUX/ComfyUI + Chatterbox render in this environment. The release audit therefore remains structurally implemented but runtime-unverified. No M1 completion claim is made.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Run `npm install`.
2. Run `npm run check:pipeline -- examples/karna-short.json`.
3. Run `npm run preflight -- examples/karna-short.json` and resolve machine-specific failures.
4. Execute the strict one-command Karna production using the real local FLUX/ComfyUI and Chatterbox/deep-Hindi commands.
5. Review the generated master assets, narration, mix, captions, MP4, contact sheet and QA reports.
6. Run/inspect `release-evidence-report.json` and retain its manifest/output hashes.
7. Record actual model runtimes, retries, asset count, reference use and quality notes.
8. Tune only from observed footage/audio.
9. Close M1 only after technical, visual, audio, caption and mythology-respect gates pass.

## Exact reproducible commands

```bash
npm install
npm run check:pipeline -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
```

Full strict run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Post-render evidence check:

```bash
npm run check:release -- examples/karna-short.json renders/karna-short.mp4
```

### Expected release evidence

```text
projects/karna-kavacha-demo/logs/
  preflight-report.json
  audio-report.json
  audio-alignment-report.json
  output-qa-report.json
  release-evidence-report.json

projects/karna-kavacha-demo/qa/
  contact-sheet.jpg
  visual-qa-report.json
```

## Verification policy

A checkbox means repository implementation exists and has been structurally reviewed. It does not mean a local model executed successfully. M1 remains open until a real MP4 is rendered and reviewed.

For each real run record machine/model, runtime, generated asset count, retries/failures, reference usage, motion/crop notes, visual quality, audio quality, caption/QA findings and release hashes.

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The system must support 60–90s high-retention Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, controlled cinematic motion, deep Hindi narration, sound design/music, captions, technical and visual quality gates, one-command local production, three-Short daily batching, 8–12 minute long-form episodes and later serialized season automation.
