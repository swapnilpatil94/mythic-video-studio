# Friction Integration

## Role of Friction

Friction is the 2D animation authoring layer in KATHAAYA. It is responsible for reusable motion that is awkward to express as one-off Remotion primitives:

- character breathing and subtle acting
- head turns and eye shifts
- cloth/hair secondary motion
- path drawing and trim effects
- shape/path morphs
- reusable camera moves
- environment motion

Remotion remains the deterministic final compositor for the complete film.

## Source-of-truth rule

The AI/master artwork remains the visual source of truth. We do not regenerate a character merely because an animation shot needs motion. Instead, the asset pipeline prepares separable SVG/raster layers and the Friction scene contract describes how those layers should move.

## Handoff

```text
storyboard / shot manifest
        ↓
FrictionSceneSpec
        ↓
npm run friction:check -- examples/friction-karna-scene.json
        ↓
npm run friction:prepare -- examples/friction-karna-scene.json
        ↓
renders/friction/<scene>.svg
renders/friction/<scene>.friction-scene.json
        ↓
Friction
        ↓
animated SVG or rendered scene
        ↓
Remotion shot compositor
        ↓
final MP4
```

The repository intentionally does not attempt to manufacture `.friction` binary files. Friction documents its project format as binary and recommends external asset design/import. The versioned scene JSON is therefore the reviewable contract; the `.friction` project is a local authoring artifact.

## Production rule

A Friction scene is not considered production-ready merely because the scene contract validates. It must pass a rendered visual proof showing:

1. correct character identity and proportions
2. no layer drift or registration errors
3. motion that is subtle and physically plausible
4. no accidental warping of sacred/revered figures
5. camera movement supporting the story beat
6. ink construction and pigment timing remaining coherent
7. final Remotion composite preserving the KATHAAYA visual language

## Current limitation

There is no stable documented Friction headless automation interface in this integration. The current bridge is deliberately an explicit, testable handoff rather than an invented CLI integration. If a stable automation API becomes available, it can be implemented behind the same `FrictionSceneSpec` adapter without changing the story or Remotion contracts.
