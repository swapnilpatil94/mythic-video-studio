# Progress

## 2026-09-06 — Kathaaya Studio UI + universal long-form manifest foundation

### Completed this iteration

- [x] Added minimal local Kathaaya Studio UI under `studio/`.
- [x] Added project dashboard, New Project, project listing, deletion and canonical JSON editing.
- [x] Added one-paste Story Package import that splits into `project.json`, `story.json`, `script.json`, `manifest.json`, `characters.json` and `metadata.json`.
- [x] Added canonical `prompts/story-package.md` for ChatGPT/Claude story generation.
- [x] Added `schemas/story-package.schema.json` and `schemas/production-manifest.schema.json`.
- [x] Added `npm run studio` launcher.
- [x] Added Short/Long-form project metadata without creating a second renderer.
- [x] Made production manifest validation format-aware: Short 45–120s; Long-form 120–1800s; Long-form requires at least 10 beats.
- [x] Added `examples/karna-longform-test.json` with a 180s/10-beat smoke fixture.
- [x] Extended pipeline audit to include Studio, Story Package contracts and universal manifest schema.
- [x] Updated status documentation with verified implementation boundaries and reproducible commands.

### Verification boundary

The repository changes are committed, but this automation environment cannot install dependencies or execute the user's Mac-local FLUX/ComfyUI, Chatterbox and Whisper stack. A direct clone/runtime verification attempt failed because outbound DNS/network access is unavailable here. Therefore the UI is **implemented but not runtime-verified in this environment**.

The long-form validator is implemented and the 180-second fixture is committed, but no real long-form MP4 has been rendered/reviewed yet. Do not mark Long-form complete until that happens on the target Mac.

## Previous milestone — Research-informed whiteboard draw primitive

- [x] Added staged `DrawSweep` with deterministic SVG stroke progression, delayed strokes, artist-hand cue and leading cursor.
- [x] Preserved FLUX raster master strategy and one universal Remotion renderer.
- [ ] Real local render verification remains open.

## Current next milestones

1. **Local UI verification:** install dependencies, run `npm run typecheck`, start `npm run studio`, create a Short and Long-form project, import a real Story Package and verify persistence/editing.
2. **Real Long-form:** use the 180s fixture first; then a real 3–4 minute Kathaaya story package with Chatterbox + Whisper + FLUX + Remotion; inspect dense frames, audio and QA.
3. **Short visual gate:** continue improving actual draw/action/composition quality; the latest Short is not approved as the final visual milestone yet.
4. **Repeatability:** three different mythology Shorts without renderer changes.
5. **Scale:** 8–12+ minute long-form, then season automation.

## Exact reproducible commands

```bash
npm install
npm run typecheck
npm run studio
# open http://127.0.0.1:4317
```

```bash
npm run check:pipeline -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run check:visual-beats -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
```

Long-form smoke validation:

```bash
npm run validate -- examples/karna-longform-test.json
npm run check:pipeline -- examples/karna-longform-test.json
```

Strict real-model production:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh <manifest.json> <output.mp4>
```

Post-render:

```bash
npm run generate:visual-qa -- <manifest.json> <output.mp4>
npm run check:output -- <manifest.json> <output.mp4>
npm run check:release -- <manifest.json> <output.mp4>
```

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

Kathaaya must support 60–90s high-retention Hindi mythology Shorts and 8–15+ minute long-form episodes using one universal, format-aware visual engine, reusable master assets, reference-guided consistency, mythology-respect mode, controlled cinematic motion, Hindi narration, sound design/music, kinetic captions, quality gates and one-command local production.
