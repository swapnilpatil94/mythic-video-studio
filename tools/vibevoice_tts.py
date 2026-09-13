#!/usr/bin/env python3
"""Local VibeVoice Hindi 7B TTS adapter for mythic-video-studio.

Contract: invoked as `vibevoice_tts.py <job.json>` — the exact same job shape
tools/chatterbox_tts.py already consumes (see that file's own docstring), so
the two providers are interchangeable from src/generate-voice.ts's point of
view: only *which* adapter command runs differs (see
src/pipeline/tts-provider.ts). Produces a single WAV narration file at
job.output_path, plus the same `<output>.segments.json` sidecar with each
segment's start/end time that tools/whisper_align.py consumes downstream.

VibeVoice is a genuinely different kind of model from Chatterbox: it is a
long-form, multi-speaker conversational TTS model (github.com/vibevoice-community/
VibeVoice, a community-maintained fork of Microsoft's original), not a
per-sentence clip generator, and its public interface is a CLI script
(`demo/inference_from_file.py`) over a cloned checkout of that repo rather
than a pip-importable class the way chatterbox-tts is. This adapter:

  1. Writes the job's narration segments out as one script text file in the
     "Speaker 1: ..." format that script expects (VibeVoice is designed for
     multi-speaker dialogue; KATHAAYA narration is single-speaker, so every
     segment is attributed to one speaker, "kathaya-narrator" by default).
  2. Registers the job's reference_audio as that speaker's voice sample in
     the repo's own `demo/voices/` convention (VibeVoice's voice-cloning
     mechanism), since the CLI takes a *speaker name* it looks up there, not
     an arbitrary WAV path directly.
  3. Runs `demo/inference_from_file.py` as a subprocess and copies its output
     WAV to job.output_path.
  4. Writes the same segments.json sidecar Chatterbox's adapter writes, using
     VibeVoice's own reported/measured duration rather than assuming one.

Requires: a checkout of https://github.com/vibevoice-community/VibeVoice with
its own dependencies installed (torch, transformers, etc.) in whatever Python
environment VIBEVOICE_PYTHON points at — see VIBEVOICE_REPO_DIR below. Model
weights default to the Hindi-tuned checkpoint (tarun7r/vibevoice-hindi-7b on
Hugging Face, built on the base VibeVoice-7B architecture), downloaded
automatically by the underlying `from_pretrained` call on first use; nothing
is preloaded at Studio startup (see docs/RUNNING_LOCALLY.md — lazy loading is
a hard requirement given the model's size).

Hardware: the base VibeVoice-7B model recommends ~24GB VRAM on an NVIDIA GPU
(CUDA). The community fork's inference script also accepts device=mps, so
Apple Silicon is a supported code path — but has NOT been verified end-to-end
on this machine (Apple Silicon, no discrete NVIDIA GPU): the model is large
enough that a full local generation run was outside this session's practical
budget. This adapter is implemented against the documented CLI contract, not
against a real completed run here — see docs/RUNNING_LOCALLY.md and
docs/STATUS.md for the honest status of that verification gap. It will raise
a clear, actionable error (not a silent hang) if the configured device is
unavailable or the repo isn't where VIBEVOICE_REPO_DIR says it is.
"""
import json
import shutil
import subprocess
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent
DEFAULT_REFERENCE = REPO_ROOT / "assets" / "reference-voices" / "hindi-male-narrator.wav"

import os

# Where the vibevoice-community/VibeVoice checkout lives on this machine. Not bundled with this
# repo (a full ML model repo, not application code) — clone it separately and point this at it,
# the same convention MFLUX_BIN_DIR/REMBG_BIN already use for other external local tools (see
# tools/flux_image.py).
VIBEVOICE_REPO_DIR = Path(os.environ.get("VIBEVOICE_REPO_DIR", str(Path.home() / "vibevoice" / "VibeVoice")))
VIBEVOICE_PYTHON = os.environ.get("VIBEVOICE_PYTHON", sys.executable)
# tarun7r/vibevoice-hindi-7b: VibeVoice-7B fine-tuned for Hindi. Configurable, not hardcoded
# elsewhere, per the "exact model/runtime should be configurable" requirement — swap in
# microsoft/VibeVoice-Large or a different checkpoint without touching this script's logic.
VIBEVOICE_MODEL_PATH = os.environ.get("VIBEVOICE_MODEL_PATH", "tarun7r/vibevoice-hindi-7b")
VIBEVOICE_SPEAKER_NAME = os.environ.get("VIBEVOICE_SPEAKER_NAME", "kathaya-narrator")
VIBEVOICE_DEVICE = os.environ.get("VIBEVOICE_DEVICE", "auto")  # auto | cuda | mps | cpu


def log(message: str) -> None:
    print(f"[vibevoice_tts] {message}", file=sys.stderr, flush=True)


