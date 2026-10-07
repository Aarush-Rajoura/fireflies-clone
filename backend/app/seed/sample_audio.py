"""Generates the placeholder recording for the demo: a quiet swelling tone, not speech."""

import math
import wave
from pathlib import Path

SAMPLE_RATE = 8_000
SECONDS = 40


def write_sample(path: Path) -> None:
    frames = bytearray()
    for n in range(SAMPLE_RATE * SECONDS):
        t = n / SAMPLE_RATE
        # Slow amplitude swell so the player's progress is audible rather than a flat beep.
        envelope = 0.5 + 0.5 * math.sin(2 * math.pi * t / 5)
        value = 0.08 * envelope * math.sin(2 * math.pi * 220 * t)
        frames.append(128 + int(value * 127))
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(1)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(bytes(frames))


if __name__ == "__main__":
    write_sample(Path(__file__).resolve().parents[2] / "media" / "sample-meeting.wav")
