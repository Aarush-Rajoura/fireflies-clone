import pytest

from app.models.enums import Platform
from app.services.platforms import detect_platform


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://zoom.us/j/123", Platform.ZOOM),
        ("https://us02web.zoom.us/j/123?pwd=x", Platform.ZOOM),
        ("https://meet.google.com/abc-defg-hij", Platform.MEET),
        ("HTTPS://MEET.GOOGLE.COM/abc", Platform.MEET),
        ("https://teams.microsoft.com/l/meetup-join/1", Platform.TEAMS),
        ("https://teams.live.com/meet/1", Platform.TEAMS),
        ("https://whereby.com/room", Platform.OTHER),
        # Look-alike hosts and paths must not count.
        ("https://notzoom.us/j/1", Platform.OTHER),
        ("https://zoom.us.evil.example/j/1", Platform.OTHER),
        ("https://example.com/meet.google.com", Platform.OTHER),
        ("not a url", Platform.OTHER),
    ],
)
def test_detect_platform_uses_the_host_only(url: str, expected: Platform) -> None:
    assert detect_platform(url) == expected
