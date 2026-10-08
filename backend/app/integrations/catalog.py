"""Every integration the app can (pretend to) connect to.

Connections are simulated: nothing here talks to a vendor. Keeping the list in
code means a new entry ships with a deploy and needs no migration.
"""

from dataclasses import dataclass
from enum import StrEnum


class IntegrationCategory(StrEnum):
    VIDEO_CONFERENCING = "video-conferencing"
    CALENDAR = "calendar"
    CRM = "crm"
    PROJECT_MANAGEMENT = "project-management"
    NOTES = "notes"
    COLLABORATION = "collaboration"
    ATS = "ats"
    DIALERS = "dialers"
    AUDIO_RECORDING = "audio-recording"
    MCP = "mcp"
    STORAGE = "storage"


# Declaration order is the order clients show the category list in.
CATEGORY_LABELS: dict[IntegrationCategory, str] = {
    IntegrationCategory.AUDIO_RECORDING: "Audio recording",
    IntegrationCategory.ATS: "Applicant tracking system",
    IntegrationCategory.CRM: "CRM",
    IntegrationCategory.MCP: "MCP",
    IntegrationCategory.VIDEO_CONFERENCING: "Video conferencing",
    IntegrationCategory.CALENDAR: "Calendar",
    IntegrationCategory.PROJECT_MANAGEMENT: "Project management",
    IntegrationCategory.NOTES: "Notes",
    IntegrationCategory.COLLABORATION: "Collaboration",
    IntegrationCategory.DIALERS: "Dialers",
    IntegrationCategory.STORAGE: "Storage",
}


@dataclass(frozen=True, slots=True)
class CatalogEntry:
    key: str
    name: str
    vendor: str
    category: IntegrationCategory
    description: str
    featured: bool = False


C = IntegrationCategory
BUILT_IN = "Built-in"

