# Implementation Status

Updated: 2026-09-06

## Overall

**Phase:** M1 — production pipeline implementation

**North star:** one command produces a publishable Hindi mythology video.

**Current engineering focus:** deterministic final audio mixing is now implemented as a provider-neutral FFmpeg stage. The next focus is reusable cinematic animation primitives and true layered 2.5D motion.

## Done — implemented and structurally verified in repository

- [x] GitHub repository created
- [x] Product vision and architecture documented
- [x] Short-first and long-form scaling strategy documented
- [x] Mythology Respect Mode documented
- [x] High-retention story structure documented
- [x] Master-asset generation strategy documented
- [x] Frontier/Work creative artifact workflow documented
- [x] Goals, quality criteria and sample/reference tracking
- [x] JSON Short manifest contract and shared production types
- [x] Strict duration/beat/duplicate-ID validation
- [x] Manifest-driven Remotion beat timeline
- [x] 1080x1920 / 30fps Short composition
- [x] Procedural illustrated fallback renderer
- [x] Beat-driven camera/animation system
- [x] Hindi text layer
- [x] Local production runner skeleton
- [x] Project path manager
- [x] Resumable per-project asset registry/cache contract
- [x] Automatic unique asset-plan derivation from a manifest
- [x] Project preparation stage
- [x] Provider-neutral image adapter and command-based local image contract
- [x] Master-asset prompt planner with sacred-figure guardrails
- [x] Resumable missing-master-asset generation runner
- [x] Existing output adoption into the registry
- [x] Per-job JSON image handoff
- [x] Optional strict image-generation mode
- [x] PNG/JPEG probing, dimension validation and PNG alpha detection
- [x] Optional FFmpeg oversized-image normalization
- [x] Registry width/height metadata after inspection/normalization
- [x] Strict image inspection gate before rendering
- [x] Provider-neutral Hindi TTS job contract
- [x] Chatterbox-compatible command boundary (`TTS_COMMAND` / `CHATTERBOX_COMMAND`)
- [x] Beat narration extraction with timing metadata
- [x] Narration job JSON persisted under project logs
- [x] Optional reference-voice path passed through the TTS job
- [x] Resumable narration output check
- [x] Optional strict TTS gate (`REQUIRE_TTS=1`)
- [x] WAV duration inspection with `ffprobe`
- [x] Audio duration report persisted under project logs
- [x] Strict narration-duration gate before rendering
- [x] One-command runner executes audio validation in strict mode
- [x] SHA-256 asset provenance fields in the registry
- [x] Asset generation attempt counting
- [x] Asset generation runtime measurement
- [x] Asset generation last-error persistence
- [x] Automatic retry loop for missing generated assets
- [x] Optional local character-reference image resolver
- [x] Reference-aware character master prompts
- [x] Strict missing-reference failure mode
- [x] Reference path persisted in image job JSON and passed through `{reference}` command placeholder
- [x] Renderer asset staging from validated project assets into `public/generated/<project_id>`
- [x] Runtime asset-reference map generated before Remotion render
- [x] Remotion can layer staged master artwork behind/alongside procedural illustration
- [x] Generated-art camera entrance/drift and character/environment/prop placement fallback rules
- [x] Semantic asset requirement module
- [x] Asset requirement report generation
- [x] Asset registry persists probed alpha metadata (`alpha`)
- [x] Image inspection/normalization persists measured alpha metadata
- [x] Semantic asset gate consumes persisted alpha metadata in strict production
- [x] Per-beat narration alignment analysis using FFmpeg `silencedetect`
- [x] Per-beat target/speech/silence timing report persisted under project logs
- [x] Strict narration alignment gate integrated into one-command production
- [x] Deterministic narration/music/SFX FFmpeg mixer
- [x] Configurable music and SFX gain controls
- [x] Beat-start SFX scheduling by manifest timing
- [x] Final mix WAV normalized to 48 kHz stereo with limiter
- [x] Strict final-audio-mix gate (`REQUIRE_AUDIO_MIX=1`)
- [x] Final mix staged into Remotion public audio space
- [x] Remotion plays staged final mix when present

## In progress

- [ ] Runtime verification against the user's actual FLUX/ComfyUI installation
- [ ] Runtime verification against the user's actual Chatterbox/deep-Hindi voice setup
- [ ] Validate semantic audio alignment and mix levels against real generated narration
- [ ] SVG draw-on animation primitives beyond the current procedural fallback
- [ ] True layered 2.5D camera/parallax system
- [ ] Generated-art visual QA and character consistency review
- [ ] Automated subtitles/captions
- [ ] Automated visual/technical QA report
- [ ] End-to-end real Karna render on the user's machine

## Blockers

No repository-level blocker is preventing further coding. Machine-specific blockers remain: the exact local FLUX/ComfyUI invocation and Chatterbox/deep-Hindi invocation are not verified in this environment. The audio mixer also needs a real narration/music/SFX set to validate perceived loudness, ducking, and artistic balance; the current mix is deterministic but not claimed as mastered for release.

## Audio mix contract

`src/mix-audio.ts` accepts the manifest narration path, optional music path, and optional per-beat SFX files under the configured SFX directory. Music is looped and attenuated, SFX are delayed to each beat start and attenuated, and all active tracks are mixed to a 48 kHz stereo WAV with a final limiter. The result is `projects/<project_id>/audio/final-mix.wav`. Strict mode is enabled with `REQUIRE_AUDIO_MIX=1`.

## Verification boundary

Repository implementation is not the same as runtime verification. M1 cannot be marked complete until local dependencies/models are actually executed, real artwork/audio are generated, the final mix is listened to, and a final MP4 is rendered and visually/audibly reviewed on the target machine.

## Exact reproducible commands

```bash
npm install
npm run validate -- examples/karna-short.json
npm run inspect -- examples/karna-short.json
npm run prepare -- examples/karna-short.json
npm run generate:assets -- examples/karna-short.json
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
npm run check:asset-requirements -- examples/karna-short.json
npm run generate:voice -- examples/karna-short.json
npm run inspect:audio -- examples/karna-short.json
npm run align:audio -- examples/karna-short.json
npm run mix:audio -- examples/karna-short.json
npm run stage:assets -- examples/karna-short.json
bash run.sh examples/karna-short.json
```

Strict first real-model run:

```bash
REQUIRE_CHARACTER_REFERENCES=1 REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=2 bash run.sh examples/karna-short.json
```

Audio input layout for the optional mix stage:

```text
projects/karna-kavacha-demo/audio/
  narration.wav
  music.wav              # optional; manifest audio.music_path points here
  sfx/
    B01.wav              # optional
    B02.wav              # optional
    ...
```

## Release gates

### Gate M1 — first real Short

Final MP4 from one manifest using local FLUX/TTS/audio adapters, with technical and visual QA passed.

### Gate M2 — repeatability

Three different Shorts through the same pipeline without renderer code changes.

### Gate M3 — daily production

Queue of three Shorts/day with caching, resumability and failure recovery.

### Gate M4 — long-form

8–12 minute episodes using the same visual engine and larger manifests.

### Gate M5 — season automation

Source/season bible, episode manifests and recoverable batch queue.
