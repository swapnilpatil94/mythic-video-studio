#!/usr/bin/env python3
"""Local FLUX (mflux, Apple Silicon native) image adapter for mythic-video-studio.

Contract: invoked as `flux_image.py <job.json>` where job.json is written by
src/generate-assets.ts (ImageGenerationInput-shaped job: prompt, output_path,
reference_path, asset_id, kind, ...). Produces one master-asset PNG at
job.output_path.

Uses the mflux CLI (github.com/filipstrand/mflux) already installed under
pyenv 3.10.13 on this machine, with cached FLUX.1-schnell / FLUX.2-klein
weights. Master assets are generated large/tall relative to the final
1080x1920 frame so the Remotion compositor can pan/push/crop into them
without upscaling.
"""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

MFLUX_BIN_DIR = os.environ.get("MFLUX_BIN_DIR", "/Users/swapnil/.pyenv/versions/3.10.13/bin")
MFLUX_GENERATE = os.environ.get("MFLUX_GENERATE_BIN", str(Path(MFLUX_BIN_DIR) / "mflux-generate"))
MFLUX_GENERATE_KONTEXT = os.environ.get("MFLUX_KONTEXT_BIN", str(Path(MFLUX_BIN_DIR) / "mflux-generate-kontext"))

REMBG_BIN = os.environ.get("REMBG_BIN", "/Users/swapnil/yt-tech/.venv-bgremove/bin/rembg")
REMBG_MODEL = os.environ.get("REMBG_MODEL", "bria-rmbg")
# Kinds whose pipeline contract (src/pipeline/asset-requirements.ts) requires an alpha channel.
ALPHA_REQUIRED_KINDS = {"character", "overlay"}

FLUX_MODEL = os.environ.get("FLUX_MODEL", "schnell")
FLUX_QUANTIZE = os.environ.get("FLUX_QUANTIZE", "8")
FLUX_STEPS = os.environ.get("FLUX_STEPS", "4")
# 896x1592 (~1.43MP) is the largest size confirmed to complete on this machine's GPU without a
# Metal out-of-memory abort during VAE decode; 1280x2272 (~2.9MP) reliably OOMs. See the
# automatic step-down retry in generate_once()/main() below for further safety margin.
FLUX_WIDTH = os.environ.get("FLUX_WIDTH", "896")
FLUX_HEIGHT = os.environ.get("FLUX_HEIGHT", "1592")
FLUX_NEGATIVE_PROMPT = os.environ.get(
    "FLUX_NEGATIVE_PROMPT",
    "text, watermark, logo, signature, modern objects, photograph, 3d render, low quality, blurry, extra limbs, deformed hands",
)

# Sizes to try in order on Metal out-of-memory failure, from the configured default down.
_STEP_DOWN_SIZES = [
    (int(FLUX_WIDTH), int(FLUX_HEIGHT)),
    (768, 1360),
    (640, 1136),
    (512, 896),
]


def log(message: str) -> None:
    print(f"[flux_image] {message}", file=sys.stderr, flush=True)


def seed_for(asset_id: str) -> int:
    digest = hashlib.sha256(asset_id.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 1_000_000_000


def main() -> int:
    if len(sys.argv) < 2:
        log("usage: flux_image.py <job.json>")
        return 2

    job_path = Path(sys.argv[1])
    job = json.loads(job_path.read_text(encoding="utf-8"))

    prompt = (job.get("prompt") or "").strip()
    output_path = Path(job["output_path"])
    asset_id = job.get("asset_id", output_path.stem)
    reference_path = job.get("reference_path")

    if not prompt:
        log("empty prompt")
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    seed = str(seed_for(asset_id))
    use_kontext = bool(reference_path and Path(reference_path).exists())
    binary = MFLUX_GENERATE_KONTEXT if use_kontext else MFLUX_GENERATE

    if not Path(binary).exists():
        log(f"mflux binary not found: {binary}")
        return 1

    def build_args(width: int, height: int, low_ram: bool) -> list[str]:
        if use_kontext:
            args = [
                binary,
                "--model", os.environ.get("FLUX_KONTEXT_MODEL", "dev"),
                "--image-path", str(reference_path),
                "--prompt", prompt,
                "--width", str(width),
                "--height", str(height),
                "--seed", seed,
                "--output", str(output_path),
            ]
        else:
            args = [
                binary,
                "--model", FLUX_MODEL,
                "--prompt", prompt,
                "--negative-prompt", FLUX_NEGATIVE_PROMPT,
                "--width", str(width),
                "--height", str(height),
                "--steps", FLUX_STEPS,
                "--seed", seed,
                "--output", str(output_path),
            ]
        if FLUX_QUANTIZE:
            args += ["--quantize", FLUX_QUANTIZE]
        if low_ram:
            args += ["--low-ram"]
        return args

    result = None
    for attempt, (width, height) in enumerate(_STEP_DOWN_SIZES):
        low_ram = attempt > 0
        log(f"{'kontext' if use_kontext else 'text-to-image'} generation for {asset_id} "
            f"(attempt {attempt + 1}/{len(_STEP_DOWN_SIZES)}, {width}x{height}, low_ram={low_ram}, seed={seed})")
        result = subprocess.run(build_args(width, height, low_ram), capture_output=False)
        if result.returncode == 0 and output_path.exists():
            break
        log(f"mflux exited with code {result.returncode} at {width}x{height}; "
            f"{'stepping down and retrying' if attempt + 1 < len(_STEP_DOWN_SIZES) else 'out of fallback sizes'}")

    if result is None or result.returncode != 0:
        return result.returncode if result else 1

    if not output_path.exists():
        log(f"mflux completed but {output_path} was not created")
        return 1

    kind = job.get("kind")
    if kind in ALPHA_REQUIRED_KINDS:
        if not Path(REMBG_BIN).exists():
            log(f"rembg not found at {REMBG_BIN}; leaving {output_path} without alpha")
        else:
            matted = output_path.with_name(f".{output_path.stem}.matted.png")
            bg_result = subprocess.run(
                [REMBG_BIN, "i", "-m", REMBG_MODEL, "-ppm", "-dc", str(output_path), str(matted)],
                capture_output=False,
            )
            if bg_result.returncode == 0 and matted.exists():
                matted.replace(output_path)
                log(f"removed background for {asset_id} ({kind}) via rembg/{REMBG_MODEL}")
            else:
                log(f"rembg failed for {asset_id}; leaving opaque background")

    log(f"wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
