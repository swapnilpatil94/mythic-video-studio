# KATHAAYA — FINAL 2D MOVIE ENGINE + HINDI VOICE ARCHITECTURE

You are acting as the Senior Staff / Principal Engineer for the KATHAAYA `mythic-video-studio` repository.

Your job is NOT to make a small animation patch.

Your job is to evolve the existing application toward a production-quality automated cinematic 2D mythology movie engine.

The final product goal is:

TOPIC
→ RESEARCH
→ CANON VALIDATION
→ STORY
→ SCREENPLAY
→ SCENE PLAN
→ SHOT PLAN
→ VISUAL BIBLE
→ ASSET PLAN
→ ANIMATION PLAN
→ CHARACTER / ENVIRONMENT ART
→ 2D ANIMATION
→ HINDI VOICE
→ MUSIC / SFX
→ REMOTION COMPOSITING
→ RENDER
→ VISUAL QA
→ AUTOMATIC FIX / RETRY
→ FINAL MOVIE

The final result must feel like a real cinematic 2D animated mythology film.

It must NOT become:

- an animated slideshow
- a collection of static AI images with zooms
- a fake "drawing" effect
- a sequence of unrelated shots
- robotic TTS over images
- generic motion-template content

The existing KATHAAYA visual identity must remain:

- Indian mythology
- cinematic Indian ink storytelling
- parchment / paper aesthetic
- sophisticated 2D illustration
- restrained gold/red accents
- mature cinematic composition
- emotional storytelling
- curiosity → tension → reveal → payoff
- visual continuity
- premium rather than cheap clickbait aesthetics

---

# 1. IMPORTANT: INSPECT THE EXISTING REPOSITORY FIRST

Before changing code, thoroughly inspect the current repository.

Understand:

- Remotion architecture
- current compositions
- drawing-stage implementation
- production drawing implementation
- `ProgressiveArtwork`
- `InkConstructionOverlay`
- current asset contracts
- storyboard contracts
- scene/shot data structures
- render scripts
- validation scripts
- drawing acceptance tests
- current audio/TTS architecture
- current Chatterbox integration
- current voice-cloning flow
- UI components
- Short vs Longform configuration
- PR #5 changes already present

Do not throw away working code.

Do not rewrite the project unnecessarily.

Extend existing architecture where appropriate.

Do not create another PR.

All implementation work must remain within the existing PR #5 / current development workflow.

---

# 2. PRIMARY ARCHITECTURAL PRINCIPLE

The central architecture should become:

STORY
↓
DIRECTORIAL PLAN
↓
SCENE GRAPH
↓
ASSET MANIFEST
↓
ANIMATION PLAN
↓
VOICE / AUDIO PLAN
↓
REMOTION RENDERER
↓
VISUAL + AUDIO QA
↓
FINAL MOVIE

The AI/LLM layer describes WHAT should happen.

The animation/audio engines determine HOW it is rendered.

Do not hardcode cinematic decisions directly into renderer components when they can be represented as structured data.

---

# 3. KATHAAYA MUST BECOME A REAL 2D MOVIE ENGINE

Support three major visual modes.

## MODE A — CINEMATIC ILLUSTRATION

For establishing shots and environmental storytelling:

- foreground
- midground
- background
- parallax
- camera push
- camera pull
- pan
- tilt
- depth movement
- atmosphere
- particles
- smoke
- dust
- light movement
- subtle environmental animation

Avoid random movement.

Every movement should have a cinematic reason.

---

# 4. MODE B — TRUE 2D CHARACTER ANIMATION

Where layered assets are available, characters must be animated as actual components rather than moving the entire image.

Support:

- head rotation
- eye direction
- facial expression
- mouth states where appropriate
- torso movement
- arm movement
- hand movement
- weapon movement
- clothing movement
- hair movement
- secondary motion
- body rotation
- anticipation
- action
- settle

Reusable animation primitives should be created where appropriate:

- idle breathing
- look-at
- turn-head
- gesture
- raise-arm
- lower-arm
- recoil
- hold
- anticipation
- settle
- subtle cloth motion
- subtle hair motion

Do NOT call whole-image scaling or translation "character animation".

---

# 5. MODE C — KATHAAYA INK DRAWING

Preserve the existing true path-based drawing architecture.

The desired visual progression is:

BLANK PARCHMENT
→ CONSTRUCTION GUIDE
→ RECOGNIZABLE PROTAGONIST
→ DENSER LINEWORK
→ RESTRAINED GOLD / RED WASH
→ FINISHED ILLUSTRATION

