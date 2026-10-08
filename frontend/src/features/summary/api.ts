import { unwrap, type Summary } from "@/lib/api";
import { api } from "@/lib/api/client";

/** A meeting with no summary yet answers 200 with an empty body (`generated_at: null`). */
export function fetchSummary(meetingId: number, signal?: AbortSignal): Promise<Summary> {
  return unwrap(
    api.GET("/api/v1/meetings/{meeting_id}/summary", {
      params: { path: { meeting_id: meetingId } },
      signal,
    }),
  );
}

export function regenerateSummary(meetingId: number): Promise<Summary> {
  return unwrap(
    api.POST("/api/v1/meetings/{meeting_id}/summary/regenerate", {
      params: { path: { meeting_id: meetingId } },
    }),
  );
}
