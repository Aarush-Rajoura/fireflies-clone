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

export type Channel = Schemas["ChannelRead"];
export type SearchHit = Schemas["SearchHit"];
/** Query parameters of GET /api/v1/search. */
export type SearchParams = operations["search"]["parameters"]["query"];

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