_ENTRIES: tuple[CatalogEntry, ...] = (
    CatalogEntry(
        "zoom", "Zoom", "Zoom", C.VIDEO_CONFERENCING,
        "Have the notetaker join your Zoom calls to record, transcribe and summarise"
        " every conversation without anyone pressing record.",
    ),
    CatalogEntry(
        "google-meet", "Google Meet", "Google", C.VIDEO_CONFERENCING,
        "Capture Google Meet calls automatically and get searchable transcripts,"
        " summaries and action items minutes after the call ends.",
    ),
    CatalogEntry(
        "microsoft-teams", "Microsoft Teams", "Microsoft", C.VIDEO_CONFERENCING,
        "Record and transcribe Microsoft Teams meetings, then share the recap with"
        " everyone who attended.",
    ),
    CatalogEntry(
        "webex", "Webex", "Cisco", C.VIDEO_CONFERENCING,
        "Bring Webex meetings into your notebook with speaker-labelled transcripts"
        " and AI summaries.",
    ),
    CatalogEntry(
        "google-calendar", "Google Calendar", "Google", C.CALENDAR,
        "Sync your Google Calendar so upcoming meetings are joined and recorded"
        " according to your auto-join preferences.",
    ),
    CatalogEntry(
        "outlook-calendar", "Outlook Calendar", "Microsoft", C.CALENDAR,
        "Connect your Outlook calendar to see upcoming meetings and have them"
        " captured automatically.",
    ),
    CatalogEntry(
        "salesforce", "Salesforce", "Salesforce", C.CRM,
        "Log meeting notes, next steps and call recordings against the matching"
        " Salesforce contacts, leads and opportunities.",
        featured=True,
    ),
    CatalogEntry(
        "hubspot", "HubSpot", "HubSpot", C.CRM,
        "Sync meeting summaries and action items to HubSpot contacts and deals so"
        " your pipeline stays current without manual data entry.",
    ),
    CatalogEntry(
        "pipedrive", "Pipedrive", "Pipedrive", C.CRM,
        "Attach call notes and follow-ups to the right Pipedrive deals and people"
        " automatically after each meeting.",
    ),
    CatalogEntry(
        "asana", "Asana", "Asana", C.PROJECT_MANAGEMENT,
        "Turn action items from your meetings into Asana tasks with owners and due"
        " dates, linked back to the moment they were discussed.",
    ),
    CatalogEntry(
        "monday", "monday.com", "monday.com", C.PROJECT_MANAGEMENT,
        "Push meeting action items to monday.com boards so decisions turn into"
        " tracked work straight away.",
    ),
    CatalogEntry(
        "trello", "Trello", "Atlassian", C.PROJECT_MANAGEMENT,
        "Create Trello cards from action items and keep the meeting context in"
        " each card's description.",
    ),
    CatalogEntry(
        "clickup", "ClickUp", "ClickUp", C.PROJECT_MANAGEMENT,
        "Send tasks captured in meetings to ClickUp lists with assignees, so"
        " nothing agreed on a call gets lost.",
    ),
    CatalogEntry(
        "jira", "Jira", "Atlassian", C.PROJECT_MANAGEMENT,
        "File Jira issues from bugs and requests raised in meetings, complete with"
        " a link to the transcript excerpt.",
    ),
    CatalogEntry(
        "linear", "Linear", "Linear", C.PROJECT_MANAGEMENT,
        "Create Linear issues from meeting action items and keep product"
        " discussions connected to the work they produce.",
    ),
    CatalogEntry(
        "notion", "Notion", "Notion", C.NOTES,
        "Save meeting summaries, outlines and action items as Notion pages in the"
        " workspace and database you choose.",
    ),
    CatalogEntry(
        "google-docs", "Google Docs", "Google", C.NOTES,
        "Export each meeting's notes to a Google Doc, formatted and ready to share"
        " with your team.",
    ),
    CatalogEntry(
        "slack", "Slack", "Slack", C.COLLABORATION,
        "Post meeting recaps to Slack channels or DMs and keep everyone in the loop,"
        " including people who could not attend.",
    ),
    CatalogEntry(
        "microsoft-teams-chat", "Microsoft Teams Chat", "Microsoft", C.COLLABORATION,
        "Share summaries and action items to Teams chats and channels as soon as a"
        " meeting has been processed.",
    ),
    CatalogEntry(
        "greenhouse", "Greenhouse", "Greenhouse", C.ATS,
        "Attach interview notes and scorecard-ready summaries to candidate profiles"
        " in Greenhouse.",
    ),
    CatalogEntry(
        "lever", "Lever", "Lever", C.ATS,
        "Sync interview recordings and summaries to Lever opportunities so hiring"
        " teams can review conversations later.",
    ),
    CatalogEntry(
        "aircall", "Aircall", "Aircall", C.DIALERS,
        "Transcribe and summarise Aircall phone calls and keep them searchable"
        " alongside your video meetings.",
    ),
    CatalogEntry(
        "dropbox", "Dropbox", "Dropbox", C.STORAGE,
        "Back up recordings and transcripts to a Dropbox folder of your choice"
        " after every meeting.",
    ),
    CatalogEntry(
        "google-sheets", "Google Sheets", "Google", C.STORAGE,
        "Export meetings, action items and custom fields as rows in a spreadsheet"
        " for reporting and analysis.",
        featured=True,
    ),
    CatalogEntry(
        "meeting-mcp", "Meeting MCP for AI assistants", BUILT_IN, C.MCP,
        "Ask your AI assistant anything about your meetings: surface insights,"
        " track action items and search past calls through an MCP server.",
        featured=True,
    ),
    CatalogEntry(
        "desktop-recorder", "Desktop Recorder", BUILT_IN, C.AUDIO_RECORDING,
        "Record any meeting or call from your computer's audio, even when no bot"
        " can join, and get the same transcript and summary.",
    ),
    CatalogEntry(
        "mobile-recorder", "Mobile Recorder", BUILT_IN, C.AUDIO_RECORDING,
        "Capture in-person conversations on your phone and have them transcribed"
        " and summarised like any other meeting.",
    ),
)  # fmt: skip

# Alphabetical, as the catalogue page lists them.
CATALOG: tuple[CatalogEntry, ...] = tuple(sorted(_ENTRIES, key=lambda e: e.name.lower()))

_BY_KEY = {entry.key: entry for entry in CATALOG}


def find(key: str) -> CatalogEntry | None:
    return _BY_KEY.get(key)
