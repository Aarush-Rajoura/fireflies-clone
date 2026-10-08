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

/** Soft delete: the backend keeps the row, so restore is lossless. */
export function deleteMeeting(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/meetings/{meeting_id}", { params: { path: { meeting_id: id } } }),
  ) as Promise<void>;
}

export function restoreMeeting(id: number): Promise<MeetingDetail> {
  return unwrap(
    api.POST("/api/v1/meetings/{meeting_id}/restore", { params: { path: { meeting_id: id } } }),
  );
}

/** `null` takes the meeting out of every channel. */
export function moveMeetingToChannel(id: number, channelId: number | null): Promise<MeetingDetail> {
  return unwrap(
    api.PATCH("/api/v1/meetings/{meeting_id}", {
      params: { path: { meeting_id: id } },
      body: { channel_id: channelId },
    }),
  );
}
