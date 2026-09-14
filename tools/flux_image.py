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

from PIL import Image

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


def strip_corner_stamp(path: Path) -> None:
    """FLUX.1-schnell (the local model this adapter uses) has a persistent habit of stamping a
    small red seal/chop mark into a corner of generated illustrations, regardless of prompt
    instructions telling it not to — confirmed directly across multiple independent generations
    that each explicitly asked for "no watermark/seal/signature", so this is a real, recurring
    model quirk, not something further prompt engineering reliably fixes. This runs after rembg
    has already isolated the real subject onto a transparent background, so a stamp shows up as a
    small, ISOLATED patch of opaque, high-saturation red pixels sitting in an otherwise-transparent
    corner — real subject artwork essentially never produces that exact pattern (a character's own
    linework extends continuously from a corner toward the image's center; it doesn't leave a
    transparent gap around a small red island sitting by itself). That's the signal this looks for,
    rather than fixed coordinates, so it adapts to whichever corner the stamp happens to land in.
    """
    try:
        img = Image.open(path).convert("RGBA")
    except Exception as exc:
        log(f"corner-stamp check skipped for {path}: {exc}")
        return
    width, height = img.size
    pixels = img.load()
    corner_w = max(20, int(width * 0.14))
    corner_h = max(20, int(height * 0.10))
    corners = {
        "top-left": (0, 0),
        "top-right": (width - corner_w, 0),
        "bottom-left": (0, height - corner_h),
        "bottom-right": (width - corner_w, height - corner_h),
    }
    changed = False
    for name, (cx, cy) in corners.items():
        stamp_xs, stamp_ys = [], []
        total = corner_w * corner_h
        for dy in range(corner_h):
            for dx in range(corner_w):
                x, y = cx + dx, cy + dy
                if x < 0 or y < 0 or x >= width or y >= height:
                    continue
                r, g, b, a = pixels[x, y]
                # High-saturation red/crimson ink, opaque enough to be real mark rather than an
                # anti-aliased edge — this is deliberately about COLOR, not about the corner being
                # otherwise transparent: a first version of this required that, but the seal's own
                # small backing card is itself opaque (rembg keeps it as "foreground"), so the
                # corner around a real stamp is often opaque cream, not transparent, and that
                # version of the check missed every real stamp it was tested against.
                if a > 80 and r > 120 and r > g * 1.5 and r > b * 1.5:
                    stamp_xs.append(x)
                    stamp_ys.append(y)
        if not stamp_xs:
            continue
        bbox_w = max(stamp_xs) - min(stamp_xs) + 1
        bbox_h = max(stamp_ys) - min(stamp_ys) + 1
        # A real stamp is a small, self-contained mark — reject anything whose bounding box fills
        # most of the corner, since that's more likely a real red ink accent that belongs to the
        # actual artwork (this project's palette does use a restrained mythic red deliberately).
        if bbox_w > corner_w * 0.7 or bbox_h > corner_h * 0.7:
            continue
        pad = 12
        x0, x1 = max(0, min(stamp_xs) - pad), min(width, max(stamp_xs) + pad + 1)
        y0, y1 = max(0, min(stamp_ys) - pad), min(height, max(stamp_ys) + pad + 1)
        # Fill rather than punch a transparent hole: the stamp usually sits on/near the character's
        # own clothing or a small opaque backing card (rembg keeps both as "foreground"), not on
        # bare transparent canvas — clearing straight to alpha=0 there left a visible rectangular
        # gap IN the artwork (confirmed on a real test image: a black hole bitten out of a robe).
        # Sampling one pixel just outside the cleared box, toward the true image corner, and flood-
        # filling with it is a crude but effective inpaint here: that corner-ward direction is the
        # side most likely to already be clean background/fabric rather than more stamp or subject
        # detail, since the stamp itself sits close to the corner rather than centered in the frame.
        sample_x = min(width - 1, x1) if cx == 0 else max(0, x0 - 1)
        sample_y = min(height - 1, y1) if cy == 0 else max(0, y0 - 1)
        fill = pixels[sample_x, sample_y]
        for y in range(y0, y1):
            for x in range(x0, x1):
                pixels[x, y] = fill
        changed = True
        log(f"stripped a probable corner watermark/seal from {name} of {path.name} (bbox {bbox_w}x{bbox_h}px, filled {x1-x0}x{y1-y0}px with sampled {fill})")
    if changed:
        img.save(path)


def seed_for(asset_id: str, prompt: str = "") -> int:
    # Hashing asset_id alone made the seed insensitive to the prompt entirely — confirmed directly:
    # regenerating ganesha.master with a substantially rewritten prompt (different composition
    # instructions, different iconography cues) produced a byte-for-byte identical PNG, because
    # FLUX.1-schnell only takes a handful of inference steps and a fixed seed's initial noise
    # dominates the result far more than it would on a full-step model — the prompt barely gets a
    # chance to redirect the trajectory. Folding the prompt into the seed keeps this function's own
    # purpose (deterministic, reproducible output for the same inputs) while actually responding to
    # a real prompt edit, which is the whole point of being able to fix a bad generation by rewriting
    # its prompt.
    digest = hashlib.sha256(f"{asset_id}:{prompt}".encode("utf-8")).hexdigest()
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
    seed = str(seed_for(asset_id, prompt))
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
                strip_corner_stamp(output_path)
            else:
                log(f"rembg failed for {asset_id}; leaving opaque background")

    log(f"wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
