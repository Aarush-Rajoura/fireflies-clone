"""Download filenames: a whitelist slug, so a title can never smuggle a path or a quote."""

import re
import unicodedata
from datetime import date

MAX_FILENAME = 100
_FALLBACK = "meeting"


def slugify(title: str) -> str:
    # NFKD + ASCII keeps accented letters' base form and drops emoji entirely.
    value = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or _FALLBACK


def export_filename(title: str, day: date, extension: str) -> str:
    suffix = f"-{day.isoformat()}.{extension}"
    slug = slugify(title)[: MAX_FILENAME - len(suffix)].rstrip("-")
    return f"{slug or _FALLBACK}{suffix}"
