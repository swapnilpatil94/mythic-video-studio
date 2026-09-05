# Progress

## 2026-09-06 — Provider-neutral Hindi narration stage

### Completed this iteration

- [x] Added `src/generate-voice.ts` as the executable narration stage.
- [x] The stage extracts `beat.narration`, falling back to `beat.text` for existing manifests.
- [x] Each narration segment receives beat ID, start time and target beat duration metadata.
- [x] Persisted `projects/<project_id>/logs/narration-job.json` as the stable handoff between the creative manifest and a local TTS engine.
- [x] Added provider-neutral command configuration through `TTS_COMMAND` / `CHATTERBOX_COMMAND`.
- [x] Added optional `{job}` and `{output}` argument placeholders.
- [x] Added optional voice and reference-audio fields for deep Hindi voice cloning.
- [x] Existing narration output is reused rather than regenerated.
- [x] A narration job is accepted only when the command succeeds and the requested output exists.
- [x] Added `REQUIRE_TTS=1` for a strict first real voice run.
- [x] Added `npm run generate:voice`.
- [x] Wired the narration stage into `src/produce.ts` before the Remotion render.
- [x] Updated `docs/STATUS.md` with the audio contract and exact strict command.

### Not claimed complete

Chatterbox/deep-Hindi voice generation is **not runtime-verified**. The repository now exposes the integration boundary, but no claim is made about the user's installed Chatterbox command/API, voice-clone model, Hindi pronunciation, generation speed, WAV format, or timing accuracy until it runs on the target machine.

## Current milestone: M1 — First real Short

### Immediate next engineering sequence

1. Verify FLUX/ComfyUI and Chatterbox against the user's actual local installations.
2. Add image runtime, retry and SHA-256 metadata to the asset registry.
3. Add reference-image inputs and semantic asset requirements for character/environment outputs.
4. Add WAV inspection and actual narration-duration validation against the beat timeline.
5. Add music/SFX adapter and final audio mix.
6. Connect generated master artwork to the Remotion compositor with layered crops, pans, zooms and draw-on transitions.
7. Add true 2.5D/parallax and SVG stroke primitives.
8. Add automated captions and technical/visual QA report.
9. Run the complete Karna Short on the target Mac and record real runtime/quality metrics.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 NORMALIZE_ASSETS=1 bash run.sh examples/karna-short.json
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