Use:

- actual authored SVG geometry when available
- skeleton / centerline extraction for raster artwork when necessary
- independently animated SVG paths
- `pathLength`
- `strokeDasharray`
- `strokeDashoffset`
- semantic contour ordering

Never replace true drawing with:

- rectangular image reveal
- generic mask reveal
- fake scribbles
- generic character outlines
- random strokes
- repeated drawing resets

The protagonist must become recognizable early.

---

# 6. CURRENT DRAWING BUG — MUST BE FIXED PROPERLY

The current rendered system has previously shown a hard rectangular master-art / parchment boundary during final artwork reveal.

Treat this as a real production defect.

Fix the underlying architecture.

Implement proper asset normalization / compositing so that:

- genuine paper backgrounds are removed or normalized
- authored artwork is preserved
- meaningful environmental geometry is not accidentally removed
- SVG transparency is preserved
- transforms remain correct
- viewBox remains correct
- object-fit remains correct
- object-position remains correct
- final artwork does not expose an unwanted rectangular boundary

Do NOT solve this only by changing the test asset.

Do NOT weaken tests.

Do NOT hide the defect with a fake overlay.

CSS blend mode may be a fallback, but proper asset normalization is preferred.

After implementation, render actual videos and inspect the actual output.

---

# 7. CHARACTER-FIRST VISUAL DIRECTING

For character-driven shots:

1. protagonist identity / silhouette
2. face / head
3. primary action
4. important prop / weapon
5. supporting characters
6. environment
7. atmosphere

Do not allow the environment to dominate the first half of a character shot.

Do not delay protagonist recognition until the final seconds.

However, do NOT force every shot into a centered portrait composition.

The Visual Director should choose composition based on story intent.

---

# 8. SCENE GRAPH

Create or evolve a typed machine-readable Scene Graph.

Conceptually:

{
  shotId,
  duration,
  characters,
  environment,
  layers,
  camera,
  animation,
  effects,
  lighting,
  audio,
  transition,
  visualStyle,
  emotionalIntent
}

The Scene Graph should be renderer-friendly.

The LLM should generate structured shot intent.

The renderer should execute that intent deterministically.

---

# 9. CAMERA ENGINE

Support:

- pan
- tilt
- push-in
- pull-out
- lateral movement
- controlled zoom
- parallax
- depth
- focus emphasis
- cinematic easing

Camera movement should reinforce:

- emotion
- tension
- revelation
- scale
- character importance

Avoid:

- constant zooming
- random movement
- excessive motion
- template-like camera behavior

---

# 10. STORY-DRIVEN ANIMATION

Each shot should support concepts such as:

emotion:
"fear → determination"

action:
"looks toward Krishna"

reveal:
"armor becomes visible"

camera:
"slow push-in"

visual emphasis:
"face"

The animation system should understand these concepts through structured data.

Do not build a renderer that only understands:

x
y
scale
rotation
duration

It should understand cinematic intent.

---

# 11. HINDI VOICE ENGINE — IMPORTANT NEW REQUIREMENT

KATHAAYA currently has a Chatterbox-based voice cloning capability.

Do NOT remove it.

We now want TWO production-capable Hindi TTS providers:

## PROVIDER 1 — CHATTERBOX

Keep the existing Chatterbox voice-cloning integration.

Support Hindi narration.

Preserve:

- reference voice
- voice identity
- cloning
- deterministic generation where possible
- existing audio processing
- existing pipeline compatibility

---

## PROVIDER 2 — VIBEVOICE HINDI 7B

Add VibeVoice Hindi 7B as a second TTS provider.

The exact model/runtime should be configurable rather than hardcoded throughout the application.

The integration must support:

- Hindi narration
- reference voice / cloning where supported by the selected model
- long-form narration
- generation parameters
- model loading
- error handling
- deterministic configuration where possible
- local execution where supported by the existing environment

Do NOT replace Chatterbox with VibeVoice.

Both must coexist.

---

# 12. TTS PROVIDER ABSTRACTION

Create a clean abstraction such as:

TTSProvider

with implementations conceptually like:

ChatterboxProvider
VibeVoiceProvider

The rest of KATHAAYA should NOT care which provider generated the audio.

The audio pipeline should receive normalized output.

For example:

{
  "provider": "chatterbox",
  "language": "hi-IN",
  "voiceId": "kathaya-narrator",
  "referenceAudio": "...",
  "text": "...",
  "output": "..."
}

