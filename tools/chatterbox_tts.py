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

SILENCE_PAD_SECONDS = 0.16
TRIM_THRESHOLD = 0.02  # relative to each clip's own peak amplitude
TRIM_MARGIN_SECONDS = 0.03
# Post-generation tempo multiplier (ffmpeg atempo). Trimming Chatterbox's own boundary silence
# (see trim_silence) already pushes the natural pace to ~170 WPM on its own, and the downstream
# Whisper-driven dead-air tightening (tools/whisper_align.py) removes further inter-word gaps —
# both push effective WPM up further, so this needs to undershoot 165 WPM on its own to leave
# room. 1.0 disables it. Measured on this voice/reference, after both trim and gap-tightening:
# 0.92x -> ~165.5 WPM (over target); 0.90x -> see PROGRESS.md for the re-measured value.
import os as _os
TEMPO = float(_os.environ.get("TTS_ATEMPO", "0.84"))


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

    # Storytelling defaults: more expressive, less rushed, and deterministic per beat.
    exaggeration = float(job.get("exaggeration", 0.68))
    cfg_weight = float(job.get("cfg_weight", 0.30))
    temperature = float(job.get("temperature", 0.65))
    tempo = float(job.get("tempo", TEMPO))
    silence_pad_seconds = float(job.get("silence_pad_seconds", SILENCE_PAD_SECONDS))
    seed = int(job.get("seed", 42))
    if not 0.0 <= exaggeration <= 1.5:
        log("exaggeration must be between 0 and 1.5")
        return 2
    if not 0.0 <= cfg_weight <= 1.0:
        log("cfg_weight must be between 0 and 1")
        return 2
    if not 0.1 <= temperature <= 2.0:
        log("temperature must be between 0.1 and 2")
        return 2
    if not 0.5 <= tempo <= 1.1:
        log("tempo must be between 0.5 and 1.1")
        return 2
    if not 0.0 <= silence_pad_seconds <= 0.6:
        log("silence_pad_seconds must be between 0 and 0.6")
        return 2

    import numpy as np
    import soundfile as sf
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    import inspect

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    log(f"device={device}, reference={reference_path}, tempo={tempo}, exaggeration={exaggeration}, cfg_weight={cfg_weight}, temperature={temperature}")

    t0 = time.time()
    # Prefer V3 where this installed package exposes the selector. Some current
    # releases removed t3_model; in that case use their installed default safely.
    loader = ChatterboxMultilingualTTS.from_pretrained
    try:
        if "t3_model" in inspect.signature(loader).parameters:
            model = loader(device=device, t3_model="v3")
        else:
            model = loader(device=device)
    except (TypeError, ValueError) as exc:
        log(f"V3 selector unavailable ({exc}); loading installed default checkpoint")
        model = loader(device=device)
    log(f"model loaded in {time.time() - t0:.1f}s")

    pad = np.zeros(int(silence_pad_seconds * model.sr), dtype=np.float32)
    clips: list[np.ndarray] = []
    # (beat_id, text, start_seconds, end_seconds) at the pre-tempo sample rate/timeline.
    raw_segments: list[dict] = []
    cursor_samples = 0

    group_lines = bool(job.get("group_lines", False))
    groups: list[list[dict]] = []
    current: list[dict] = []
    current_words = 0
    for segment in segments:
        segment_text = (segment.get("text") or "").strip()
        if not segment_text:
            continue
        word_count = max(len(segment_text.split()), 1)
        if group_lines and current and (len(current) >= 3 or current_words + word_count > 28):
            groups.append(current)
            current, current_words = [], 0
        current.append(segment)
        current_words += word_count
    if current:
        groups.append(current)

    for group_index, group in enumerate(groups):
        combined_text = " ".join((segment.get("text") or "").strip() for segment in group)
        torch.manual_seed(seed + group_index)
        t1 = time.time()
        wav = model.generate(
            combined_text,
            language_id="hi",
            audio_prompt_path=str(reference_path),
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
            temperature=temperature,
        )
        clip = trim_silence(wav.squeeze(0).detach().cpu().numpy().astype(np.float32), model.sr)
        chunk_start = cursor_samples / model.sr
        chunk_duration = len(clip) / model.sr
        clips.append(clip)
        weights = [max(len((segment.get("text") or "").split()), 1) for segment in group]
        total_weight = sum(weights) or 1
        cumulative = 0
        # Generation is chunked for natural sentence-to-sentence prosody. These are
        # rough per-line bounds only; WhisperX subsequently aligns each original line.
        for segment, weight in zip(group, weights):
            raw_start = chunk_start + chunk_duration * cumulative / total_weight
            cumulative += weight
            raw_end = chunk_start + chunk_duration * cumulative / total_weight
            raw_segments.append({
                "beat_id": segment.get("beat_id", str(len(raw_segments))),
                "text": (segment.get("text") or "").strip(),
                "start_seconds": round(max(chunk_start, raw_start - 0.18), 3),
                "end_seconds": round(min(chunk_start + chunk_duration, raw_end + 0.18), 3),
            })
        cursor_samples += len(clip)
        if group_index < len(groups) - 1:
            clips.append(pad)
            cursor_samples += len(pad)
        log(f"take {group_index + 1}/{len(groups)} ({len(group)} line(s)): {chunk_duration:.2f}s in {time.time() - t1:.1f}s")
    if not clips:
        log("no audio generated")
        return 1

    full = np.concatenate(clips)
    pre_tempo_path = output_path if tempo == 1.0 else output_path.with_suffix(".pretempo.wav")
    sf.write(str(pre_tempo_path), full, model.sr)

    if tempo != 1.0:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(pre_tempo_path), "-filter:a", f"atempo={tempo}", str(output_path)],
            capture_output=True, text=True,
        )
        pre_tempo_path.unlink(missing_ok=True)
        if result.returncode != 0 or not output_path.exists():
            log(f"ffmpeg atempo failed ({result.returncode}): {result.stderr.strip()[-500:]}")
            return 1
        for seg in raw_segments:
            seg["start_seconds"] = round(seg["start_seconds"] / tempo, 3)
            seg["end_seconds"] = round(seg["end_seconds"] / tempo, 3)

    total_words = sum(len(s["text"].split()) for s in raw_segments)
    final_duration = (cursor_samples / model.sr) / tempo
    wpm = total_words / (final_duration / 60) if final_duration > 0 else 0
    log(f"wrote {output_path} ({final_duration:.2f}s total, {total_words} words, ~{wpm:.0f} WPM)")

    segments_sidecar = output_path.with_name(output_path.name + ".segments.json")
    segments_sidecar.write_text(json.dumps({"segments": raw_segments, "duration_seconds": final_duration}, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"segment timing: {segments_sidecar}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
