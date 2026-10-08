"""Which video platform a meeting link belongs to, judged by its host name only."""

from urllib.parse import urlsplit

from app.models.enums import Platform

# Suffix match so subdomains (us02web.zoom.us) count but look-alikes (notzoom.us) do not.
_HOSTS: tuple[tuple[str, Platform], ...] = (
    ("zoom.us", Platform.ZOOM),
    ("meet.google.com", Platform.MEET),
    ("teams.microsoft.com", Platform.TEAMS),
    ("teams.live.com", Platform.TEAMS),
)


def detect_platform(url: str) -> Platform:
    host = (urlsplit(url.strip()).hostname or "").lower().rstrip(".")
    for domain, platform in _HOSTS:
        if host == domain or host.endswith("." + domain):
            return platform
    return Platform.OTHER
