import {
  fetchAllPages,
  unwrap,
  type Highlight,
  type HighlightCreate,
  type HighlightUpdate,
} from "@/lib/api";
import { api } from "@/lib/api/client";

/** Every highlight of a meeting, in transcript order. */
export function fetchHighlights(meetingId: number, signal?: AbortSignal): Promise<Highlight[]> {
  return fetchAllPages((page, page_size) =>
    unwrap(
      api.GET("/api/v1/meetings/{meeting_id}/highlights", {
        params: { path: { meeting_id: meetingId }, query: { page, page_size } },
        signal,
      }),
    ),
  );
}

export function createHighlight(meetingId: number, body: HighlightCreate): Promise<Highlight> {
  return unwrap(
    api.POST("/api/v1/meetings/{meeting_id}/highlights", {
      params: { path: { meeting_id: meetingId } },
      body,
    }),
  );
}

export function updateHighlight(id: number, body: HighlightUpdate): Promise<Highlight> {
  return unwrap(
    api.PATCH("/api/v1/highlights/{highlight_id}", {
      params: { path: { highlight_id: id } },
      body,
    }),
  );
}

export function deleteHighlight(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/highlights/{highlight_id}", { params: { path: { highlight_id: id } } }),
  ) as Promise<void>;
}
