# Architecture

```text
                         CHATGPT FRONTIER / WORK
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
        Story Bible        Character Bible       Source Notes
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  ▼
                             Script Package
                                  │
                                  ▼
                            Visual Director
                                  │
                                  ▼
                         Scene / Beat Manifests
                                  │
                                  ▼
                          LOCAL MAC ORCHESTRATOR
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
       Image Generation        Hindi TTS           Music/SFX
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  ▼
                         Asset Preparation
                    masks / layers / crops / cache
                                  │
                                  ▼
                    VECTOR + MOTION HANDOFF
                         Friction scene spec
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
             Friction authoring            Remotion
          character acting / paths       deterministic film
          keyframes / morphs / FX       camera / compositing
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
                              FFmpeg
                                  │
                                  ▼
                             final.mp4
```

## Animation boundary

**AI creates the master artwork. Code creates the movie. Friction creates/edits the reusable 2D animation motion layer. Remotion remains the deterministic final compositor.**

The repository does not commit Friction's binary `.friction` project files. Instead, the canonical handoff is a versioned `FrictionSceneSpec` plus generated SVG/assets. This keeps source control reviewable and prevents the renderer from depending on an opaque editor project format.

The Friction adapter currently prepares that handoff. It deliberately does **not** pretend that Friction has a stable documented headless CLI/API. When Friction is available locally, the generated scene/assets can be opened in Friction for keyframing and path/morph work. Friction can then export SVG animation or rendered video, while Remotion remains responsible for final episode composition.

## Artifact boundaries

Every project is broken into small JSON/Markdown artifacts:

- `series.json`
- `episode.json`
- `characters.json`
- `locations.json`
- `props.json`
- `script.json`
- `storyboard.json`
- `render-manifest.json`
- `friction-scene.json`

A failed scene can be regenerated without restarting the entire project.

## Asset philosophy

A master character image is an input to the animation system, not the final shot. The renderer can crop, pan, zoom, mask, layer, reveal, highlight and transform it.

AI generation is reserved for new visual information that cannot be cheaply produced procedurally or through existing assets.

## Initial technology choices

- Node.js + TypeScript — orchestration
- Zod — artifact validation
- Remotion — deterministic composition/rendering
- Friction — 2D animation authoring for reusable character/environment motion
- SVG/Rough.js/canvas — procedural hand-drawn effects
- local image model — master art generation
- local Hindi TTS — narration
- FFmpeg — audio/video utilities

Friction is intentionally treated as an animation tool, not the asset-design system; assets should be created externally and imported/linked into Friction.

The image model is intentionally abstracted behind an adapter so FLUX/Klein or another local model can be swapped without changing the story/animation contracts.
