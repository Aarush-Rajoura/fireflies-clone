"""String enums shared by models; stored as VARCHAR + CHECK, never native DB enums."""

from enum import StrEnum


class MeetingSource(StrEnum):
    SEED = "seed"
    UPLOAD = "upload"
    PASTE = "paste"
    MANUAL = "manual"
    CAPTURE = "capture"
    CALENDAR = "calendar"


class MediaType(StrEnum):
    AUDIO = "audio"
    VIDEO = "video"
    NONE = "none"


class MeetingStatus(StrEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    PROCESSING = "processing"
    COMPLETED = "completed"


class Platform(StrEnum):
    ZOOM = "zoom"
    MEET = "meet"
    TEAMS = "teams"
    OTHER = "other"


class ParticipantRole(StrEnum):
    HOST = "host"
    ATTENDEE = "attendee"


class SectionKind(StrEnum):
    OUTLINE = "outline"
    NOTES = "notes"


class ActionItemStatus(StrEnum):
    OPEN = "open"
    COMPLETED = "completed"


class ActionItemSource(StrEnum):
    AI = "ai"
    MANUAL = "manual"


class JoinPreference(StrEnum):
    OWNED = "owned"
    ALL = "all"
    TEAM = "team"
    INVITED = "invited"


class RecapPreference(StrEnum):
    ME = "me"
    EVERYONE = "everyone"
    TEAM = "team"


class CalendarProvider(StrEnum):
    GOOGLE = "google"
    OUTLOOK = "outlook"


class NotificationKind(StrEnum):
    MEETING_CREATED = "meeting_created"
    MEETING_CAPTURED = "meeting_captured"
    CALENDAR_CONNECTED = "calendar_connected"
    SUMMARY_REGENERATED = "summary_regenerated"
    ACTION_ITEM_ASSIGNED = "action_item_assigned"
    INVITE_ACCEPTED = "invite_accepted"
