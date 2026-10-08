import { unwrap, type Speaker, type Transcript } from "@/lib/api";
import { api } from "@/lib/api/client";

export function getTranscript(meetingId: number, signal?: AbortSignal): Promise<Transcript> {
  return unwrap(
    api.GET("/api/v1/meetings/{meeting_id}/transcript", {
      params: { path: { meeting_id: meetingId } },
      signal,
    }),
  );
}

export function renameSpeaker(speakerId: number, name: string): Promise<Speaker> {
  return unwrap(
    api.PATCH("/api/v1/speakers/{speaker_id}", {
      params: { path: { speaker_id: speakerId } },
      body: { name },
    }),
  );
}