or:

{
  "provider": "vibevoice",
  "language": "hi-IN",
  "voiceId": "kathaya-narrator",
  "referenceAudio": "...",
  "text": "...",
  "output": "..."
}

Use the repository's existing contract conventions where possible.

---

# 13. SHORTFORM VS LONGFORM VOICE

KATHAAYA must support BOTH:

## SHORT

Examples:

- YouTube Shorts
- Instagram Reels
- short mythology stories
- approximately 30–180 seconds depending on existing product configuration

## LONGFORM

Examples:

- 5+ minute mythology stories
- cinematic documentaries
- longer narrative episodes

Both Chatterbox and VibeVoice Hindi 7B must be integrated into both modes.

Do not create a provider that only works for one mode.

---

# 14. UI REQUIREMENT

Add a clear voice-engine selector in the UI.

The user must be able to choose:

### Voice Engine

- Chatterbox
- VibeVoice Hindi 7B

The selector must work for:

### Shortform generation

and:

### Longform generation

Prefer a single reusable voice configuration component rather than duplicating UI logic.

The UI should clearly communicate which engine is selected.

Example:

Voice Engine

○ Chatterbox
○ VibeVoice Hindi 7B

The selected provider must flow through:

UI
→ generation config
→ story/audio plan
→ TTS provider
→ generated audio
→ Remotion
→ final movie

Do not create a UI selector that does not actually affect the backend/rendering path.

---

# 15. DEFAULT PROVIDER

Do not arbitrarily remove the current Chatterbox default.

Use the existing Chatterbox implementation as the safe/default production path unless the repository already defines another default.

VibeVoice Hindi 7B should be available as an explicit selectable experimental/production option.

The architecture must make switching providers trivial.

---

# 16. VOICE CONSISTENCY

KATHAAYA should have a concept of a canonical narrator identity.

Example:

KATHAAYA NARRATOR

- mature
- warm
- cinematic
- neutral Indian Hindi
- controlled
- intelligent
- mysterious when appropriate
- emotionally restrained
- never exaggerated
- never "YouTube announcer"
- never trailer shouting
- never robotic

The exact voice should remain consistent across episodes.

The provider should be replaceable without changing the narrator identity contract.

---

# 17. CINEMATIC NARRATION

Do not generate narration as one uncontrolled paragraph.

The Audio Director should support:

- sentence boundaries
- intentional pauses
- dramatic pauses
- emphasis
- scene-level timing
- emotional intensity
- narration pacing

Example conceptual structure:

{
  "text": "...",
  "emotion": "mystery",
  "pace": 0.92,
  "pauseAfterMs": 500
}

Do not abuse pauses.

Narration must feel cinematic, not artificially chopped.

---

# 18. SHORT VS LONGFORM DIFFERENCES

The Story/Director/Audio system must understand that Short and Longform are different formats.

SHORT:

- faster hook
- faster visual progression
- stronger pattern interruption
- shorter setup
- rapid information delivery
- tighter shot durations
- higher retention pressure

LONGFORM:

- more breathing room
- deeper emotional development
- slower scene transitions where appropriate
- character development
- atmospheric shots
- longer narration passages
- sustained musical themes

Do not simply stretch a Short into a Longform video.

---

# 19. AUDIO ARCHITECTURE

Keep TTS independent from:

- background music
- sound effects
- ambience

Conceptually:

VOICE
+
MUSIC
+
SFX
+
AMBIENCE
↓
AUDIO MIX
↓
FINAL VIDEO

Voice must remain intelligible over music.

Music should support emotional progression rather than dominate narration.

---

# 20. AUTOMATED STORY → MOVIE PIPELINE

The architecture should support:

1. Research Agent
2. Canon / Fact Validation
3. Story Architect
4. Screenplay Agent
5. Scene Planner
6. Shot Planner
7. Visual Director
8. Asset Director
9. Animation Director
10. Audio Director
11. TTS Provider
12. Music / SFX
13. Remotion Renderer
14. Visual QA
15. Audio QA
16. Automatic Fix / Retry
17. Final Export

The agents must communicate through structured contracts.

Avoid uncontrolled free-form text between pipeline stages.

---

# 21. VISUAL QA MUST BE A REAL RELEASE GATE

Passing TypeScript and tests does not mean the movie is good.

The actual rendered video must be inspected.

Check:

