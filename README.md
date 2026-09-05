# Mythic Video Studio

A local-first production system for high-retention Hindi mythology storytelling videos.

**Current strategy:** prove the complete 60–90s Short pipeline first, then scale the same engine to 8–12 minute long-form episodes and serialized source-based seasons.

## Vision

ChatGPT Frontier/Work is the creative director and research/writing environment. The local Mac is the production studio: asset generation, TTS, animation, compositing and rendering.

We do **not** generate one AI image per shot. We generate a small set of high-quality master assets, then reuse, crop, layer, animate and transform them into many visual beats.

## First milestone

Produce one polished Hindi mythology Short end-to-end:

`story → character bible → master art → storyboard → Hindi voice → SFX/music → hand-drawn/illustrated animation → MP4`

Then stress-test with 3 Shorts. Only after that do we enable long-form mode.

## Repository map

- `docs/` — product vision, architecture, quality gates, progress
- `prompts/` — Frontier prompts used to create production artifacts
- `schemas/` — machine-readable contracts
- `src/` — local orchestration/validation code
- `examples/` — example project manifests
- `projects/` — generated project data (ignored/generated in production)
- `assets/` — generated media (ignored/generated in production)

## Design principles

1. **Generative-first, library-second** — create new assets when the story needs them; reuse when possible.
2. **Mythology Respect Mode** — revered figures are dignified and non-comedic; source claims are separated from interpretation.
3. **Story-first retention** — curiosity, tension, reveal, payoff; visual changes support the story rather than becoming decoration.
4. **Local-first production** — no dependency on an LLM API for the creative workflow.
5. **Small artifacts** — long projects are split into series/episode/scene files instead of one giant prompt/output.
6. **Recoverable execution** — every stage is resumable and idempotent.
7. **Quality before speed** — optimize only after the visual target is good.

## Status

See [`docs/PROGRESS.md`](docs/PROGRESS.md).
