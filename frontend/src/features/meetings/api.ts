import {
  unwrap,
  type MeetingDetail,
  type MeetingListItem,
  type MeetingListParams,
  type Page,
} from "@/lib/api";
import { api } from "@/lib/api/client";

export function fetchMeetings(
  query: MeetingListParams,
  signal?: AbortSignal,
): Promise<Page<MeetingListItem>> {
  return unwrap(api.GET("/api/v1/meetings", { params: { query }, signal }));
}

export function fetchMeeting(id: number, signal?: AbortSignal): Promise<MeetingDetail> {
  return unwrap(
    api.GET("/api/v1/meetings/{meeting_id}", { params: { path: { meeting_id: id } }, signal }),
  );
}
