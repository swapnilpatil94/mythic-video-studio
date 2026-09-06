# Progress

## 2026-09-06 (story-package contract session) — main branch reconciliation + story package contract

Brief: "create pr and merge" the prior session's pending work, then implement the story package
contract (`prompts/story-package.md`, `schemas/story-package.schema.json`) for real — implement,
validate, test with a real Karna example, fix, not just document.

### Main branch reconciliation

`origin/main` had diverged ~60 commits (a parallel, never-tested-on-Mac line of work: a vanilla-JS
Studio, a manual `tempo_profile` timing model, draft story-package files). Per explicit user
direction, merged keeping this session's React/Vite Studio and Whisper-driven compositor canonical,
discarded the parallel Studio/timing model, kept independently-useful non-conflicting pieces (CI
workflow, a long-form test fixture). PR #1 opened and merged after CI passed.

### Story package contract — implemented, not just documented

- `prompts/story-package.md`: full authoring prompt (research-first, mythology rule, the 10-section
  contract, SHORT/LONGFORM guidance, "visual events not image counts").
- `schemas/story-package.schema.json`: strict (`additionalProperties: false` throughout), with
  required-field lists hand-verified against the actual zod enforcement so the two can't drift.
- `src/studio/story-package.ts`: `StoryPackageSchema` (zod, `.strict()`) is the enforced contract;
  `splitStoryPackage` joins `visual_manifest.beats` to `script.beats` by `id` to build the same
  `manifest.json` the pipeline already consumes, extended with new optional fields on
  `ProductionBeat`/`manifest.audio` (`src/pipeline/types.ts`) so the richer data survives losslessly.
  Flat-manifest quick-import kept as a fallback, not replaced.
- Updated `src/studio/schemas.ts` and every affected web tab (Story/Script/Characters/Metadata/
  Overview) to the new field set — verified a schema nobody's UI can read/write isn't "implemented."

### Verified with a real Karna example

`examples/karna-story-package-test.json` — built from the real, already-produced Karna kavacha
narration (not placeholder text). `/story-package/validate` → ok, zero warnings. `/projects/import`
→ real files on disk. `npx tsx src/cli.ts validate` on the resulting manifest.json (the actual
unmodified pipeline command) → **PASS**. `prepare-project.ts` → real asset-plan.json with correctly
beat-derived prompts. A real `remotion still` render completed without error. Web UI tabs verified
via real browser clicks — Story/Characters/Visuals render the imported content correctly, zero
console errors.

**Bug found and fixed during this verification**: `/projects/import`'s slug selection picked
`project_name` (often Hindi text, stripped to nothing by `slugify()`) before the already-slugified
`project_id`, silently producing `untitled-project`. Reproduced with the real Karna package (Hindi
title), fixed the priority order, reran, confirmed the correct slug.

**Honest scope boundary**: the new beat/audio fields persist correctly but aren't wired into the
compositor's actual shot-selection/rendering decisions, and `sacred_or_respected` doesn't yet
differentially alter asset-generation prompts beyond the existing character-kind default — both
would be materially larger changes than "implement the contract."

## 2026-09-06 (KATHAAYA Studio session) — Local project-manager UI, KATHAAYA branding, safe zones

Brief: build a local Studio UI (dashboard, per-project management, story-package import, production runner) on top of the existing pipeline — explicitly no second renderer, no pipeline rebuild, no new frontend framework, code→run→test→fix with no plan document. Also: replace the old header/footer video branding with KATHAAYA (subtle open, minimal watermark, full end card), and add configurable, collision-aware platform safe zones so subtitles land in a real lower-storytelling zone instead of the visual center.

### Built

- `src/studio/` — API server (`server.ts`, plain `node:http`, no Express), project file store (`project-store.ts`, zod-validated via `schemas.ts`), story-package splitter (`story-package.ts`), a read-only wrapper around the existing `src/remotion/format.ts` (`format-profiles.ts` — not a second tuning system), and the `run.sh` process runner (`run-pipeline.ts`).
- `src/shared/platform-profiles.ts` + `brand.ts` — safe-zone and brand data imported by both the Studio UI and the Remotion compositor, so the diagram the UI draws and what the renderer actually does can't drift apart.
- `web/` — Vite + React 19 + TypeScript SPA. Dashboard, New Project (blank or story-package import), and ten project tabs (Overview/Story/Script/Visuals/Characters/Assets/Audio/Metadata/Production/QA). One command: `npm run studio`.
- Project layout: `projects/<id>/{project,story,script,manifest,characters,metadata}.json` + `assets/audio/renders/qa/`. `manifest.json` at this path is the same file `prepare-project.ts` already used — not a new convention, just five new sibling files the pipeline itself never reads.

### Compatibility fixes (small, required for the above to actually work)

