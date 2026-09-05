# One-Command Contract

The production interface is intentionally simple.

## Normal use

```bash
./run.sh examples/karna-short.json
```

## What the command owns

The command is responsible for:

1. environment checks
2. dependency installation when missing
3. manifest validation
4. project directory creation
5. cached asset discovery
6. FLUX asset generation when configured and required
7. Hindi voice generation when configured and required
8. music/SFX preparation
9. manifest-driven animation
10. Remotion render
11. final MP4 output
12. production log and timing record

## Resume behavior

The pipeline must be idempotent.

If an asset, voice file or intermediate render already exists and its manifest hash matches, the stage should be skipped.

If a stage fails, the next run should resume from the last valid artifact rather than regenerating everything.

## Human interaction

The user should only be asked for a setup action when the pipeline cannot safely infer a local model/tool location.

After setup, story production should be one command.

## Important distinction

The creative package may be produced outside this repository using the agreed Frontier/Work workflow. The local runner is the deterministic production system that consumes that package.
