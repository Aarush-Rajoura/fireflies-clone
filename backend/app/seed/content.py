"""Reads the seed JSON into typed structures; no database access."""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.seed.timing import TimedLine, time_lines

DATA_DIR = Path(__file__).parent / "data"


@dataclass(frozen=True)
class Person:
    key: str
    name: str
    email: str
    title: str


@dataclass(frozen=True)
class SeedActionItem:
    text: str
    assignee: str | None
    due_offset_days: int | None
    completed: bool
    at_line: int


@dataclass(frozen=True)
class SeedMeeting:
    key: str
    title: str
    description: str | None
    day_offset: int
    time: str
    host: str
    participants: list[str]
    channel: str | None
    has_media: bool
    lines: list[TimedLine]
    overview: str
    outline: list[tuple[str, int]]
    notes: list[tuple[str, list[str]]]
    keywords: list[tuple[str, float]]
    action_items: list[SeedActionItem]
    meeting_url: str | None = None
    platform: str | None = None


def load_cast() -> list[Person]:
    rows: list[dict[str, str]] = json.loads((DATA_DIR / "cast.json").read_text("utf-8"))
    return [Person(r["key"], r["name"], r["email"], r["title"]) for r in rows]


def load_past_meetings() -> list[SeedMeeting]:
    files = sorted((DATA_DIR / "meetings").glob("*.json"))
    return [_past(json.loads(f.read_text("utf-8"))) for f in files]


def load_upcoming() -> list[SeedMeeting]:
    rows: list[dict[str, Any]] = json.loads((DATA_DIR / "upcoming.json").read_text("utf-8"))
    return [
        SeedMeeting(
            key=r["key"], title=r["title"], description=None, day_offset=r["day_offset"],
            time=r["time"], host=r["host"], participants=r["participants"], channel=None,
            has_media=False, lines=[], overview="", outline=[], notes=[], keywords=[],
            action_items=[], meeting_url=r["meeting_url"], platform=r["platform"],
        )
        for r in rows
    ]  # fmt: skip


def _past(raw: dict[str, Any]) -> SeedMeeting:
    summary = raw["summary"]
    return SeedMeeting(
        key=raw["key"],
        title=raw["title"],
        description=raw.get("description"),
        day_offset=raw["day_offset"],
        time=raw["time"],
        host=raw["host"],
        participants=raw["participants"],
        channel=raw.get("channel"),
        has_media=raw["has_media"],
        lines=time_lines([(t["speaker"], t["text"], t.get("pause_ms")) for t in raw["transcript"]]),
        overview=summary["overview"],
        outline=[(o["title"], o["at_line"]) for o in summary["outline"]],
        notes=[(n["title"], n["bullets"]) for n in summary["notes"]],
        keywords=[(k["term"], k["weight"]) for k in summary["keywords"]],
        action_items=[
            SeedActionItem(
                a["text"], a.get("assignee"), a.get("due_offset_days"),
                a["status"] == "completed", a["at_line"],
            )
            for a in raw["action_items"]
        ],
    )  # fmt: skip
