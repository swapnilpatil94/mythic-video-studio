#!/usr/bin/env python3
"""Local Chatterbox Multilingual (Hindi) TTS adapter for mythic-video-studio.

Contract: invoked as `chatterbox_tts.py <job.json>` where job.json is written
by src/generate-voice.ts. Produces a single WAV narration file at
job.output_path by generating one clip per beat segment (voice-cloned from a
reference WAV), trimming Chatterbox's own excess boundary silence, applying a
tempo pass to hit a natural conversational pace, and concatenating with a
short breath pad. Also writes a `<output>.segments.json` sidecar with each
segment's precise start/end time in the final file, used as rough alignment
bounds by tools/whisper_align.py.

Requires: chatterbox-tts, torch, soundfile (already installed in the pyenv
3.12.0 environment used by other local video pipelines on this machine).
"""
import json
import subprocess
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent
DEFAULT_REFERENCE = REPO_ROOT / "assets" / "reference-voices" / "hindi-male-narrator.wav"

SILENCE_PAD_SECONDS = 0.12
TRIM_THRESHOLD = 0.02  # relative to each clip's own peak amplitude
TRIM_MARGIN_SECONDS = 0.03
# Post-generation tempo multiplier (ffmpeg atempo). Trimming Chatterbox's own boundary silence
# (see trim_silence) already pushes the natural pace to ~170 WPM on its own, and the downstream
# Whisper-driven dead-air tightening (tools/whisper_align.py) removes further inter-word gaps —
# both push effective WPM up further, so this needs to undershoot 165 WPM on its own to leave
# room. 1.0 disables it. Measured on this voice/reference, after both trim and gap-tightening:
# 0.92x -> ~165.5 WPM (over target); 0.90x -> see PROGRESS.md for the re-measured value.
import os as _os
TEMPO = float(_os.environ.get("TTS_ATEMPO", "0.90"))


def log(message: str) -> None:
    print(f"[chatterbox_tts] {message}", file=sys.stderr, flush=True)


def trim_silence(clip, sr: int, threshold: float = TRIM_THRESHOLD, margin: float = TRIM_MARGIN_SECONDS):
    import numpy as np
    mag = np.abs(clip)
    peak = mag.max() if mag.size else 0.0
    if peak <= 0:
        return clip
    loud = mag > (peak * threshold)
    if not loud.any():
        return clip
    idx = np.nonzero(loud)[0]
    margin_samples = int(margin * sr)
    start = max(0, idx[0] - margin_samples)
    end = min(len(clip), idx[-1] + margin_samples)
    return clip[start:end]


def main() -> int:
    if len(sys.argv) < 2:
        log("usage: chatterbox_tts.py <job.json>")
        return 2

    job_path = Path(sys.argv[1])
    job = json.loads(job_path.read_text(encoding="utf-8"))

    segments = job.get("segments") or []
    if not segments:
        log("no narration segments in job")
        return 1

    output_path = Path(job["output_path"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    reference_audio = (job.get("reference_audio") or "").strip()
    reference_path = Path(reference_audio) if reference_audio else DEFAULT_REFERENCE
    if not reference_path.exists():
        log(f"reference voice not found: {reference_path}")
        return 1

    exaggeration = float(job.get("exaggeration", 0.4))
    cfg_weight = float(job.get("cfg_weight", 0.5))
    temperature = float(job.get("temperature", 0.8))
    seed = int(job.get("seed", 42))

    import numpy as np
    import soundfile as sf
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    log(f"device={device}, reference={reference_path}, tempo={TEMPO}")

    t0 = time.time()
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    log(f"model loaded in {time.time() - t0:.1f}s")

    pad = np.zeros(int(SILENCE_PAD_SECONDS * model.sr), dtype=np.float32)
    clips: list[np.ndarray] = []
    # (beat_id, text, start_seconds, end_seconds) at the pre-tempo sample rate/timeline.
    raw_segments: list[dict] = []
    cursor_samples = 0

    for index, segment in enumerate(segments):
        text = (segment.get("text") or "").strip()
        if not text:
            continue
        torch.manual_seed(seed + index)
        t1 = time.time()
        wav = model.generate(
            text,
            language_id="hi",
            audio_prompt_path=str(reference_path),
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
            temperature=temperature,
        )
        clip = trim_silence(wav.squeeze(0).detach().cpu().numpy().astype(np.float32), model.sr)
        clips.append(clip)
        raw_segments.append({
            "beat_id": segment.get("beat_id", str(index)),
            "text": text,
            "start_seconds": cursor_samples / model.sr,
            "end_seconds": (cursor_samples + len(clip)) / model.sr,
        })
        cursor_samples += len(clip)
        if index < len(segments) - 1:
            clips.append(pad)
            cursor_samples += len(pad)
        log(f"segment {segment.get('beat_id', index)}: {len(clip) / model.sr:.2f}s in {time.time() - t1:.1f}s")

    if not clips:
        log("no audio generated")
        return 1

    full = np.concatenate(clips)
    pre_tempo_path = output_path if TEMPO == 1.0 else output_path.with_suffix(".pretempo.wav")
    sf.write(str(pre_tempo_path), full, model.sr)

    if TEMPO != 1.0:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(pre_tempo_path), "-filter:a", f"atempo={TEMPO}", str(output_path)],
            capture_output=True, text=True,
        )
        pre_tempo_path.unlink(missing_ok=True)
        if result.returncode != 0 or not output_path.exists():
            log(f"ffmpeg atempo failed ({result.returncode}): {result.stderr.strip()[-500:]}")
            return 1
        for seg in raw_segments:
            seg["start_seconds"] = round(seg["start_seconds"] / TEMPO, 3)
            seg["end_seconds"] = round(seg["end_seconds"] / TEMPO, 3)

    total_words = sum(len(s["text"].split()) for s in raw_segments)
    final_duration = (cursor_samples / model.sr) / TEMPO
    wpm = total_words / (final_duration / 60) if final_duration > 0 else 0
    log(f"wrote {output_path} ({final_duration:.2f}s total, {total_words} words, ~{wpm:.0f} WPM)")

    segments_sidecar = output_path.with_name(output_path.name + ".segments.json")
    segments_sidecar.write_text(json.dumps({"segments": raw_segments, "duration_seconds": final_duration}, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"segment timing: {segments_sidecar}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
