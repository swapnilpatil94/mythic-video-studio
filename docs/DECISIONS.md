# Architecture Decisions

## ADR-001 — Short first
Use Shorts as an integration test for the complete pipeline before long-form. This reduces debugging surface and gives measurable visual/audio output quickly.

## ADR-002 — Frontier, not LLM API
Creative work remains in ChatGPT Frontier/Work. The local repository consumes exported artifacts. No OpenAI API dependency is required for M0–M5.

## ADR-003 — Master assets, not shot-per-image generation
AI image generation is expensive on Apple Silicon. Generate masters, then derive shots through animation/composition.

## ADR-004 — Per-project asset library
Assets are scoped to projects/series. New characters can be created whenever a story requires them; existing assets can be reused when appropriate.

## ADR-005 — Respect mode
Mythology projects default to `MYTHOLOGY_RESPECT_MODE` for revered figures and source-sensitive material.

## ADR-006 — Artifact contracts
Each stage reads/writes small files. This makes the pipeline resumable, debuggable and easy to inspect.
