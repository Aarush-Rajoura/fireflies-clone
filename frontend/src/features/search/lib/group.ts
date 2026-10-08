import type { SearchHit } from "@/lib/api";

export type MeetingHits = {
  meetingId: number;
  title: string;
  hits: SearchHit[];
};

/**
 * Groups flat, relevance-ordered hits by meeting. Meetings appear in the
 * order of their best hit and hits keep their relevance order inside a group,
 * so the ranking the backend computed survives the grouping.
 */
export function groupByMeeting(hits: readonly SearchHit[]): MeetingHits[] {
  const groups = new Map<number, MeetingHits>();
  for (const hit of hits) {
    const group = groups.get(hit.meeting_id);
    if (group) group.hits.push(hit);
    else
      groups.set(hit.meeting_id, {
        meetingId: hit.meeting_id,
        title: hit.meeting_title,
        hits: [hit],
      });
  }
  return [...groups.values()];
}

/**
 * Deep link into the meeting at the hit. The player's `?t=` takes seconds,
 * so milliseconds are converted (fractions kept for an exact seek).
 */
export function hitHref(hit: Pick<SearchHit, "meeting_id" | "start_ms">): string {
  return `/meetings/${hit.meeting_id}?t=${hit.start_ms / 1000}`;
}

export function searchHref(q: string): string {
  return `/search?q=${encodeURIComponent(q.trim())}`;
}