- protagonist readability
- composition
- drawing progression
- no rectangular artwork boundary
- no blank frames
- no drawing reset
- no frozen character
- no malformed SVG
- no clipping
- no wrong object positioning
- no accidental overlay
- no excessive camera movement
- correct final artwork
- correct transition
- visual continuity
- character consistency
- environment continuity

A render that passes automated code tests but visually fails is a FAILURE.

---

# 22. AUDIO QA

Add checks where practical for:

- generated audio exists
- expected duration exists
- audio is not silent
- no unexpected truncation
- no severe clipping
- narration aligns with scene timing
- provider errors are surfaced clearly
- Short and Longform both work
- both providers produce normalized output

Where automated audio analysis is practical, implement it.

Do not pretend audio QA exists if it only checks file existence.

---

# 23. TTS BENCHMARKING

Because both Chatterbox and VibeVoice Hindi 7B will coexist, create a reproducible benchmark path.

Use the SAME:

- Hindi script
- reference voice
- output format
- sample rate
- post-processing
- narration settings

for both providers.

Benchmark:

1. Hindi pronunciation
2. voice similarity
3. emotional delivery
4. natural pauses
5. sentence rhythm
6. long-form consistency
7. narration intelligibility
8. audio artifacts
9. generation time
10. memory usage
11. failure rate
12. output duration stability

Do not choose a winner based on model reputation.

The benchmark should determine which provider is better for which use case.

---

# 24. DO NOT FORCE ONE PROVIDER TO WIN

The final architecture must allow:

Short:
Chatterbox

Long:
VibeVoice

or:

Short:
VibeVoice

Long:
Chatterbox

or:

Both:
Chatterbox

or:

Both:
VibeVoice

depending on benchmark results.

Provider selection is a product configuration decision.

Do not hardwire one provider as universally superior.

---

# 25. MODEL LOADING / RESOURCE SAFETY

VibeVoice Hindi 7B is significantly heavier than a small TTS model.

Design the provider so that:

- models are loaded lazily
- unnecessary models are not loaded simultaneously
- errors are handled cleanly
- insufficient-memory situations are surfaced
- the UI does not freeze unnecessarily
- generation status is visible
- provider availability is detectable

Do not make the application load both large models on startup.

---

# 26. UI GENERATION FLOW

The user experience should eventually feel like:

CREATE KATHAAYA VIDEO

Format:
○ Short
○ Longform

Language:
Hindi

Voice Engine:
○ Chatterbox
○ VibeVoice Hindi 7B

Voice:
KATHAAYA Narrator

Topic:
[....................]

Generate

The selected configuration must propagate through the entire pipeline.

---

# 27. PROGRESS / STATUS

Where the existing UI supports generation progress, expose meaningful stages:

Researching
→ Writing
→ Planning Shots
→ Preparing Artwork
→ Preparing Animation
→ Generating Voice
→ Mixing Audio
→ Rendering
→ Visual QA
→ Finalizing

Do not show "Rendering" while the application is actually generating TTS.

---

# 28. RENDER → INSPECT → FIX → RERENDER

For visual work, use this workflow:

RENDER
↓
EXTRACT REPRESENTATIVE FRAMES
↓
VISUAL INSPECTION
↓
IDENTIFY FAILURE
↓
PATCH
↓
RERENDER
↓
RECHECK

For audio:

GENERATE
↓
INSPECT DURATION / QUALITY
↓
CHECK TIMING
↓
PATCH
↓
REGENERATE

Never declare completion solely because static tests pass.

---

# 29. TESTING

Preserve all existing tests.

Add focused tests for:

- TTS provider contract
- Chatterbox provider
- VibeVoice provider
- provider selection
- Short configuration
- Longform configuration
- UI → provider propagation
- asset normalization
- Scene Graph validation
- drawing progression
- no rectangular master background
- no production reset
- renderer compatibility

Do not weaken tests to make implementation pass.

---

# 30. GOLD-STANDARD TEST SHOT

Before claiming the 2D engine is mature, ensure the existing drawing proof can demonstrate:

0s
→ parchment

early
→ construction

early-mid
→ protagonist recognizable

mid
→ richer linework

late
→ restrained pigment

final
→ polished illustration

Then evolve the architecture so future shots can add:

- camera
- parallax
- character movement
- cloth
- hair
- particles
- lighting
- emotional acting
- audio synchronization

---

# 31. GOLD-STANDARD VOICE TEST

Create a reproducible Hindi narration benchmark using the same script and reference voice for:

