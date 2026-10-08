import {
  unwrap,
  type MeetingDetail,
  type Page,
  type Tag,
  type TagCreate,
  type TagUpdate,
} from "@/lib/api";
import { api } from "@/lib/api/client";

const tagPath = (id: number) => ({ params: { path: { tag_id: id } } });

/** Tags are a short, user-made vocabulary; one full page covers it. */
export function listTags(signal?: AbortSignal): Promise<Page<Tag>> {
  return unwrap(api.GET("/api/v1/tags", { params: { query: { page_size: 100 } }, signal }));
}

/** 409 TAG_EXISTS when the name matches an existing tag ignoring case. */
export function createTag(body: TagCreate): Promise<Tag> {
  return unwrap(api.POST("/api/v1/tags", { body }));
}

export function updateTag(id: number, body: TagUpdate): Promise<Tag> {
  return unwrap(api.PATCH("/api/v1/tags/{tag_id}", { ...tagPath(id), body }));
}

export function deleteTag(id: number): Promise<void> {
  return unwrap(api.DELETE("/api/v1/tags/{tag_id}", tagPath(id))).then(() => undefined);
}

/** Replaces the meeting's whole tag set. */
export function setMeetingTags(meetingId: number, tagIds: number[]): Promise<MeetingDetail> {
  return unwrap(
    api.PUT("/api/v1/meetings/{meeting_id}/tags", {
      params: { path: { meeting_id: meetingId } },
      body: { tag_ids: tagIds },
    }),
  );
}
