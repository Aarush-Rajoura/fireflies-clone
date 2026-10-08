# Media directory

Recordings are served from here by `GET /api/v1/meetings/{id}/media` (with HTTP Range
support), resolved strictly inside this directory from each meeting's `media_url`.

`sample-meeting.wav` is **generated, not committed**: `python -m app.seed.seed` (including
`--if-empty`) writes it via `app/seed/sample_audio.py` when it is missing or shorter than the
longest seeded meeting with media plus 5 seconds. It is an 8 kHz, 8-bit mono soft tone with
light noise (pure Python `wave`, no ffmpeg), not a real recording; it only gives the player
something to load and seek through for the seeded meetings that have media.

Audio and video files in this directory are git-ignored.