Chatterbox

and

VibeVoice Hindi 7B

Test BOTH in:

SHORT configuration

and

LONGFORM configuration.

Do not modify the benchmark text between providers.

The result should make it easy for a human reviewer to listen to both outputs and compare them.

---

# 32. CODE QUALITY

Work like a senior staff engineer.

Prefer:

- typed contracts
- clean abstractions
- deterministic rendering
- reusable animation primitives
- reusable TTS provider interface
- clear separation of concerns
- production-safe error handling
- lazy model loading
- explicit configuration
- backwards compatibility
- testable modules

Avoid:

- hacks
- test-only fixes
- magic constants without explanation
- duplicated provider logic
- giant components
- hardcoded provider names throughout the code
- fake visual effects
- fake character animation
- unnecessary dependencies
- loading all heavyweight models at startup

---

# 33. PRIORITY ORDER

Work in this priority order.

## P0 — CURRENT VISUAL CORRECTNESS

Fix:

- rectangular master artwork boundary
- drawing progression
- protagonist-first timing
- continuous production drawing
- final artwork compositing

Then render and inspect actual output.

---

## P1 — 2D MOVIE FOUNDATIONS

Strengthen:

- Scene Graph
- asset normalization
- camera
- layers
- parallax
- animation tracks
- reusable character animation primitives

---

## P1 — AUDIO / TTS ARCHITECTURE

Integrate:

- existing Chatterbox
- VibeVoice Hindi 7B
- common TTS provider interface
- Short support
- Longform support
- UI provider selection
- normalized audio output
- benchmark path

---

## P2 — DIRECTORIAL AUTOMATION

Strengthen:

Story
→ Scene
→ Shot
→ Animation
→ Audio

structured contracts.

---

## P2 — AUTOMATED QA

Strengthen:

Render
→ Visual QA
→ Audio QA
→ Diagnose
→ Fix
→ Rerender

---

# 34. IMPORTANT: DO NOT OVER-ENGINEER

Do not build an enormous theoretical movie engine if the current repository does not need it.

Implement the smallest clean architecture that establishes the correct foundations.

Every abstraction must have a real use in the current codebase or a clear immediate next use.

Do not destabilize working functionality merely to create future abstractions.

---

# 35. DEFINITION OF DONE

The task is NOT done because:

- TypeScript passes
- unit tests pass
- CI is green
- a render file exists

It is done only when:

### VISUAL

- actual rendered video looks cinematic
- protagonist reads early
- drawing is genuinely path-based
- no rectangular artwork boundary
- no blank frame
- no drawing reset
- final artwork is correct
- composition is intentional

### ANIMATION

- architecture supports layers
- camera is structured
- parallax is supported
- character motion can be represented structurally
- animation derives from shot intent

### AUDIO

- Chatterbox works
- VibeVoice Hindi 7B works
- both work for Short
- both work for Longform
- UI selection actually controls the provider
- output audio is normalized
- voice identity remains consistent

### ARCHITECTURE

- Scene Graph exists or is cleanly evolved
- asset normalization exists
- TTS providers are abstracted
- renderer remains deterministic
- existing functionality remains compatible

### QA

- engineering tests pass
- visual QA passes
- audio QA passes
- actual rendered artifacts have been inspected

---

# FINAL PRODUCT NORTH STAR

KATHAAYA should evolve toward:

USER ENTERS TOPIC

↓

KATHAAYA UNDERSTANDS THE MYTH

↓

KATHAAYA WRITES THE STORY

↓

KATHAAYA DIRECTS THE STORY

↓

KATHAAYA CREATES THE SHOTS

↓

KATHAAYA PREPARES THE ART

↓

KATHAAYA ANIMATES THE ART

↓

KATHAAYA GENERATES CINEMATIC HINDI NARRATION

↓

KATHAAYA MIXES MUSIC + SFX

↓

KATHAAYA RENDERS THE MOVIE

↓

KATHAAYA WATCHES / INSPECTS THE RESULT

↓

KATHAAYA FIXES VISUAL OR AUDIO PROBLEMS

↓

KATHAAYA RENDERS AGAIN

↓

FINAL CINEMATIC 2D MYTHOLOGY MOVIE

That is the product we are building.

Do not optimize for "passing tests."

Optimize for producing a movie that a human viewer would genuinely want to keep watching.

Implement this using the existing repository architecture, preserve working functionality, and make changes directly in the current PR #5 workflow. Do not create another PR.