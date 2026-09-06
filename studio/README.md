# Kathaaya Studio UI

Minimal local control surface for Mythic Video Studio.

## Start

```bash
npm install
npm run studio
```

Open `http://127.0.0.1:4317`.

The UI manages projects under `projects/`, imports one Story Package JSON, splits it into canonical files, edits/validates JSON, and exposes the exact `run.sh` command for production. It intentionally does not replace FLUX, Chatterbox, Whisper or Remotion.

## Canonical project files

- `project.json`
- `story.json`
- `script.json`
- `manifest.json`
- `characters.json`
- `metadata.json`

## Story Package

Use `prompts/story-package.md` to generate the importable JSON package. Contract: `schemas/story-package.schema.json`.

## Verification boundary

The UI/API source is committed, but the connected GitHub environment cannot run the user's Mac-local runtime or install dependencies. Verify on the target Mac with `npm install`, `npm run typecheck`, `npm run studio`, then create/import a sample project and run its displayed production command.
