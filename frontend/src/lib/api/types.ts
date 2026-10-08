/*
 * Readable names for the generated OpenAPI schemas. Never hand-edit
 * src/types/api.d.ts; regenerate it with `npm run types`.
 */
import type { components, operations } from "@/types/api";

type Schemas = components["schemas"];

export type ErrorResponse = Schemas["ErrorResponse"];

export type User = Schemas["UserRead"];
/** The current user with onboarding answers (GET/PATCH /me). */
export type Me = Schemas["MeRead"];
export type ProfileUpdate = Schemas["ProfileUpdate"];
export type OnboardingInput = Schemas["OnboardingInput"];
export type OnboardingResult = Schemas["OnboardingResult"];
export type JoinPreference = Schemas["JoinPreference"];
export type RecapPreference = Schemas["RecapPreference"];
export type Usage = Schemas["UsageRead"];
export type UserRef = Schemas["UserRef"];

export type MeetingListItem = Schemas["MeetingListItem"];
export type MeetingDetail = Schemas["MeetingDetail"];
export type MeetingCreate = Schemas["MeetingCreate"];
export type MeetingUpdate = Schemas["MeetingUpdate"];
export type MeetingStatus = Schemas["MeetingStatus"];
export type MeetingSort = Schemas["MeetingSort"];
export type Participant = Schemas["ParticipantRead"];
export type Tag = Schemas["TagRead"];
export type TagCreate = Schemas["TagCreate"];
export type TagUpdate = Schemas["TagUpdate"];

export type Transcript = Schemas["TranscriptRead"];
export type Segment = Schemas["SegmentRead"];
export type Speaker = Schemas["SpeakerRead"];
export type SegmentIn = Schemas["SegmentIn"];
export type TranscriptPreview = Schemas["TranscriptPreview"];

export type Summary = Schemas["SummaryRead"];

export type ActionItem = Schemas["ActionItemRead"];
export type ActionItemCreate = Schemas["ActionItemCreate"];
export type ActionItemUpdate = Schemas["ActionItemUpdate"];
export type ActionItemStatus = Schemas["ActionItemStatus"];
export type TaskCreate = Schemas["TaskCreate"];
/** Query parameters of GET /api/v1/action-items (the cross-meeting task list). */
export type TaskListParams = NonNullable<operations["list_tasks"]["parameters"]["query"]>;

// Not `Comment`: that name is the DOM comment-node type.
export type MeetingComment = Schemas["CommentRead"];
export type CommentCreate = Schemas["CommentCreate"];
export type CommentUpdate = Schemas["CommentUpdate"];

export type Highlight = Schemas["HighlightRead"];
export type HighlightCreate = Schemas["HighlightCreate"];
export type HighlightUpdate = Schemas["HighlightUpdate"];
export type HighlightColor = Highlight["color"];

export type Soundbite = Schemas["SoundbiteRead"];
export type SoundbiteCreate = Schemas["SoundbiteCreate"];

export type Channel = Schemas["ChannelRead"];
export type Platform = Schemas["Platform"];

export type CalendarProvider = Schemas["CalendarProvider"];
export type CalendarConnection = Schemas["CalendarConnectionRead"];
export type FeedItem = Schemas["FeedItem"];
export type Notification = Schemas["NotificationRead"];

export type Integration = Schemas["IntegrationRead"];
export type IntegrationCategory = Schemas["IntegrationCategory"];
export type IntegrationCategoryInfo = Schemas["IntegrationCategoryRead"];
/** Query parameters of GET /api/v1/integrations. */
export type IntegrationListParams = NonNullable<
  operations["list_integrations"]["parameters"]["query"]
>;
export type SearchHit = Schemas["SearchHit"];
/** Query parameters of GET /api/v1/search. */
export type SearchParams = operations["search"]["parameters"]["query"];

export type AskResponse = Schemas["AskResponse"];
export type AskCitation = Schemas["AskCitation"];

export type ChatThread = Schemas["ChatThreadRead"];
export type ChatThreadDetail = Schemas["ChatThreadDetail"];
export type ChatMessage = Schemas["ChatMessageRead"];
export type ChatCitation = Schemas["ChatCitationRead"];
export type ChatExchange = Schemas["ChatExchange"];
export type ChatMessageCreate = Schemas["ChatMessageCreate"];
export type ChatSkill = Schemas["ChatSkillRead"];
export type ChatSkillId = Schemas["ChatSkillId"];

/** Export file formats the backend advertises. */
export type ExportFormat = NonNullable<
  NonNullable<operations["export_meeting"]["parameters"]["query"]>["format"]
>;
export type AnalyticsOverview = Schemas["AnalyticsOverview"];
export type AnalyticsRange = Schemas["AnalyticsRange"];
export type TalkTimeShare = Schemas["TalkTimeShare"];
export type KeywordStat = Schemas["KeywordStat"];
export type MeetingSource = Schemas["MeetingSource"];
/** Query parameters of GET /api/v1/analytics/overview. */
export type AnalyticsParams = NonNullable<operations["analytics_overview"]["parameters"]["query"]>;

/** The list envelope every collection endpoint returns. */
export type Page<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
};

/** Query parameters of GET /api/v1/meetings, straight from the contract. */
export type MeetingListParams = NonNullable<operations["list_meetings"]["parameters"]["query"]>;
