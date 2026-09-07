# Running Mythic Video Studio locally

A practical setup/operating guide — what has to be installed, how to configure it, and how to run
a real production both from the terminal and from KATHAAYA Studio's UI. For the product vision and
architecture, see [`README.md`](../README.md) and [`docs/ARCHITECTURE.md`](ARCHITECTURE.md); for
what the pipeline has actually produced and verified so far, see
[`docs/STATUS.md`](STATUS.md)/[`docs/PROGRESS.md`](PROGRESS.md).

## What you actually need installed

The pipeline itself (Node/Remotion/ffmpeg) is portable. The three *creative* adapters
(image/voice/alignment) are external local tools this repo shells out to — they are **not**
bundled or installed by `npm install`, and the versions of `tools/*.py` currently in this repo are
tuned to this machine's own install paths (see "Adapter paths are machine-specific" below).

| Tool | Used for | Notes |
|---|---|---|
| Node.js 20+ | the whole pipeline, Remotion render, Studio | this machine runs v25; anything 20+ works |
| npm | dependency install, all `npm run` scripts | ships with Node |
| ffmpeg + ffprobe | audio synthesis/mixing, output QA, frame extraction | `brew install ffmpeg` on macOS; must be on `PATH` |
| Python 3.10+ | runs the three adapter scripts in `tools/` | a dedicated virtualenv/pyenv is strongly recommended over system Python |
| [mflux](https://github.com/filipstrand/mflux) | local FLUX image generation (`tools/flux_image.py`) | Apple Silicon only; needs FLUX.1-schnell (or klein/dev) weights cached locally |
| [chatterbox-tts](https://github.com/resemble-ai/chatterbox) + torch + soundfile | Hindi voice cloning (`tools/chatterbox_tts.py`) | needs a reference voice WAV — see below |
| [whisperx](https://github.com/m-bain/whisperX) | forced alignment + dead-air tightening (`tools/whisper_align.py`) | CPU is fine for beat-length clips; needs the `hi` wav2vec2 alignment model |
| [rembg](https://github.com/danielgatis/rembg) (optional) | alpha/background removal for `character`/`overlay` assets | only required if `ALPHA_REQUIRED_KINDS` assets need a transparent background |

None of the three adapters are hard-required to explore the repo — without them configured, the
pipeline still runs in a "smoke test" mode (procedural placeholder art/silence instead of real
FLUX/Chatterbox output) unless you turn on the `REQUIRE_*` strict gates described below. A real,
publishable render needs all three.

## First-time setup

```bash
git clone <this repo>
cd mythic-video-studio
npm install
```

Then configure the adapters:

```bash
cp config/.env.example .env
```

Edit `.env` (repo root, already gitignored — never commit real paths/secrets here) and fill in:

```bash
# Local FLUX image adapter
IMAGE_GENERATOR_COMMAND=python3
IMAGE_GENERATOR_ARGS="/absolute/path/to/tools/flux_image.py {job}"

# Local Chatterbox Hindi TTS adapter
TTS_COMMAND=python3
TTS_ARGS="/absolute/path/to/tools/chatterbox_tts.py {job}"
TTS_REFERENCE_AUDIO=/absolute/path/to/a/clean/hindi-narrator-reference.wav
```

`{job}` is substituted with a path to a JSON job file the pipeline writes for that call — the
adapter script reads it, does its work, and writes the requested output file. This is the whole
contract; see the docstring at the top of each `tools/*.py` file for the exact job shape.

**The reference voice WAV is not provided by this repo.** It needs to be a real, clean recording of
the voice you want narration cloned from (a few seconds to a couple of minutes, Hindi or otherwise —
Chatterbox Multilingual clones the voice, not the language). Place it anywhere and point
`TTS_REFERENCE_AUDIO` at it.

### Adapter paths are machine-specific — read this before debugging a "command not found"

`tools/flux_image.py` and `tools/chatterbox_tts.py` currently hardcode fallback paths for *this*
machine's own pyenv installs (e.g. `MFLUX_BIN_DIR` defaults to
`/Users/swapnil/.pyenv/versions/3.10.13/bin`, `REMBG_BIN` defaults into a `yt-tech` virtualenv that
only exists on this machine). On a different machine, either:
- install `mflux`/`chatterbox-tts`/`whisperx`/`rembg` into a Python environment and set the
  matching override env var (`MFLUX_BIN_DIR`, `MFLUX_GENERATE_BIN`, `REMBG_BIN`, `REMBG_MODEL`, ...
  — grep each `tools/*.py` for `os.environ.get(` to see every override it accepts), **or**
- edit the hardcoded default paths in those three files directly.

This is real, load-bearing setup, not boilerplate — skipping it is why `npm run preflight` (below)
exists.

### Verify the setup before running a real production

```bash
npm run preflight -- examples/karna-short.json
```

This is `src/preflight.ts` — it checks Node/ffmpeg/ffprobe are on `PATH` and that the configured
image/TTS adapter *commands* actually exist and are executable (not that they produce correct
output — that only a real run proves). Run this first on a new machine; it's also exposed as a
button in the Studio UI's Production tab.

## Running a production

### One command, terminal-only

```bash
bash run.sh examples/karna-short.json
```

This installs `node_modules` if missing, then runs the full pipeline (`src/produce.ts`): validate →
prepare project → generate/normalize assets → generate voice → align (Whisper) → mix audio →
generate captions → stage assets → Remotion render → visual QA contact sheet → output QA. Pass a
second argument for an explicit output path (mainly used by the Studio UI so per-project renders
land under `projects/<id>/renders/` instead of colliding on one default name):

```bash
bash run.sh projects/my-project/manifest.json projects/my-project/renders/my-project.mp4
```

**Strict gates** (off by default — a plain run degrades gracefully wherever an adapter isn't
configured, rather than failing): set any of these to `1` in the environment to make that stage
fail loudly instead of silently degrading. Useful once you actually expect a real, complete
production, not a structural smoke test.

| Flag | Fails the run if... |
|---|---|
| `REQUIRE_GENERATED_ASSETS` | any master asset is still missing/unresolved after generation |
| `REQUIRE_ASSET_REQUIREMENTS` | any beat's `asset_refs` doesn't resolve to a real asset |
| `REQUIRE_CHARACTER_REFERENCES` | a character asset has no reference image and one is required |
| `REQUIRE_TTS` | narration audio is missing |
| `REQUIRE_TTS_ALIGNMENT` / `REQUIRE_WHISPER_ALIGNMENT` | forced alignment didn't produce usable word timings |
| `REQUIRE_AUDIO_MIX` | `final-mix.wav` wasn't produced |
| `REQUIRE_OUTPUT_QA` | resolution/fps/duration/black-frame/clipping/trailing-silence checks fail on the rendered MP4 |
| `REQUIRE_RELEASE_EVIDENCE` | the full evidence bundle (QA report + contact sheet + output QA) isn't complete |

```bash
REQUIRE_GENERATED_ASSETS=1 REQUIRE_TTS=1 REQUIRE_TTS_ALIGNMENT=1 REQUIRE_AUDIO_MIX=1 \
REQUIRE_OUTPUT_QA=1 REQUIRE_RELEASE_EVIDENCE=1 \
bash run.sh projects/my-project/manifest.json
```

The Studio UI's Production tab exposes the same six flags as checkboxes (see below) — turning them
all on there is equivalent to the line above.

Also useful directly, without a full run:

```bash
npm run validate -- examples/karna-short.json   # schema/contract validation only
npm run inspect -- examples/karna-short.json    # print a manifest's structure
npm run check:pipeline -- examples/karna-short.json  # confirms every pipeline stage is actually wired (no silent no-ops)
```

### Through KATHAAYA Studio's UI (recommended for iterating on a real story)

Studio is a thin local dashboard over the exact same pipeline — it reads/writes
`projects/<id>/*.json` and calls the same `run.sh`/`preflight.ts`, it does not add a second
renderer or duplicate any pipeline logic.

```bash
npm run studio
```

This starts two processes together (`src/studio/dev.ts`): the API server on
`http://localhost:4321` (override with `STUDIO_API_PORT`) and the Vite dev server on
`http://localhost:5173`. Open **http://localhost:5173**.

1. **Create a project** (dashboard → "New Project"):
   - **Blank** — give it a name, pick Short or Longform, language, target duration. Produces a
     minimal starter manifest you then fill in by hand across the tabs below.
   - **Import** — paste a Story Package JSON (see [`prompts/story-package.md`](../prompts/story-package.md)
     for the prompt that generates one, and
     [`examples/karna-longform-full-journey.json`](../examples/karna-longform-full-journey.json)
     for a complete real example). The modal validates it against
     `schemas/story-package.schema.json` before creating the project, and the importer
     (`src/studio/story-package.ts`) splits it into `project.json`/`story.json`/`script.json`/
     `manifest.json`/`characters.json`/`metadata.json` for you — this is the fast path to a real
     production, not the blank-project path.
2. **Fill in the story** across the **Story / Script / Visuals / Characters / Metadata** tabs (all
   pre-filled already if you imported a package; edit directly if you started blank).
3. **Assets tab** — see which master assets the manifest currently needs, and their generation
   status.
4. **Audio tab** — narration/mix status once a run has produced it.
5. **Production tab** — this is where a render actually happens:
   - **Run Preflight** first on a new project/machine — confirms the configured adapters are real,
     executable commands.
   - Toggle the **strict gates** you want (see the table above) — leave them off for a fast
     unconfigured-adapter smoke run, turn them on for a real production once FLUX/Chatterbox are
     configured.
   - **Run Pipeline** — this calls `run.sh` against this project's own `manifest.json`, with a live
     log streamed in the same tab (polled every 1.5s while running).
   - On success, an **"Open rendered video"** link appears, pointing at
     `projects/<id>/renders/<id>.mp4`.
6. **QA tab** — the visual QA contact sheet and output QA report for the most recent render.

## Directly previewing/scrubbing in Remotion Studio

For iterating on the compositor itself (`src/remotion/MythicShort.tsx` and friends) without a full
render each time:

```bash
npm run dev
```

Opens Remotion's own timeline/preview UI (`remotion studio`) against `src/remotion/index.ts`. This
reads whatever is currently in `src/remotion/runtime-manifest.ts`/`runtime-assets.ts`/
`runtime-audio.ts`/`runtime-captions.ts` — the same generated files `stage-assets.ts` writes during
a real pipeline run — so run the pipeline (or at least `stage-assets.ts`) once against the project
you want to preview first.

## Running it *efficiently* — what actually costs time, and how to avoid re-paying it

- **Master assets are cached, not regenerated.** `generate-assets.ts` skips any asset whose
  expected output file already exists (or whose registry entry is already `ready`) — real FLUX
  generation only runs for genuinely new/missing assets. Copying an existing project's assets into
  a new project's `assets/<kind>/` directories (matching the new manifest's own `asset_kinds`
  classification) is a legitimate way to reuse expensive generations across stories; see
  `docs/STATUS.md`'s longform-production milestone for a worked example.
- **TTS is cached the same way** — `generate-voice.ts` skips narration synthesis if
  `audio/narration.wav` already exists. If you only changed *visuals*, not the script text, you
  don't need to regenerate voice at all; deleting that file is what forces a real re-synthesis.
- **Whisper alignment is comparatively cheap** (CPU, beat-length clips) and re-runs every full
  pipeline call — this is normally not the bottleneck.
- **The Remotion render itself scales with `duration_seconds × fps`** (30fps) — a 3-minute longform
  render is the single slowest real stage in a full run once assets/voice are cached. Iterating on
  compositor code is much faster via `npm run dev` (Remotion Studio) against a single beat than via
  repeated full pipeline runs.
- **Iterate on one problem, verify with real evidence, before the next change.** Don't batch several
  unverified visual changes into one render — extract dense frames from the actual output
  (`ffmpeg -ss <t> -frames:v 1`) and inspect them before deciding the next fix; this repo's own
  `docs/STATUS.md` milestones are a record of exactly that loop, including real bugs a first "fix"
  attempt didn't actually resolve.
- **`npm run check:pipeline`** (fast, no render) catches "this stage is wired but doing nothing"
  regressions before you waste a full render on them.
