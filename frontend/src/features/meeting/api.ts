import {
  unwrap,
  type Channel,
  type MeetingDetail,
  type MeetingUpdate,
  type Page,
  type User,
} from "@/lib/api";
import { api } from "@/lib/api/client";

const path = (id: number) => ({ params: { path: { meeting_id: id } } });

export function getMeeting(id: number, signal?: AbortSignal): Promise<MeetingDetail> {
  return unwrap(api.GET("/api/v1/meetings/{meeting_id}", { ...path(id), signal }));
}

export function patchMeeting(id: number, body: MeetingUpdate): Promise<MeetingDetail> {
  return unwrap(api.PATCH("/api/v1/meetings/{meeting_id}", { ...path(id), body }));
}

export function deleteMeeting(id: number): Promise<void> {
  return unwrap(api.DELETE("/api/v1/meetings/{meeting_id}", path(id))).then(() => undefined);
}

export function restoreMeeting(id: number): Promise<MeetingDetail> {
  return unwrap(api.POST("/api/v1/meetings/{meeting_id}/restore", path(id)));
}

export function getChannels(signal?: AbortSignal): Promise<Page<Channel>> {
  return unwrap(api.GET("/api/v1/channels", { params: { query: { page_size: 100 } }, signal }));
}

export function getUsers(signal?: AbortSignal): Promise<Page<User>> {
  return unwrap(api.GET("/api/v1/users", { params: { query: { page_size: 100 } }, signal }));
}

/** The stream the player reads; same origin, proxied to the backend like every API call. */
export function meetingMediaUrl(id: number): string {
  return `/api/v1/meetings/${id}/media`;
}
