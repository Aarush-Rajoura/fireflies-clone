from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.enums import MediaType
from tests import factories as f

V1 = "/api/v1"
VTT = (
    "WEBVTT\n\n00:00.000 --> 00:03.000\n<v Alice>Let's plan the launch\n\n"
    "00:03.000 --> 00:06.000\n<v Bob>I will send the deck\n"
)


def test_full_flow_parse_create_read_complete_delete_restore(api: TestClient) -> None:
    preview = api.post(f"{V1}/transcripts/parse", files={"file": ("m.vtt", VTT)}).json()
    assert preview["speakers"] == ["Alice", "Bob"]

    created = api.post(
        f"{V1}/meetings",
        json={"title": "Launch", "participants": ["Bob"], "segments": preview["segments"]},
    )
    assert created.status_code == 201
    mid = created.json()["id"]

    transcript = api.get(f"{V1}/meetings/{mid}/transcript").json()
    assert len(transcript["segments"]) == 2
    seg = api.patch(
        f"{V1}/segments/{transcript['segments'][0]['id']}", json={"text": "Edited line"}
    ).json()
    assert seg["is_edited"] is True
    spk = api.patch(f"{V1}/speakers/{transcript['speakers'][0]['id']}", json={"name": "Alicia"})
    assert spk.json()["name"] == "Alicia"

    summary = api.get(f"{V1}/meetings/{mid}/summary").json()
    assert summary["overview"].startswith("Overview")
    regenerated = api.post(f"{V1}/meetings/{mid}/summary/regenerate")
    assert regenerated.status_code == 200

    item = api.post(f"{V1}/meetings/{mid}/action-items", json={"text": "Send the deck"})
    assert item.status_code == 201
    done = api.patch(f"{V1}/action-items/{item.json()['id']}", json={"status": "completed"})
    assert done.json()["status"] == "completed" and done.json()["completed_at"]

    assert api.delete(f"{V1}/meetings/{mid}").status_code == 204
    gone = api.get(f"{V1}/meetings/{mid}")
    assert gone.status_code == 410 and gone.json()["error"]["code"] == "MEETING_DELETED"
    assert api.get(f"{V1}/meetings/{mid}/transcript").status_code == 410

    restored = api.post(f"{V1}/meetings/{mid}/restore")
    assert restored.status_code == 200 and restored.json()["id"] == mid
    assert api.get(f"{V1}/meetings/{mid}").status_code == 200


def test_media_supports_range_requests(app: FastAPI, api: TestClient, tmp_path: Path) -> None:
    media_dir: Path = app.state.settings.media_dir
    media_dir.mkdir(parents=True, exist_ok=True)
    (media_dir / "talk.mp3").write_bytes(bytes(range(256)) * 4)
    with app.state.session_factory() as db:
        meeting = f.make_meeting(db, started_at=datetime(2026, 7, 24, tzinfo=UTC))
        meeting.media_url = "/media/talk.mp3"
        meeting.media_type = MediaType.AUDIO
        db.commit()
        mid = meeting.id

    full = api.get(f"{V1}/meetings/{mid}/media")
    assert full.status_code == 200 and len(full.content) == 1024
    assert full.headers["accept-ranges"] == "bytes"

    part = api.get(f"{V1}/meetings/{mid}/media", headers={"Range": "bytes=0-99"})
    assert part.status_code == 206
    assert len(part.content) == 100
    assert part.headers["content-range"] == "bytes 0-99/1024"


def test_media_missing_is_404_envelope(api: TestClient) -> None:
    mid = api.post(f"{V1}/meetings", json={"title": "No audio"}).json()["id"]
    r = api.get(f"{V1}/meetings/{mid}/media")
    assert r.status_code == 404 and r.json()["error"]["code"] == "MEDIA_NOT_FOUND"
