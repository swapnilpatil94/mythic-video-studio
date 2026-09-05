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
                       SVG / Canvas / 2.5D / Draw-on
                                  │
                                  ▼
                              Remotion
                                  │
                                  ▼
                              FFmpeg
                                  │
                                  ▼
                             final.mp4
```

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

A failed scene can be regenerated without restarting the entire project.

## Asset philosophy

A master character image is an input to the animation system, not the final shot. The renderer can crop, pan, zoom, mask, layer, reveal, highlight and transform it.

AI generation is reserved for new visual information that cannot be cheaply produced procedurally or through existing assets.

## Initial technology choices

- Node.js + TypeScript — orchestration
- Zod — artifact validation
- Remotion — composition/rendering
- SVG/Rough.js/canvas — hand-drawn effects
- local image model — master art generation
- local Hindi TTS — narration
- FFmpeg — audio/video utilities

The image model is intentionally abstracted behind an adapter so FLUX/Klein or another local model can be swapped without changing the story/animation contracts.