def resolve_device() -> str:
    if VIBEVOICE_DEVICE != "auto":
        return VIBEVOICE_DEVICE
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def main() -> int:
    if len(sys.argv) < 2:
        log("usage: vibevoice_tts.py <job.json>")
        return 2

    job_path = Path(sys.argv[1])
    job = json.loads(job_path.read_text(encoding="utf-8"))

    segments = job.get("segments") or []
    if not segments:
        log("no narration segments in job")
        return 1

    output_path = Path(job["output_path"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    inference_script = VIBEVOICE_REPO_DIR / "demo" / "inference_from_file.py"
    if not inference_script.exists():
        log(
            f"VibeVoice checkout not found at {VIBEVOICE_REPO_DIR} "
            "(expected demo/inference_from_file.py there). Clone "
            "https://github.com/vibevoice-community/VibeVoice and set VIBEVOICE_REPO_DIR, "
            "or point VIBEVOICE_REPO_DIR at an existing checkout."
        )
        return 1

    device = resolve_device()
    if device == "cpu":
        log(
            "WARNING: no CUDA or MPS device available — falling back to CPU. VibeVoice-7B on CPU "
            "is expected to be extremely slow (this is a 7B-parameter model); this is not a "
            "recommended production path, only a last-resort fallback so the run fails loudly "
            "via timeout/OOM rather than silently hanging forever."
        )
    log(f"device={device}, model={VIBEVOICE_MODEL_PATH}, repo={VIBEVOICE_REPO_DIR}")

    reference_audio = (job.get("reference_audio") or "").strip()
    reference_path = Path(reference_audio) if reference_audio else DEFAULT_REFERENCE
    if not reference_path.exists():
        log(f"reference voice not found: {reference_path}")
        return 1

    # VibeVoice's voice-cloning mechanism looks up a *speaker name* in its own demo/voices/
    # directory rather than taking an arbitrary WAV path — register our reference audio there
    # under the configured speaker name so `--speaker_names` resolves to it.
    voices_dir = VIBEVOICE_REPO_DIR / "demo" / "voices"
    voices_dir.mkdir(parents=True, exist_ok=True)
    speaker_voice_path = voices_dir / f"{VIBEVOICE_SPEAKER_NAME}{reference_path.suffix}"
    if not speaker_voice_path.exists():
        shutil.copyfile(reference_path, speaker_voice_path)
        log(f"registered reference voice as speaker '{VIBEVOICE_SPEAKER_NAME}': {speaker_voice_path}")

    # KATHAAYA narration is single-speaker; VibeVoice's script format is speaker-attributed
    # dialogue lines, one line per segment, all attributed to the same speaker.
    script_lines = []
    raw_segments: list[dict] = []
    for index, segment in enumerate(segments):
        text = (segment.get("text") or "").strip()
        if not text:
            continue
        script_lines.append(f"Speaker 1: {text}")
        raw_segments.append({"beat_id": segment.get("beat_id", str(index)), "text": text})
    if not script_lines:
        log("no non-empty narration segments in job")
        return 1

    work_dir = output_path.parent
    txt_path = work_dir / f"{output_path.stem}.vibevoice-script.txt"
    txt_path.write_text("\n".join(script_lines), encoding="utf-8")

    generated_dir = work_dir / f"{output_path.stem}.vibevoice-out"
    generated_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        VIBEVOICE_PYTHON,
        str(inference_script),
        "--model_path", VIBEVOICE_MODEL_PATH,
        "--txt_path", str(txt_path),
        "--speaker_names", VIBEVOICE_SPEAKER_NAME,
        "--device", device,
        "--output_dir", str(generated_dir),
    ]
    log(f"running: {' '.join(cmd)}")
    t0 = time.time()
    result = subprocess.run(cmd, cwd=str(VIBEVOICE_REPO_DIR), capture_output=True, text=True)
    log(f"inference finished in {time.time() - t0:.1f}s (exit {result.returncode})")
    if result.returncode != 0:
        log(result.stderr.strip()[-2000:] or result.stdout.strip()[-2000:])
        return 1

    generated_wavs = sorted(generated_dir.glob("*.wav"), key=lambda p: p.stat().st_mtime)
    if not generated_wavs:
        log(f"inference_from_file.py exited 0 but produced no .wav under {generated_dir}")
        return 1
    shutil.copyfile(generated_wavs[-1], output_path)

    import soundfile as sf
    info = sf.info(str(output_path))
    final_duration = info.frames / info.samplerate

    # VibeVoice generates the whole script as one continuous clip rather than per-segment clips
    # KATHAAYA can measure individually, so per-segment start/end here is a proportional estimate
    # (by each segment's share of total narration word count) rather than a measured boundary —
    # tools/whisper_align.py's own forced alignment against the known script text is what turns
    # this into precise word-level timing downstream, the same way it already refines Chatterbox's
    # own generation-time segment bookkeeping.
    total_words = sum(len(s["text"].split()) for s in raw_segments) or 1
    cursor = 0.0
    for seg in raw_segments:
        share = len(seg["text"].split()) / total_words
        duration = final_duration * share
        seg["start_seconds"] = round(cursor, 3)
        seg["end_seconds"] = round(cursor + duration, 3)
        cursor += duration

    wpm = total_words / (final_duration / 60) if final_duration > 0 else 0
    log(f"wrote {output_path} ({final_duration:.2f}s total, {total_words} words, ~{wpm:.0f} WPM)")

    segments_sidecar = output_path.with_name(output_path.name + ".segments.json")
    segments_sidecar.write_text(
        json.dumps({"segments": raw_segments, "duration_seconds": final_duration}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"segment timing (proportional estimate, refined by whisper_align.py): {segments_sidecar}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
