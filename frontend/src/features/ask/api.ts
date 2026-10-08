import { unwrap, type AskResponse } from "@/lib/api";
import { api } from "@/lib/api/client";

/** One meeting's transcript, or search hits across meetings (all of them when `meetingIds` is absent). */
export type AskScope = { meetingId: number } | { meetingIds?: readonly number[] };

export function askMeeting(meetingId: number, question: string): Promise<AskResponse> {
  return unwrap(
    api.POST("/api/v1/meetings/{meeting_id}/ask", {
      params: { path: { meeting_id: meetingId } },
      body: { question },
    }),
  );
}

export function askAcrossMeetings(
  question: string,
  meetingIds?: readonly number[],
): Promise<AskResponse> {
  return unwrap(
    api.POST("/api/v1/search/ask", {
      body: { question, ...(meetingIds ? { meeting_ids: [...meetingIds] } : {}) },
    }),
  );
}

export function ask(scope: AskScope, question: string): Promise<AskResponse> {
  return "meetingId" in scope
    ? askMeeting(scope.meetingId, question)
    : askAcrossMeetings(question, scope.meetingIds);
}
