import {
  unwrap,
  type CalendarConnection,
  type CalendarProvider,
  type FeedItem,
  type MeetingCreate,
  type MeetingDetail,
  type MeetingListItem,
  type MeetingListParams,
  type Page,
} from "@/lib/api";
import { api } from "@/lib/api/client";

export function fetchMeetingList(
  query: MeetingListParams,
  signal?: AbortSignal,
): Promise<Page<MeetingListItem>> {
  return unwrap(api.GET("/api/v1/meetings", { params: { query }, signal }));
}

/** Scheduling and Capture are both `POST /meetings` with a `status`. */
export function createMeeting(body: MeetingCreate): Promise<MeetingDetail> {
  return unwrap(api.POST("/api/v1/meetings", { body }));
}

export function fetchCalendarConnections(signal?: AbortSignal): Promise<Page<CalendarConnection>> {
  return unwrap(api.GET("/api/v1/calendar-connections", { signal }));
}

/** Simulated: imports three sample meetings; repeating it is a harmless no-op (200). */
export function connectCalendar(provider: CalendarProvider): Promise<CalendarConnection> {
  return unwrap(api.POST("/api/v1/calendar-connections", { body: { provider } }));
}

export function fetchFeed(signal?: AbortSignal): Promise<Page<FeedItem>> {
  return unwrap(api.GET("/api/v1/feed", { params: { query: { page_size: 20 } }, signal }));
}
