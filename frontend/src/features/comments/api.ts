import {
  fetchAllPages,
  unwrap,
  type CommentCreate,
  type CommentUpdate,
  type MeetingComment,
} from "@/lib/api";
import { api } from "@/lib/api/client";

/** Every comment on a meeting, oldest first: a thread is shown whole. */
export function fetchComments(meetingId: number, signal?: AbortSignal): Promise<MeetingComment[]> {
  return fetchAllPages((page, page_size) =>
    unwrap(
      api.GET("/api/v1/meetings/{meeting_id}/comments", {
        params: { path: { meeting_id: meetingId }, query: { page, page_size } },
        signal,
      }),
    ),
  );
}

export function createComment(meetingId: number, body: CommentCreate): Promise<MeetingComment> {
  return unwrap(
    api.POST("/api/v1/meetings/{meeting_id}/comments", {
      params: { path: { meeting_id: meetingId } },
      body,
    }),
  );
}

export function updateComment(id: number, body: CommentUpdate): Promise<MeetingComment> {
  return unwrap(
    api.PATCH("/api/v1/comments/{comment_id}", { params: { path: { comment_id: id } }, body }),
  );
}

export function deleteComment(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/comments/{comment_id}", { params: { path: { comment_id: id } } }),
  ) as Promise<void>;
}
