"""Generates the placeholder recording for the demo: a quiet swelling tone, not speech.

The file is generated (never committed) so it can be as long as the longest seeded
meeting with media; click-to-seek anywhere in that transcript then lands inside it.
"""

import math
import random
import wave
from pathlib import Path

SAMPLE_FILENAME = "sample-meeting.wav"
SAMPLE_RATE = 8_000
TAIL_MS = 5_000  # slack after the last transcript line
# 220 Hz completes whole cycles in 5 s, so one block can be repeated without a click.
_BLOCK_SECONDS = 5


def _block() -> bytes:
    noise = random.Random(0)  # deterministic: the same bytes on every machine
    frames = bytearray()
    for n in range(SAMPLE_RATE * _BLOCK_SECONDS):
        t = n / SAMPLE_RATE
        # Slow amplitude swell so the player's progress is audible rather than a flat beep.
        envelope = 0.5 + 0.5 * math.sin(2 * math.pi * t / _BLOCK_SECONDS)
        value = 0.08 * envelope * math.sin(2 * math.pi * 220 * t) + 0.01 * noise.uniform(-1, 1)
        frames.append(128 + int(value * 127))
    return bytes(frames)


def duration_ms(path: Path) -> int:
    with wave.open(str(path), "rb") as audio:
        return audio.getnframes() * 1000 // audio.getframerate()


def write_sample(path: Path, min_duration_ms: int) -> None:
    """Write a WAV (8 kHz, 8-bit mono) at least `min_duration_ms` + TAIL_MS long."""
    blocks = math.ceil((min_duration_ms + TAIL_MS) / (_BLOCK_SECONDS * 1000))
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(1)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(_block() * max(blocks, 1))


def ensure_sample(media_dir: Path, min_duration_ms: int) -> Path:
    """Create the sample (or replace one that is too short); idempotent otherwise."""
    path = media_dir / SAMPLE_FILENAME
    try:
        long_enough = duration_ms(path) >= min_duration_ms + TAIL_MS
    except (FileNotFoundError, wave.Error, EOFError):
        long_enough = False
    if not long_enough:
        write_sample(path, min_duration_ms)
    return path
