# Progress

## 2026-09-06 — Visual beat engine / cinematic ink compositor

### Completed this iteration

- [x] Added `src/remotion/visual-beats.tsx` with reusable ink reveal, wash reveal and transition primitives.
- [x] Added animation profiles that map manifest animation names to reveal direction, wash treatment and text mode.
- [x] Updated `src/remotion/MythicShort.tsx` so the compositor now consumes those profiles.
- [x] Added beat-role framing so one master character asset can be reframed for hook, armor, stakes, threat, visitor, request, decision, sacrifice, reveal and payoff beats.
- [x] Added progressive image reveals and ink-stroke overlays instead of relying only on camera zoom/pan.
- [x] Added restrained gold/red/warm wash pulses and ink transition wipes.
- [x] Added three caption modes: smaller narration caption, dramatic keyword, and larger reveal text.
- [x] Added `src/check-visual-beats.ts` and `npm run check:visual-beats -- examples/karna-short.json`.
- [x] Preserved provider-neutral FLUX/image generation, Chatterbox/TTS, Whisper/audio gates, master-asset reuse and one-command orchestration.

### What this changes

The compositor is now explicitly organized around **visual beats**, not just whole-image shots. The same generated master art can be revealed, reframed, washed, parallaxed and paired with different typography/effects according to the story beat. This is the intended path from a motion-comic slideshow toward the project's Cinematic Indian Ink Whiteboard target.

### Verification boundary

The code changes are committed and source-reviewed in GitHub. The new visual engine has **not** been rendered against the user's actual Mac/local generated assets in this environment. Therefore this iteration is not marked as a passing M1 render and no visual-quality claim is made beyond the implemented architecture.

## Previous milestone — Local runtime discovery

- [x] Added `src/discover-local.ts` and `npm run discover:local -- <manifest>`.
- [x] Discovery records PATH tools, configured image/TTS/Whisper environment variables and common local project candidates.
- [x] Discovery persists `projects/<project_id>/logs/local-runtime-discovery.json`.
- [x] Integrated discovery into `src/produce.ts` before strict preflight.
- [x] Kept provider/workflow selection explicit; no local model is claimed working until executed.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. On the target Mac run `npm install`.
2. Run `npm run discover:local -- examples/karna-short.json` and inspect the generated discovery report.
3. Map only the actually working local FLUX/ComfyUI or Draw Things and Chatterbox/Whisper commands into the existing adapters.
4. Run `npm run check:visual-beats -- examples/karna-short.json` and the other structural gates.
5. Execute the strict one-command Karna production.
6. Inspect the real master assets, visual-beat timing, narration, alignment, mix, captions, contact sheet and QA reports.
7. Fix observed runtime/compositor issues and rerender.
8. Capture release evidence and hashes.
9. Close M1 only after technical, visual, audio, caption and mythology-respect gates pass.

## Exact reproducible commands

Structural:

```bash
npm install
npm run discover:local -- examples/karna-short.json
npm run check:pipeline -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
npm run check:visual-beats -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
```

Strict production:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Post-render:

```bash
npm run generate:visual-qa -- examples/karna-short.json renders/karna-short.mp4
npm run check:output -- examples/karna-short.json renders/karna-short.mp4
npm run check:release -- examples/karna-short.json renders/karna-short.mp4
```

### Verification policy

A checkbox means repository implementation exists and has been structurally reviewed. It does not mean a local model executed successfully. M1 remains open until a real MP4 is rendered and reviewed.

For each real run record machine/model, runtime, generated asset count, retries/failures, reference usage, motion/crop notes, visual quality, audio quality, caption/QA findings and release hashes.

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The system must support 60–90s high-retention Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, controlled cinematic motion, deep Hindi narration, sound design/music, captions, technical and visual quality gates, one-command local production, three-Short daily batching, 8–12 minute long-form episodes and later serialized season automation.
