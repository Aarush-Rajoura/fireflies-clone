"""AskFred chat threads: the HTTP contract and the transaction discipline of ChatService."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.factory import get_question_answerer
from app.ai.mock import MockProvider
from app.models import ChatCitation, ChatMessage, ChatThread
from app.schemas.chat import ChatMessageCreate, ChatSkillId
from app.services.chat_skills import default_router
from app.services.chats import ChatService, thread_title
from tests import factories as f
from tests.ai_stubs import StubAnswerer
from tests.service_helpers import seeded

V1 = "/api/v1"


def _meeting(api: TestClient, title: str = "Launch planning") -> tuple[int, list[int]]:
    body = {
        "title": title,
        "segments": [
            {"speaker": "Ann", "start_ms": 0, "end_ms": 900, "text": "Hello team"},
            {"speaker": "Bob", "start_ms": 1000, "end_ms": 1900, "text": "Launch date is Friday"},
        ],
    }
    mid = int(api.post(f"{V1}/meetings", json=body).json()["id"])
    segs = [s["id"] for s in api.get(f"{V1}/meetings/{mid}/transcript").json()["segments"]]
    return mid, segs


def _count(api_app: FastAPI, model: type) -> int:
    with api_app.state.session_factory() as db:
        return int(db.scalar(select(func.count()).select_from(model)) or 0)


def test_start_a_chat_then_follow_up(api: TestClient) -> None:
    mid, segs = _meeting(api)
    r = api.post(f"{V1}/chats", json={"question": "When is the launch date?"})
    assert r.status_code == 201, r.text
    exchange = r.json()
    assert set(exchange) == {"thread", "user_message", "assistant_message"}
    thread = exchange["thread"]
    assert thread["title"] == "When is the launch date?" and thread["meeting_id"] is None
    assert exchange["user_message"]["role"] == "user"
    answer = exchange["assistant_message"]
    assert answer["role"] == "assistant" and answer["skill"] == "ask"
    assert answer["citations"], answer
    cite = answer["citations"][0]
    assert cite["meeting_id"] == mid and cite["segment_id"] == segs[1]
    assert cite["start_ms"] == 1000 and cite["meeting_title"] == "Launch planning"

    follow = api.post(
        f"{V1}/chats/{thread['id']}/messages",
        json={"question": "summarize", "meeting_id": mid},
    )
    assert follow.status_code == 201, follow.text
    assert follow.json()["assistant_message"]["skill"] == "summarize"
    assert follow.json()["thread"]["meeting_id"] == mid

    detail = api.get(f"{V1}/chats/{thread['id']}").json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant"] * 2
    assert detail["messages"][1]["citations"][0]["segment_id"] == segs[1]
    paged = api.get(f"{V1}/chats/{thread['id']}/messages", params={"page_size": 3}).json()
    assert paged["total"] == 4 and len(paged["items"]) == 3 and paged["has_next"]


def test_list_is_newest_first_and_searchable(api: TestClient) -> None:
    _meeting(api)
    first = api.post(f"{V1}/chats", json={"question": "Launch date?"}).json()["thread"]
    second = api.post(f"{V1}/chats", json={"question": "/digest"}).json()["thread"]
    assert second["title"] == "Prepare weekly digest, based on my meetings"
    listed = api.get(f"{V1}/chats").json()
    assert [t["id"] for t in listed["items"]] == [second["id"], first["id"]]
    assert listed["total"] == 2 and listed["page"] == 1
    # A follow-up moves the thread back to the top.
    api.post(f"{V1}/chats/{first['id']}/messages", json={"question": "and the time?"})
    assert api.get(f"{V1}/chats").json()["items"][0]["id"] == first["id"]
    hits = api.get(f"{V1}/chats", params={"q": "DIGEST"}).json()
    assert [t["id"] for t in hits["items"]] == [second["id"]]
    # Message text is searched too, and LIKE wildcards are literal.
    assert api.get(f"{V1}/chats", params={"q": "the time"}).json()["total"] == 1
    assert api.get(f"{V1}/chats", params={"q": "%"}).json()["total"] == 0


def test_validation_and_missing_resources(api: TestClient) -> None:
    for bad in (
        {"question": ""},
        {"question": "   "},
        {},
        {"question": "x" * 2001},
        {"question": "hi", "skill": "nope"},
        {"question": "hi", "extra": 1},
    ):
        assert api.post(f"{V1}/chats", json=bad).status_code == 422, bad
    assert api.post(f"{V1}/chats", json={"question": "q", "meeting_id": 999}).status_code == 404
    assert api.get(f"{V1}/chats/999").status_code == 404
    assert api.get(f"{V1}/chats/999").json()["error"]["code"] == "CHAT_NOT_FOUND"
    assert api.post(f"{V1}/chats/999/messages", json={"question": "q"}).status_code == 404
    assert api.delete(f"{V1}/chats/999").status_code == 404
    assert _count_threads(api) == 0


def _count_threads(api: TestClient) -> int:
    return int(api.get(f"{V1}/chats").json()["total"])


def test_delete_cascades_messages_and_citations(api: TestClient, api_app: FastAPI) -> None:
    _meeting(api)
    keep = api.post(f"{V1}/chats", json={"question": "Launch date?"}).json()["thread"]["id"]
    gone = api.post(f"{V1}/chats", json={"question": "Launch date?"}).json()["thread"]["id"]
    assert _count(api_app, ChatMessage) == 4 and _count(api_app, ChatCitation) >= 2
    r = api.delete(f"{V1}/chats/{gone}")
    assert r.status_code == 204 and r.content == b""
    assert api.get(f"{V1}/chats/{gone}").status_code == 404
    assert _count(api_app, ChatThread) == 1 and _count(api_app, ChatMessage) == 2
    with api_app.state.session_factory() as db:
        left = db.scalars(select(ChatCitation.message_id)).all()
        kept_ids = db.scalars(select(ChatMessage.id).where(ChatMessage.thread_id == keep)).all()
    assert left and set(left) <= set(kept_ids)


def test_skills_catalog(api: TestClient) -> None:
    skills = api.get(f"{V1}/chat-skills").json()
    assert [s["id"] for s in skills] == ["action-items", "summarize", "prepare", "digest"]
    assert skills[0] == {
        "id": "action-items",
        "label": "List my action items & todos for this week",
        "description": skills[0]["description"],
        "icon": "list-checks",
        "command": "/action-items",
    }


def test_only_ai_answers_count_towards_the_rate_limit(api: TestClient, app: FastAPI) -> None:
    _meeting(api)
    app.state.settings.ai_rate_limit = "1/minute"
    app.state.limiter.reset()
    assert api.post(f"{V1}/chats", json={"question": "launch?"}).status_code == 201
    limited = api.post(f"{V1}/chats", json={"question": "launch?"})
    assert limited.status_code == 429 and limited.json()["error"]["code"] == "RATE_LIMITED"
    # Stored-data skills and questions with nothing to answer from never call the AI.
    for body in ({"question": "x", "skill": "digest"}, {"question": "zebra"}):
        assert api.post(f"{V1}/chats", json=body).status_code == 201, body
    assert _count_threads(api) == 3


def test_provider_failure_keeps_the_question(api: TestClient, api_app: FastAPI) -> None:
    _meeting(api)
    api_app.dependency_overrides[get_question_answerer] = lambda: StubAnswerer(fail=True)
    r = api.post(f"{V1}/chats", json={"question": "launch?"})
    assert r.status_code == 503 and r.json()["error"]["code"] == "AI_UNAVAILABLE"
    # The question was committed before the AI ran; only the answer is missing.
    [thread] = api.get(f"{V1}/chats").json()["items"]
    assert thread["title"] == "launch?"
    detail = api.get(f"{V1}/chats/{thread['id']}").json()
    assert [(m["role"], m["content"]) for m in detail["messages"]] == [("user", "launch?")]
    follow = api.post(f"{V1}/chats/{thread['id']}/messages", json={"question": "launch day?"})
    assert follow.status_code == 503
    assert _count(api_app, ChatMessage) == 2
    # Rejected before the AI (validation, unknown meeting): nothing is saved.
    api.post(f"{V1}/chats", json={"question": "q", "meeting_id": 999})
    assert _count(api_app, ChatThread) == 1


def test_citations_of_deleted_meetings_are_hidden(api: TestClient) -> None:
    mid, _ = _meeting(api)
    chat = api.post(f"{V1}/chats", json={"question": "Launch date?"}).json()
    assert chat["assistant_message"]["citations"]
    assert api.delete(f"{V1}/meetings/{mid}").status_code == 204
    detail = api.get(f"{V1}/chats/{chat['thread']['id']}").json()
    assert detail["messages"][1]["citations"] == []
    assert api.post(f"{V1}/meetings/{mid}/restore").status_code == 200
    detail = api.get(f"{V1}/chats/{chat['thread']['id']}").json()
    assert detail["messages"][1]["citations"]


def test_ai_runs_with_no_transaction_open(db_session: Session) -> None:
    uow, user, _ = seeded(db_session)
    meeting = f.make_meeting(db_session, host=user, title="Budget")
    speaker = f.make_speaker(db_session, meeting, "Ann")
    seg = f.make_segment(db_session, meeting, speaker, "The marketing budget doubles")
    db_session.commit()
    in_tx: list[bool] = []
    limiter_in_tx: list[bool] = []
    saved_before_ai: list[list[str]] = []

    def on_call(_: object) -> None:
        in_tx.append(db_session.in_transaction())
        with Session(db_session.get_bind()) as other:
            saved_before_ai.append(list(other.scalars(select(ChatMessage.content))))

    stub = StubAnswerer(cite=[seg.id, 424242], on_call=on_call)
    service = ChatService(uow, default_router(stub))
    exchange = service.start(
        ChatMessageCreate(question="What about the budget?"),
        before_ai=lambda: limiter_in_tx.append(True),
    )
    assert in_tx == [False] and limiter_in_tx == [True]
    # The question was already committed when the AI ran.
    assert saved_before_ai == [["What about the budget?"]]
    # The invented segment id is dropped; the real one is stored with its meeting.
    assert [c.segment_id for c in exchange.assistant_message.citations] == [seg.id]
    assert exchange.assistant_message.provider == "stub"
    stored = service.get(exchange.thread.id)
    assert stored.messages[1].citations[0].meeting_title == "Budget"


def test_deterministic_skills_skip_the_limiter(db_session: Session) -> None:
    uow, _, _ = seeded(db_session)
    counted: list[int] = []
    service = ChatService(uow, default_router(MockProvider()))
    for skill in (ChatSkillId.ACTION_ITEMS, ChatSkillId.DIGEST, ChatSkillId.PREPARE):
        service.start(
            ChatMessageCreate(question="go", skill=skill), before_ai=lambda: counted.append(1)
        )
    assert counted == []


def test_thread_titles() -> None:
    skill = default_router(MockProvider()).fallback
    assert thread_title("  What   did we\ndecide? ", skill) == "What did we decide?"
    long = "Tell me everything we discussed about the pricing for enterprise customers in Q4"
    title = thread_title(long, skill)
    assert len(title) <= 60 and title.endswith("…") and title.startswith("Tell me everything")
    assert thread_title("/digest", skill) == skill.label
    assert thread_title("/summarize the board prep", skill) == "the board prep"
    assert thread_title("summarize", skill, "Board prep") == "summarize · Board prep"
