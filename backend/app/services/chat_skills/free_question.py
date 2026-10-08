from app.ai.interfaces import QuestionAnswerer
from app.ai.types import Passage
from app.db.unit_of_work import UnitOfWork
from app.schemas.chat import ChatSkillId
from app.services.ask import grounded_citations, meeting_passages, search_passages
from app.services.chat_skills.base import ChatSkill, PreparedReply, SkillReply, SkillRequest, Source
from app.services.chat_skills.compose import text_reply

NO_ANSWER_MEETING = "I couldn't find anything about that in this meeting."
NO_ANSWER_MEETINGS = (
    "I couldn't find anything about that in your meetings. Try different words, "
    "or @-mention the meeting you have in mind."
)


class FreeQuestionSkill(ChatSkill):
    """Any other question: transcript passages (the @-mentioned meeting's lines, or search
    hits across meetings) answered by the AI with citations to the lines it used."""

    id = ChatSkillId.ASK
    label = "Ask about your meetings"
    description = "Answers a question from your meeting transcripts, citing the moments used."
    icon = "message-circle-question"

    def __init__(self, answerer: QuestionAnswerer) -> None:
        self.answerer = answerer

    def prepare(self, uow: UnitOfWork, request: SkillRequest) -> PreparedReply:
        if request.meeting_id is not None:
            passages = meeting_passages(uow, request.meeting_id)
            empty = NO_ANSWER_MEETING
        else:
            passages = search_passages(uow, request.question)
            empty = NO_ANSWER_MEETINGS
        if not passages:
            # Nothing to ground an answer in: no AI call, no rate-limit quota spent.
            return PreparedReply.ready(text_reply(empty))
        question = request.question
        return PreparedReply(finish=lambda: self._answer(question, passages), uses_ai=True)

    def _answer(self, question: str, passages: list[Passage]) -> SkillReply:
        answer = self.answerer.answer(question, passages)
        sources = [
            Source(c.meeting_id, c.meeting_title, c.segment_id, c.start_ms, c.quote)
            for c in grounded_citations(answer, passages)
        ]
        return SkillReply(answer.text, sources, provider=answer.provider, model=answer.model)
