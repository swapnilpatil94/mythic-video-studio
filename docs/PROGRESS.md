# Progress

## 2026-09-06 — Local runtime discovery and integration boundary

### Completed this iteration

- [x] Added `src/discover-local.ts` to inspect PATH commands and common local project directories.
- [x] Added `npm run discover:local -- <manifest>`.
- [x] Discovery records configured image/TTS/Whisper environment variables without silently selecting a provider.
- [x] Discovery checks for ffmpeg, ffprobe, Python, and possible ComfyUI/Draw Things/Whisper CLI candidates.
- [x] Discovery persists `projects/<project_id>/logs/local-runtime-discovery.json`.
- [x] Integrated discovery into `src/produce.ts` before strict preflight.
- [x] Corrected the new discovery implementation before documenting it; the committed source imports and runtime report generation are now internally consistent.

### Why this milestone

The repository is structurally ready, but the decisive M1 gap is the user's actual local model stack. The studio must reuse existing FLUX/ComfyUI, Draw Things, Chatterbox and Whisper installations rather than inventing a second stack. Discovery provides machine evidence while deliberately refusing to guess a workflow, model, voice or provider.

### Verification boundary

The implementation is committed and source-reviewed in GitHub. It has **not** been executed against the user's Mac from this environment, so no local candidate is claimed to be working and M1 remains open.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. On the target Mac run `npm install`.
2. Run `npm run discover:local -- examples/karna-short.json` and inspect `projects/karna-kavacha-demo/logs/local-runtime-discovery.json`.
3. Map the discovered working ComfyUI/Draw Things/FLUX and Chatterbox/Whisper commands into the existing provider-neutral adapters; do not create parallel stacks.
4. Run `npm run preflight -- examples/karna-short.json`.
5. Execute the strict one-command Karna production.
6. Fix runtime integration failures and rerun.
7. Review master assets, narration, alignment, mix, captions, MP4, contact sheet and QA reports.
8. Capture release evidence and hashes.
9. Tune only from observed footage/audio.
10. Close M1 only after technical, visual, audio, caption and mythology-respect gates pass.

## Exact reproducible commands

```bash
npm install
npm run discover:local -- examples/karna-short.json
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

### Expected new discovery evidence

```text
projects/karna-kavacha-demo/logs/local-runtime-discovery.json
```

## Verification policy

A checkbox means repository implementation exists and has been structurally reviewed. It does not mean a local model executed successfully. M1 remains open until a real MP4 is rendered and reviewed.

For each real run record machine/model, runtime, generated asset count, retries/failures, reference usage, motion/crop notes, visual quality, audio quality, caption/QA findings and release hashes.

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The system must support 60–90s high-retention Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, controlled cinematic motion, deep Hindi narration, sound design/music, captions, technical and visual quality gates, one-command local production, three-Short daily batching, 8–12 minute long-form episodes and later serialized season automation.
