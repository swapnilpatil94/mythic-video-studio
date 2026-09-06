# Mythic Video Studio

A local-first production system for high-retention Hindi mythology storytelling videos.

**Current strategy:** prove the complete 60–90s Short pipeline first, then scale the same engine to 8–12 minute long-form episodes and serialized source-based seasons.

## The rule

**You run one command. The pipeline does the work.**

The long-term command is:

```bash
bash run.sh examples/your-short.json
```

That command will install Node dependencies when needed, validate the manifest, prepare the runtime manifest, generate/resolve required assets through adapters, run Hindi TTS, compose the animation and render the MP4.

During M1 the image/TTS adapters are intentionally being wired separately; the current renderer already proves the animation/compositing layer with procedural fallback artwork.

## KATHAAYA Studio — local project manager

A local control panel for managing multiple story projects and driving this same pipeline, instead of hand-editing manifest JSON. It is a thin UI layer only: it reads/writes project files under `projects/<id>/` and calls the existing `run.sh`/`preflight.ts` — it does not add a second renderer or duplicate any pipeline logic.

```bash
npm run studio
```

Opens the API server (`src/studio/server.ts`, port 4321) and the web UI (Vite, port 5173) together. From the dashboard you can create a project (blank or by pasting a story-package JSON, which is auto-split into `project.json`/`story.json`/`script.json`/`manifest.json`/`characters.json`/`metadata.json`), edit its Story/Script/Visuals/Characters/Metadata, and run Preflight or the full pipeline from the Production tab with live logs — the same `run.sh` a terminal user would call, just against `projects/<id>/manifest.json`.

## Vision

ChatGPT Frontier/Work is the creative director and research/writing environment. The local Mac is the production studio: asset generation, TTS, animation, compositing and rendering.

We do **not** generate one AI image per shot. We generate a small set of high-quality master assets, then reuse, crop, layer, animate and transform them into many visual beats.

## Visual target

The target is **premium hand-illustrated Indian storytelling**:

- cream/parchment paper base
- expressive black ink linework
- restrained gold/red accents
- detailed Indian-inspired illustration
- hand-drawn reveal and stroke animation
- 2.5D camera movement, pans, pushes and parallax
- strong Hindi typography
- meaningful visual change every few seconds
- respectful treatment of sacred/revered figures

This is **not** a stock-footage documentary, generic slideshow, or crude stick-figure whiteboard.

## Production architecture

```text
Frontier/Work
   ↓
research → story → source notes → character bible → storyboard
   ↓
local production package
   ↓
FLUX/local image adapter → master art/cache
Chatterbox/deep Hindi voice adapter → narration
music/SFX adapters
   ↓
asset preparation → SVG/procedural motion → 2.5D camera
   ↓
Remotion → FFmpeg → final.mp4
```

Remotion is the core animation/rendering engine because it lets the movie be generated from React/code, parameterized, and rendered to real MP4 files. urlRemotion official sitehttps://www.remotion.dev/

## First milestone

Produce one polished Hindi mythology Short end-to-end:

`story → character bible → master art → storyboard → Hindi voice → SFX/music → hand-drawn/illustrated animation → MP4`

Then stress-test with 3 Shorts. Only after that do we enable long-form mode.

## Repository map

- `docs/` — product vision, architecture, quality gates, progress
- `prompts/` — Frontier prompts used to create production artifacts
- `schemas/` — machine-readable contracts
- `src/` — local orchestration, adapters and rendering code (`src/studio/` — KATHAAYA Studio's API server and project-file logic; `src/shared/` — brand/platform-safe-zone data shared with the Remotion compositor)
- `web/` — KATHAAYA Studio's frontend (Vite + React + TypeScript)
- `examples/` — example project manifests
- `projects/` — generated project data
- `assets/` — generated media
- `renders/` — final MP4 output

## Design principles

1. **Generative-first, library-second** — create new assets when the story needs them; reuse when possible.
2. **Mythology Respect Mode** — revered figures are dignified and non-comedic; source claims are separated from interpretation.
3. **Story-first retention** — curiosity, tension, reveal, payoff; visual changes support the story rather than becoming decoration.
4. **Local-first production** — no dependency on an LLM API for the creative workflow.
5. **Small artifacts** — long projects are split into series/episode/scene files instead of one giant prompt/output.
6. **Recoverable execution** — every stage is resumable and idempotent.
7. **AI creates the artwork. Code creates the movie.**
8. **No shot-per-image generation** — master assets are reused through crops, layers, motion and procedural effects.

## Status

See [`docs/PROGRESS.md`](docs/PROGRESS.md).