- `validate-manifest.ts`/`short-manifest.schema.json`: `duration_seconds` max 120s → 1200s, since the compositor already treats >120s as long-form via `profileFor` but the validator still hard-rejected it — a LONGFORM project from the Studio could never have passed validation otherwise.
- `run.sh`: optional second `OUTPUT` arg, fully backward-compatible. Needed because every Studio project's manifest is named `manifest.json`, and `produce.ts`'s default output path is derived from the manifest's filename — without this every project would collide on `renders/manifest.mp4`.

### KATHAAYA branding (in the actual rendered video, not just the UI)

Removed the old "MYTHIC STORIES"/"SOURCE • STORY • REVEAL" header and "hand-illustrated..." footer from `MythicShort.tsx`. Added `BrandWatermark` (small persistent corner mark that starts larger and settles over ~1.1s — doubles as the "subtle opening identity") and `EndCard` (full KATHAAYA + tagline card fading in over the final 1.6s, overlaid on the last beat rather than extending `duration_seconds`, which would have reopened the previous session's audio-tail-timing fix).

### Platform safe zones

`src/shared/platform-profiles.ts` defines `youtube_shorts`/`instagram_reels` chrome zones plus a `subtitleZone` centered at Y=1540 (within the requested 1500-1580 band, in the lower third — not the frame center). `resolveSubtitleCenterY` only nudges the position if the rectangle would actually overlap a platform's bottom UI zone; both platforms currently resolve un-nudged. `KineticCaption`'s position moved from a flat `bottom: 70` to this resolved Y.

### Bugs found and fixed during verification (not just claimed working)

- `ProjectView`'s active tab didn't follow a hash change to the same already-mounted project (tab state was set once on mount) — a bookmarked `#/project/<id>/qa` link or back/forward wouldn't select the right tab. Fixed with a `useEffect` synced to the `initialTab` prop.
- The API server sent no cache headers; the browser cached an early 404 (from testing before the `/assets` endpoint existed) and kept serving it across a hard reload even after the server was fixed. Reproduced via network-log inspection, fixed with `cache: 'no-store'` client-side and `Cache-Control: no-store` server-side, then confirmed gone.
- The first version of `check-output.ts`'s trailing-silence detection (from the previous session) needed no changes here, but this session's real re-render re-confirmed it still reports the correct `1.921` — the audio-tail fix and this session's changes don't interact badly.

### Verification boundary

- API, curl-tested: created a project → real files on disk → `npx tsx src/cli.ts validate <generated manifest>` (the actual unmodified pipeline command) → **PASS**.
- Import fidelity: pasted the real `examples/karna-short.json` through the import endpoint; resulting `manifest.json` diffed **byte-identical** to the source (aside from `project_id`) via a Python structural comparison, re-validated PASS.
- Web UI driven with real clicks via the Browser tool (not simulated): full New Project flow, full Story Package Import flow (paste → validate → import → real project), Visuals tab's live format-profile + safe-zone diagram, Assets tab rendering a real generated FLUX PNG through the file-serving endpoint, QA tab rendering a real contact sheet.
- Production tab's Run button: clicked for real; `ps aux` confirmed it launched an actual `mflux-generate` subprocess — the same real adapter chain `run.sh` uses — before being deliberately killed once confirmed (a throwaway test project, not worth a full real generation).
- Full real pipeline re-render of `karna-kavacha-demo` after all changes: exit code 0, `output-qa`/`release-evidence` both PASS, trailing silence still `1.921s`, sha256 `77c70e448b663f7627798a00a184150863f94a4ae2b938c5d1697f41f9b69c56`. Dense frames pulled directly from this real render confirm the KATHAAYA watermark (small, top-right, clear of art), the removed old header/footer, captions in the new lower safe zone, and a real full-screen KATHAAYA end card at the tail.
- Not done: no automated test suite (matches this repo's existing verification style); LONGFORM validated only structurally (passes the validator), no real long-form video produced through the Studio yet.

## 2026-09-06 (sub-shot cuts + audio fix session) — Within-beat cuts, tail-silence bug fix, integrated captions

Trigger: the user directly inspected the previous session's real MP4 and refused to accept it as finished — it still read as "finished illustration + reveal" rather than drawn-and-acted, the tracing pen alone wasn't real "whiteboard" proof, pacing had too much static composition, kinetic captions read as a subtitle banner, and (the one fully concrete, user-verified defect) **the final MP4 had ~3.95s of true trailing silence**, found by listening to the actual file directly, not from Whisper alignment data.

### Audio tail-silence bug

- [x] Root-caused via direct `ffprobe` on the real files: `narration.wav`/`final-mix.wav` both legitimately end ~73.3s (no TTS/mix bug — no music bed in this project, `amix duration=first`); the manifest's total `duration_seconds` (77s) simply had too generous a buffer versus real narration length, and Remotion renders the full manifest-driven frame count regardless. `inspect-audio.ts`'s `AUDIO_DURATION_TOLERANCE_SECONDS=10` (needed for natural TTS variance) was far too loose to catch a ~4s tail gap.
- [x] Retimed `examples/karna-short.json` (`duration_seconds` 77→75, `B09`/`B10` 9→8 each) — closes the gap to a measured, real 1.92s.
- [x] Added a permanent gate in `src/check-output.ts`: `ffmpeg silencedetect` on the actual rendered MP4's audio track, failing if trailing silence exceeds `AUDIO_TRAILING_SILENCE_MAX_SECONDS` (default 2.0s) — validates the FINAL MIX/output directly per the user's explicit instruction, not Whisper word timing. Caught and fixed a bug in this new check itself mid-session (ffmpeg's synthetic EOF `silence_end` made the first version under-report `0` instead of the real `1.921`).

### Visual: within-beat sub-shot cuts

- [x] `src/remotion/shots.ts`: `subShotSequence(role, variant)` — 2-3 crops of the same master asset per `visual_role` (e.g. armor_reveal: chest-wide → armor-detail → face-reaction), generic 3-sequence fallback for unknown roles.
- [x] `src/remotion/MythicShort.tsx`: character layers hard-cut between sub-shots at equal windows within a beat (`activeSubShot`), with a snap-zoom and opacity-blink transition selling each cut as an edit. Only the first sub-shot carries the beat's real ink-draw reveal; later cuts show the character already inked — "draw once, then cut between coverage," directly answering the brief's "don't rely on the pen alone; draw selectively." Two-character beats offset each character's cut timing so they don't cut in lockstep. The `detail` inset panel now punches in mid-beat (`detailStart=0.42`) as its own cut-to moment instead of co-fading from beat-open.
- [x] `KineticCaption` narrowed and lowered (from a full-width multi-line block to a compact rolling window near the bottom edge), smaller type, single soft shadow — reads as on-scene caption, not a repeating subtitle banner.

### Bug caught mid-session (continuous render only)

Removing the single shared `shot` variable in favor of per-character sub-shots left the environment layer (which keeps one baseline framing, no cuts) still referencing it — `ReferenceError: shot is not defined` at frame 720. This surfaced as a real `remotion render` failure (pipeline exit code 1, found by actually checking the log's exit code rather than trusting a "completed" task notification, which only reflects the wrapper shell exiting). Restored `shot = shotFor(...)` for the environment/glow layers only, then re-ran the full pipeline for real.

### Verification boundary

- Full strict pipeline run twice: first failed for real (`shot` bug, caught from the actual log — not assumed passing), second passed clean end to end, exit code 0.
- `renders/karna-short.mp4`: 75.051s (matches manifest), 1080×1920 h264/aac, sha256 `fc90d46a7253ecc6b87507610c7058361de3723248bf0d83e39ae34be12ceb45`.
- Trailing silence measured at **1.921s** both by the new automated gate and by a manual independent `ffmpeg silencedetect`/`volumedetect` check on the same file — down from the user-reported ~3.95s.
- Dense frames pulled directly from the real MP4 (not stills) at sub-shot cut boundaries in beats B02 and B07 confirm distinct crops of the same master art per cut, no blank/broken frames, and the ink-reveal-in-progress moments match the already-approved reveal pacing (not a regression). The pipeline's own 9-frame contact sheet shows materially more scene variety across the timeline than a flat reveal-then-hold pattern.
- Honestly unverified: a full real-time watch-through judgment of "does this now read as acted" (dense frames support but don't fully replace this); sub-shot zoom/focus values were spot-checked on 2 of 10 `visual_role`s via real frames; a pre-existing `KeywordFlourish` text/face overlap (unrelated to this session's five issues) was noticed but not fixed.

## 2026-09-06 (research session) — Hand-torn reveal boundary + tracing ink pen

### Research performed before any code change

- Read `@remotion/paths`' actual `evolve-path.ts`/`cut-path.ts` source (via `gh api repos/remotion-dev/remotion/contents/...`) — confirmed it's the same stroke-dasharray primitive already in use here; not adopted, didn't fit a filled-mask reveal.
- Read Rough.js's actual `_line`/`_doubleLine` jitter algorithm (`src/renderer.ts`) — confirmed the "hand-drawn" look is geometry jitter (offset double-strokes + randomized bowing), and confirmed it cannot apply to our raster FLUX master assets (no vector source) — answers "what NOT to adopt." Adapted the *principle* to our own procedural SVG mask paths instead.
- Read `dai-shi/excalidraw-animate`'s actual `animate.ts` in full — found `animatePointer()`, a cursor/hand image moved along the path being drawn via SVG `<animateMotion>`. This was the single concrete finding that explained the complaint: no equivalent existed in this codebase, so a mask-wipe alone reads as "camera revealing a finished picture."
- Read OpenDoodler's feature list — confirmed hand-cursor + stroke-by-stroke reveal is standard/expected, and confirmed camera pan/zoom as an independently-scheduled track on the same clock (validating this codebase's existing shared-timeline design needed no change).
- Searched for "HandDraw-Skill" (not found as any public repo or enabled Claude skill) and "Excalimate" (found — confirmed built on `excalidraw-animate`, validating that as the right source to read in depth).

### Completed this iteration

- [x] Replaced the plain CSS `linear-gradient` reveal mask with an SVG `<mask>` (inline data-URI, zero new dependencies) whose boundary is a seeded, jittered bezier curve (`roughBoundary`/`boundaryPathD` in `MythicShort.tsx`) — deterministic per layer so it's stable across frames, adapted from Rough.js's offset-jitter principle applied to our own mask geometry.
- [x] Added `ArtistPen` — a small, deliberately minimal ink-nib SVG (not a cartoon hand, per the brief's explicit "not Doodly" instruction) that positions and rotates itself to the current leading point of the same boundary curve each frame — the direct adaptation of `animatePointer`'s "something is visibly drawing this" principle, computed analytically with no DOM refs.
- [x] Updated `WashSweep` to trail the same seeded boundary shape so the wash edge matches the ink edge.
- [x] Ran the full real pipeline and judged the result from **dense frames extracted directly from the actual rendered MP4** (not `remotion still`, which was only used for fast pre-pipeline iteration) — confirmed a genuinely irregular, asymmetric torn boundary at three different beats/timestamps, a clear grayscale ink-linework intermediate phase, and the ink-pen nib visible via pixel-level crop.

### Why this milestone

The brief was unusually strict: research real code before touching anything, and judge success only from the real MP4, not passing checks. The research surfaced one clear, well-evidenced gap (no moving "something is drawing this" element) rather than a vague aesthetic complaint, which is why this iteration implemented exactly two things instead of another round of general polish.

### Verification boundary

This is real: dense frames pulled directly from `renders/karna-short.mp4` (77.056s, 1080x1920, h264/aac, `output-qa`/`release-evidence` both `PASS`) at 9 timestamps across 3 beats show the new torn-boundary/pen effect actually rendering, not just compiling. Honestly assessed: the underlying art is still the same finished FLUX illustration once fully revealed — this fix changes the *process* of revealing it, not the art itself, which is an inherent tradeoff of using pre-rendered raster master assets (explicitly preserved per the brief's "no image-per-shot generation" constraint) rather than true per-stroke vector source data. Not yet done: human review of whether this reads as convincingly as the brief wants over a full watch-through, `sun.symbol` regeneration, a real long-form test manifest (still only structurally smoke-tested).

## 2026-09-06 (final) — Format-aware engine, universal keyword detection, hand-drawn underline

### Completed this iteration

- [x] Added `src/remotion/format.ts`: `profileFor(duration_seconds)` returns a tempo/motion profile (`'short'` ≤120s, `'long'` above) — one engine, no new manifest field, no second pipeline. Threaded through reveal-window fraction, idle-drift amplitude, weapon-sway amplitude, camera intensity, and keyword-hold duration in `MythicShort.tsx`.
- [x] Replaced the fixed, Karna-story-specific `KEYWORD_BY_ROLE` table as the *primary* keyword/kinetic-text mechanism with `importantWordFor()` in `shots.ts` — picks the longest non-function-word actually spoken in each beat, straight from real Whisper word-level alignment. The old table is kept only as a fallback for when Whisper data isn't available. This is the change that removes the "hardcoded to Karna" concern raised in the brief.
- [x] Added `HandDrawnUnderline`, a real SVG `stroke-dasharray` path draw-on beneath the keyword flourish, and gave `KineticCaption` the same persistent-underline treatment for the important word (once spoken, stays marked — not just during its own active moment).
- [x] Made `shotFor(role, variant)` take a per-character appearance count (computed once across the whole manifest) to nudge zoom/focus so repeats don't produce identical framing, and added a 4-shot generic rotation fallback for `visual_role` values outside the curated table — so an unfamiliar story's own beat vocabulary still gets real shot variety.
- [x] Ran the full real pipeline (`bash run.sh`, all strict gates) and inspected the actual output: dense frame extraction confirmed the keyword flourishes were real spoken words (सुरक्षित / ब्राह्मण / भली-भाँति), the hand-drawn underline renders correctly, and weapon-sway is visible as a small spear-angle change within a beat.
- [x] Cross-checked one contact-sheet frame that looked blank against precise direct `ffmpeg` extraction at the same timestamp — confirmed it was the contact-sheet tool's own known tiling/label quirk (documented in earlier sessions), not a real bug; the actual video frame is fully rendered.
- [x] Structurally verified the long-form branch: temporarily patched `runtime-manifest.ts`'s `duration_seconds` to 150 (one beat extended to 82s) to force the `'long'` profile, rendered via `remotion still` with no crash, confirmed the reveal window scaled proportionally (~24.6s vs. the Short profile's ~2.5s), then restored the file from a backup (verified via `diff` that the restore was exact).

### Why this milestone

This session's brief explicitly named two structural risks in the engine as it stood: (1) it was one fixed-tempo pipeline with no notion of Short vs. long-form, and (2) its "kinetic text" mechanism was a hand-authored vocabulary table specific to this one Karna story, which would need a rewrite for any other myth. Both are now driven by data that generalizes — the manifest's own duration for tempo, and the real Whisper alignment for keywords — rather than by code that would need editing per-story.

### Verification boundary

This is real for the Short path: the full pipeline was run for real, producing `renders/karna-short.mp4` (77.056s, 1080x1920, h264/aac) with `output-qa-report.json` and `release-evidence-report.json` both `PASS`, and the dynamic-keyword and hand-drawn-underline features were confirmed against actual extracted frames from that file. The long-form path is verified only structurally (a synthetic duration patch, not a real long-form manifest/production) — this is explicitly called out as the next thing to actually test, not claimed as done. Not yet done: human review of this session's changes, `sun.symbol` regeneration, a real long-form test manifest, SFX sync (no SFX adapter exists yet to sync).

## 2026-09-06 (newest) — Visible reveal timing, Whisper-driven dead-air splicing, weapon sway

### Completed this iteration

- [x] Inspected the actual previous-session render frame-by-frame and confirmed the specific complaint: the ink-reveal completed in under ~1.3s, reading as "already finished" rather than genuinely drawing.
- [x] Widened the reveal window (22-24% -> 40-44% of beat duration) and changed the sweep angle (102° -> 160°, top-down) in `src/remotion/MythicShort.tsx`. Verified via dense frame extraction on the real render: blank -> emerging linework -> clear grayscale ink outline -> gold/red wash, staged over 2.5+ seconds on both a character layer and an environment layer.
- [x] Added a "weapon sway" to `FramedLayer` — a nested rotation wrapper pivoted near the raised hand (not image center) so the spear visibly sweeps while the torso barely moves, simulating limb movement on the existing flat raster master assets (no segmentation, no per-shot generation).
- [x] Analyzed real inter-word gaps from the previous session's Whisper alignment output and found a 1.75s outlier dead-air gap plus a tail of smaller ones that Chatterbox's amplitude-threshold trim had missed.
- [x] Extended `tools/whisper_align.py` to splice these gaps directly out of the waveform (capped at 0.35s, using Whisper's own precise word boundaries) and remap every word timestamp — verified idempotent (a second run against already-tightened audio removes nothing further).
- [x] Re-measured and lowered `tools/chatterbox_tts.py`'s default `atempo` from 0.92 to 0.90 after finding 0.92 landed at 165.5 WPM (over target) once gap-tightening was added on top of it.
- [x] Retimed the manifest's beat durations again against the newly tightened audio boundaries.
- [x] Ran the full real pipeline (`bash run.sh`, all strict gates) and inspected the actual output: sub-second frame extraction confirmed the staged reveal, 200/200 words still aligned, all gaps capped at 0.35s, 162-163 WPM.

### Why this milestone

This continuation was explicit that the previous session's fixes, while real, hadn't gone far enough on the two most visible complaints: the "artwork already looks finished" reveal timing, and residual dead air the aggregate WPM number was hiding. Both needed inspecting the actual rendered frames/audio timing (not the code) to find the real numbers to fix, which is what this session did before touching any code.

### Verification boundary

This is real: `tools/whisper_align.py`'s gap-tightening was run standalone first (16 gaps, 4.31s removed, 200/200 words still placed) before being wired into the pipeline; the full pipeline was then run for real, producing `renders/karna-short.mp4` (77.056s, 1080x1920, h264/aac) with `output-qa-report.json` and `release-evidence-report.json` both `PASS`. The reveal timing fix was specifically verified by extracting frames at 0.3/1.0/1.8/2.6s into a beat's opening from the actual video file — not a still, not the coarse contact sheet — and visually confirming a genuine multi-stage draw. Not yet done: human review of the new pacing/reveal feel, `sun.symbol` regeneration, per-word confidence-score guarding.

## 2026-09-06 (latest) — Voice pace, real Whisper sync, kinetic captions, hand-draw/wash

### Completed this iteration

- [x] Rebuilt the ink-reveal into a genuine two-stage hand-draw → ink → wash animation (`inkRevealStyle` + new `WashSweep` in `src/remotion/MythicShort.tsx`): a ragged multi-stop mask sweep for ink linework, then a gold/red gradient band chasing the same edge as color returns, instead of a single blur/grayscale/hard-clip fade.
- [x] Added continuous per-layer idle/breathing drift and a slow continuous shot-drift zoom to `FramedLayer` so characters/props keep moving through a beat instead of freezing after entrance.
- [x] Sped up and tightened the Hindi voice: `tools/chatterbox_tts.py` now trims each clip's own boundary silence, cut the inter-beat pad, and applies a measured `atempo=0.92` correction. Verified: 157 WPM on the real narration (target 145-165), 76.5s for 200 words, down from 79.4s/147 WPM.
- [x] Wired real Whisper (whisperx) forced alignment against the *known script text*: new `tools/whisper_align.py`, new `src/align-whisper.ts` pipeline stage (wired into `produce.ts`, `package.json`, `check-pipeline.ts`), writing `src/remotion/runtime-captions.ts`. Verified 200/200 words placed across all 10 beats of the real narration.
- [x] Replaced the static caption bar with `KineticCaption`, a Whisper-synced word-by-word kinetic typography component (active word pops gold at its real spoken timestamp; static bar kept only as a fallback when alignment data is unavailable).
- [x] Synced the keyword flourish to the real spoken timestamp of its own keyword when Whisper placed it, instead of always using a fixed early-beat estimate.
- [x] Retimed the manifest's beat durations (`examples/karna-short.json`) from the real per-beat audio timing the alignment produced, rather than only hand-tuning against the aggregate narration length — closes most of the drift between a beat's visual start and when its narration is actually spoken.
- [x] Added a slow ambient pulse to the sun-ring motif tied to the global timeline (not beat-local) so something is always visibly changing on a ~1.8s cycle even in a quiet mid-beat moment, reinforcing the kinetic-caption-driven ~0.5-2s visual-change cadence.
- [x] Ran the real pipeline (`bash run.sh examples/karna-short.json`, full strict mode) and inspected the actual rendered MP4 via dense direct `ffmpeg` frame extraction across all 10 beats — confirmed kinetic captions, wash sweep, keyword sync and detail panels all render correctly with no missing/blank content.

### Why this milestone

The previous compositor pass fixed structural rendering bugs and shot variety but still used a generic fade/wipe reveal, a fixed-cadence keyword flourish, static block captions, and hand-tuned (not measured) voice pacing. This pass replaced each of those with a version actually driven by real data: real trimmed/tempo-corrected audio, and real Whisper word timestamps forced-aligned against the script we already know we generated — closing the "Chatterbox Hindi → Whisper alignment" loop the architecture always called for but had never actually wired up (the prior `align-audio.ts` used FFmpeg `silencedetect` heuristics, not Whisper).

### Verification boundary

This is real: `tools/whisper_align.py` was run standalone against the actual generated narration and placed 200/200 words before being wired into the pipeline; the full pipeline was then run for real (`REQUIRE_GENERATED_ASSETS/TTS/AUDIO_MIX/OUTPUT_QA/RELEASE_EVIDENCE=1`), producing `renders/karna-short.mp4` (78.059s, 1080x1920, h264/aac) with `output-qa-report.json` and `release-evidence-report.json` both `PASS`. Frames were pulled directly from that file (not just the 9-frame contact sheet) at 11 points spanning all 10 beats and visually confirmed gold-highlighted kinetic captions, the wash-sweep effect mid-reveal, synced keyword flourishes, and no missing/blank content. Not yet done: human mythology-respect/editorial sign-off on the new pacing and captions, `sun.symbol` regeneration, and using the per-word alignment confidence score to guard against mistimed low-confidence words.

## 2026-09-06 (later) — Cinematic compositor rebuild

### Completed this iteration

- [x] Inspected the existing `renders/karna-short.mp4` and its contact sheet and confirmed the specific complaint: a static full-body character, same crop, same pose, in nearly every beat ("motion-comic"/slideshow feel), with fade-in-only entrances and no real ink-reveal.
- [x] Rebuilt `src/remotion/MythicShort.tsx` around new reusable primitives (`FramedLayer` for per-beat crop/zoom/focus framing, `inkRevealStyle` for a blur/grayscale/clip-path ink-outline-to-wash sweep, `EdgeInkWipe` for a beat-opening ink-blot transition, `KeywordFlourish` for large brush-style Hindi keyword text) and a new `src/remotion/shots.ts` table mapping the manifest's existing `visual_role` field to a distinct shot (wide/chest/face/hands crop) per beat — no manifest schema change.
- [x] Added `entranceExitOpacity`/`entranceExitShiftY` to `src/remotion/motion.ts` (additive exports; existing `cameraMotion`/`parallaxOffset`/`layerTransform`/`drawRevealProgress` signatures and the `check-motion.ts` smoke assertions untouched and still passing) so layers get a real entrance and exit instead of a one-way fade.
- [x] Preserved the entire rest of the architecture as instructed: manifest schema, FLUX (`tools/flux_image.py`)/Chatterbox (`tools/chatterbox_tts.py`) adapters, master-asset strategy (still one generation per unique asset id, never per-shot), one-command `run.sh` pipeline all unchanged.
- [x] Rendered the real MP4 five times in this session, inspecting actual extracted frames after each change (not just reading code), and found + fixed three real bugs that only showed up in rendered output:
  1. Compounded zoom (new per-shot zoom × existing camera-preset scale) occasionally zoomed past the character's visible art into blank margin, rendering as a missing character for a whole beat. Fixed by dampening the camera-scale contribution and capping shot zoom.
  2. Two-character beats showed a hard visible seam between panels from an aggressive `objectFit:'cover'` crop in narrow boxes. Fixed by switching to `objectFit:'contain'` with wide overlapping boxes.
  3. A genuine content-safety issue: the `sun.symbol` master asset turned out to be a full illustrated scene (a figure with what read as fallen bodies), not the abstract glow motif it was prompted for, and was being blended semi-transparently over Karna in two beats. Fixed at the compositor level by cropping tightly into only the safe sun-ring region; flagged for asset regeneration (out of scope for a compositor-only pass).
- [x] Found and fixed a fourth, more serious bug that only reproduced in full sequential video renders (never in isolated `remotion still` frames or short partial-range renders): Karna was completely missing for nearly the entire final "payoff" beat in the actual delivered MP4. Root cause was a React key collision — `key={ref}` used the bare asset id (recurring across almost every beat) at a tree position Remotion's continuous multi-frame render keeps alive across the whole video, so React reconciled the closing beat's layer as an "update" to the previous beat's stale instance instead of a fresh mount. Fixed by scoping every layer key to `${beat.beat_id}-${ref}`.
- [x] Tightened the ink-reveal timing (0.3-0.4 → 0.22-0.24 of beat-local progress) after observing each beat opened with a longer-than-intended near-blank sweep-in.
- [x] Re-ran the full real strict-mode pipeline after each fix and re-inspected real extracted frames (both the coarse QA contact sheet and dense direct `ffmpeg` sampling at 2-4s intervals through every beat, including the two beats that had been broken) until the actual video showed no missing/blank/seamed content anywhere it was checked.

### Why this milestone

The user's brief was explicit that this had to be verified against a real render, not code review: "Do not stop at analysis. Code → render → inspect → fix → rerender." Two of the four bugs found (the sustained-missing-character bug and the sun.symbol content issue) were invisible to code review and only surfaced by extracting and looking at actual frames from the actual rendered file — including one bug that specifically only reproduced in a full sequential render, not an isolated still, which is why the verification loop kept re-running the complete `run.sh` pipeline rather than relying on partial/still renders alone.

### Verification boundary

This is real: `renders/karna-short.mp4` (81.045s, 1080x1920, h264/aac) was rendered by the rebuilt compositor from the same real FLUX master assets and real voice-cloned Hindi narration as the previous milestone, technical QA (`output-qa-report.json`) and release evidence (`release-evidence-report.json`) both report `PASS` with real SHA-256 `2c7997ee8712f04dc37ba839b123c6bee8789e2406721d93dcc074c93f187003`, and dense frame-by-frame inspection across the whole timeline (not just the 9-frame contact sheet) confirmed no missing/blank/seamed content remains at any sampled point. What is **not** yet done: human mythology-respect/editorial sign-off on the new compositor's look, regenerating the `sun.symbol` asset, and further tuning Karna/Indra visual distinction (unchanged, out of scope for this pass).

## 2026-09-06 — First real Karna Short (M1 technical bar met)

### Completed this iteration

- [x] Audited the local Mac for existing working integrations before installing/building anything new: found mflux (FLUX.1-schnell/FLUX.2-klein, Apple Silicon native, already cached), three ComfyUI installs (code+weights present, no running server, no mythology-styled workflow), Draw Things.app (installed, unused), Chatterbox TTS (both an MLX build behind the MimikaStudio app and the PyPI `chatterbox-tts` multilingual package already installed globally), a reusable Hindi reference voice WAV in another local project, Whisper/WhisperX (installed, unused for now), and Homebrew ffmpeg/ffprobe.
- [x] Connected real local FLUX image generation via `tools/flux_image.py` (new adapter script wrapping `mflux-generate`/`mflux-generate-kontext`), wired through the existing `IMAGE_GENERATOR_COMMAND` contract — no changes to the adapter interface itself.
- [x] Connected real local Chatterbox Hindi TTS via `tools/chatterbox_tts.py` (new adapter script wrapping `ChatterboxMultilingualTTS`), wired through the existing `TTS_COMMAND` contract, voice-cloned from a reused reference WAV.
- [x] Connected `rembg` (already installed locally) inside the image adapter to satisfy the pipeline's own alpha-transparency requirement for character/overlay assets.
- [x] Fixed a real bug: `src/pipeline/paths.ts` never defined the `logs` field that `preflight.ts`/`generate-assets.ts`/`check-asset-requirements.ts`/`stage-assets.ts` all actually used, silently writing to `undefined/...` paths.
- [x] Fixed a real bug: `src/preflight.ts` probed `ffmpeg`/`ffprobe` with the wrong version flag (`--version` instead of `-version`), so preflight always failed even with both installed.
- [x] Fixed a real bug: `src/check-pipeline.ts`'s audit expected a `REQUIRE_OUTPUT_QA` reference in `produce.ts` that was never added.
- [x] Fixed a real compositing bug: `src/remotion/MythicShort.tsx` rendered the procedural sketch-figure fallback on top of real generated character art instead of yielding to it.
- [x] Fixed a real environment bug (benefits every local project on this interpreter, not just this one): `pkg_resources` was missing from the shared `pyenv 3.12.0` env, silently disabling Chatterbox's watermarker and crashing TTS.
- [x] Discovered and fixed a real content/timing bug in the bundled example manifest: beat `text` fields were too short to fill the manifest's own 75s beat-duration budget when actually spoken (measured 26.2s). Added proportionate `narration` fields per beat, staying within the already-canonical story already implied by the beats, and re-measured.
- [x] Discovered and fixed a second real timing bug: the resulting narration (79.4s) would have been truncated by the original fixed 75s video timeline. Extended the final beat and total manifest duration to 81s and confirmed (via `volumedetect` on the last 6s of the render) that the full narration now plays.
- [x] Ran the complete real pipeline via `bash run.sh examples/karna-short.json` with all strict gates enabled and produced `renders/karna-short.mp4` (1080x1920, 30fps, h264/aac, 81.045s).
- [x] Verified `output-qa-report.json` PASS and `release-evidence-report.json` PASS with real SHA-256 hashes.
- [x] Generated and human-reviewed the 9-frame contact sheet: real ink/wash Indian-illustration master art in every frame, correct alpha compositing (no mattes), Hindi captions rendering correctly, no black/missing frames.

### Why this milestone

Every previous "Implemented — structurally verified" entry in `STATUS.md` had been reviewed by reading the code, not by running it. Running the real pipeline surfaced five genuine bugs that pure code review had missed (three interface/contract bugs, one compositing bug, one environment dependency issue) plus a real content-authoring gap in the example manifest itself. All are now fixed, and a real MP4 exists that a human can actually watch.

### Verification boundary

This is real: the MP4 file exists, was rendered by Remotion from real FLUX-generated artwork and real voice-cloned Hindi narration, and passes automated technical QA. It is **not** yet: mythology-respect/editorial sign-off by a human reviewer, tuned for character visual consistency between Karna and Indra, or free of a minor parallax-layering artifact noted in `STATUS.md`. M1's technical bar is met; M1 as a whole (which includes human editorial review) is not yet formally closed.

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

## Current milestone: M1 human sign-off, then M2 repeatability

The technical/render bar for M1 is met (see the 2026-09-06 "First real Karna Short" entry above). Remaining sequence:

1. Human mythology-respect and editorial review of `renders/karna-short.mp4` (Gate 0/1/5 in `docs/QUALITY_GATES.md`).
2. Tune `src/pipeline/asset-prompts.ts` for stronger visual distinction between Karna and Indra, regenerate just those two assets, re-render.
3. Investigate the parallax-layering ghosting artifact around the `shot_reverse` camera preset (`src/remotion/MythicShort.tsx` / `src/remotion/motion.ts`).
4. Close M1 once the above pass human review.
5. Start M2: run a second and third Short manifest through the same unmodified pipeline to confirm the fixes above generalize.

## Exact reproducible commands

```bash
npm install
npm run check:pipeline -- examples/karna-short.json
npm run preflight -- examples/karna-short.json
npm run validate -- examples/karna-short.json
npm run check:motion
```

The exact command that produced the current `renders/karna-short.mp4`:

```bash
REQUIRE_GENERATED_ASSETS=1 REQUIRE_ASSET_REQUIREMENTS=1 REQUIRE_TTS=1 REQUIRE_AUDIO_MIX=1 REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 NORMALIZE_ASSETS=1 IMAGE_GENERATION_MAX_ATTEMPTS=1 AUDIO_DURATION_TOLERANCE_SECONDS=10 bash run.sh examples/karna-short.json
```

(Requires the machine-specific `.env` described in `docs/STATUS.md`; not committed. `REQUIRE_CHARACTER_REFERENCES`/`REQUIRE_TTS_ALIGNMENT` were intentionally left off this run — no manual character references were supplied, and per-beat forced alignment is not wired yet.)

Post-render evidence check:

```bash
npm run check:release -- examples/karna-short.json renders/karna-short.mp4
```

### Actual release evidence (this run)

```text
projects/karna-kavacha-demo/logs/
  preflight-report.json       PASS
  audio-report.json           within_target: true (79.41s / 81s target, tolerance 10s)
  output-qa-report.json       PASS, no errors
  release-evidence-report.json PASS, output sha256 9aa6662e03b66819530b78b702f95c695c691f37492cf47234684d448d416658

projects/karna-kavacha-demo/qa/
  contact-sheet.jpg           human-reviewed, see docs/STATUS.md
  visual-qa-report.json       generated
```

(`audio-alignment-report.json` was not generated — `REQUIRE_TTS_ALIGNMENT` was not set for this run.)

## Verification policy

A checkbox means repository implementation exists and has been structurally reviewed. A checkbox marked "verified" or with a real artifact path/hash means a local model was actually executed and the output was actually inspected. M1's technical bar is met (2026-09-06); M1 as a whole remains open until human mythology-respect/editorial review passes.

## Product goal remains unchanged

**AI creates the artwork. Code creates the movie.**

The system must support 60–90s high-retention Hindi mythology Shorts, reusable master assets, reference-guided consistency, dignified/source-aware mythology treatment, controlled cinematic motion, deep Hindi narration, sound design/music, captions, technical and visual quality gates, one-command local production, three-Short daily batching, 8–12 minute long-form episodes and later serialized season automation.
