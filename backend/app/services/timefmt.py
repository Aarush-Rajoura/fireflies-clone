"""Human-readable recording positions; the API itself only ever speaks integer milliseconds."""


def clock(ms: int) -> str:
    """`MM:SS`, or `H:MM:SS` past the hour."""
    hours, rest = divmod(max(ms, 0) // 1000, 3600)
    minutes, seconds = divmod(rest, 60)
    return f"{hours}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"
