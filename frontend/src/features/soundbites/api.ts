import { fetchAllPages, unwrap, type Soundbite, type SoundbiteCreate } from "@/lib/api";
import { api } from "@/lib/api/client";

/** Every soundbite of a meeting, in recording order. */
export function fetchSoundbites(meetingId: number, signal?: AbortSignal): Promise<Soundbite[]> {
  return fetchAllPages((page, page_size) =>
    unwrap(
      api.GET("/api/v1/meetings/{meeting_id}/soundbites", {
        params: { path: { meeting_id: meetingId }, query: { page, page_size } },
        signal,
      }),
    ),
  );
}

export function createSoundbite(meetingId: number, body: SoundbiteCreate): Promise<Soundbite> {
  return unwrap(
    api.POST("/api/v1/meetings/{meeting_id}/soundbites", {
      params: { path: { meeting_id: meetingId } },
      body,
    }),
  );
}

export function deleteSoundbite(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/soundbites/{soundbite_id}", { params: { path: { soundbite_id: id } } }),
  ) as Promise<void>;
}
