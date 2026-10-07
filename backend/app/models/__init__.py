"""Importing this package registers every model on Base.metadata."""

from app.models.action_item import ActionItem
from app.models.annotation import Comment, Highlight, Soundbite
from app.models.channel import Channel
from app.models.meeting import Meeting
from app.models.participant import Participant
from app.models.summary import Keyword, Summary, SummarySection
from app.models.tag import MeetingTag, Tag
from app.models.transcript import Speaker, TranscriptSegment
from app.models.user import User

__all__ = [
    "ActionItem", "Channel", "Comment", "Highlight", "Keyword", "Meeting", "MeetingTag",
    "Participant", "Soundbite", "Speaker", "Summary", "SummarySection", "Tag",
    "TranscriptSegment", "User",
]  # fmt: skip
