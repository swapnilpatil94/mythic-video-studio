# Progress Addendum — Image Validation

## 2026-09-06 — Image inspection and normalization stage

This addendum records the implementation completed in the current iteration. The canonical `docs/PROGRESS.md` update was attempted but GitHub returned a 409 SHA mismatch despite repeated fresh reads; `docs/STATUS.md` was updated successfully. This addendum prevents the work from being lost and is intentionally explicit about that repository write limitation.

### Completed

- Added pure-TypeScript PNG/JPEG probing in `src/pipeline/image-validation.ts`.
- Added dimension and minimum-size validation.
- Added PNG alpha-capability detection.
- Added `npm run inspect:assets`.
- Added optional FFmpeg normalization in `src/normalize-assets.ts`.
- Normalized outputs are deterministic PNG files and are re-probed before registry acceptance.
- Asset registry now records width/height after successful inspection/normalization.
- Strict production runs normalization and asset inspection before Remotion rendering.
- Added package scripts for inspection and normalization.

### Exact commands

```bash
npm run inspect:assets -- examples/karna-short.json
npm run normalize:assets -- examples/karna-short.json
REQUIRE_GENERATED_ASSETS=1 bash run.sh examples/karna-short.json
REQUIRE_GENERATED_ASSETS=1 NORMALIZE_ASSETS=1 bash run.sh examples/karna-short.json
```

### Verification boundary

These checks verify file readability, supported format and dimensions. They do not verify semantic correctness, visual quality, character consistency, mythology respect, or successful execution of the user's FLUX installation. A real target-machine run remains required before M1 can be closed.

### Next milestone

- Record generation runtime, retries and content hashes.
- Add semantic asset requirements and optional reference images.
- Build the Chatterbox/deep-Hindi TTS adapter and narration cache.
