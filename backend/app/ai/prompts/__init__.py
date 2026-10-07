"""Versioned prompt files.

Each `<name>.md` starts with a `version: N` line. The version is part of the
response-cache key, so bumping it after an edit invalidates exactly the
results that prompt produced.
"""

import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path

_DIR = Path(__file__).resolve().parent
_VERSION = re.compile(r"\A\s*version:\s*(\d+)\s*\n")


@dataclass(frozen=True)
class Prompt:
    name: str
    version: int
    text: str


@cache
def load_prompt(name: str) -> Prompt:
    raw = (_DIR / f"{name}.md").read_text(encoding="utf-8")
    match = _VERSION.match(raw)
    if match is None:
        raise ValueError(f"Prompt {name!r} must start with a 'version: N' line")
    return Prompt(name=name, version=int(match[1]), text=raw[match.end() :].strip())
