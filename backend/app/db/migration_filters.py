"""Alembic autogenerate filter; lives in the package so tests can import it."""

from typing import Any

# FTS5 creates these shadow tables itself; they are not part of our metadata.
_FTS_TABLE = "transcript_fts"
_FTS_SHADOWS = {
    f"{_FTS_TABLE}{s}" for s in ("", "_data", "_idx", "_docsize", "_config", "_content")
}


def include_object(
    obj: Any, name: str | None, type_: str, reflected: bool, compare_to: Any
) -> bool:
    """Hide the FTS5 virtual table so autogenerate never tries to drop it."""
    return not (type_ == "table" and name in _FTS_SHADOWS)
