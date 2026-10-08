import type { ChatCitation, ChatThread } from "@/lib/api";

export type HistoryGroup = { label: "Today" | "Yesterday" | "Earlier"; threads: ChatThread[] };

function dayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Threads (already newest first) bucketed by the local day they were last active. */
export function groupByDay(threads: ChatThread[], now: Date = new Date()): HistoryGroup[] {
  const today = dayStart(now);
  const yesterday = dayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const groups: HistoryGroup[] = [
    { label: "Today", threads: [] },
    { label: "Yesterday", threads: [] },
    { label: "Earlier", threads: [] },
  ];
  for (const thread of threads) {
    const at = new Date(thread.updated_at).getTime();
    const index = at >= today ? 0 : at >= yesterday ? 1 : 2;
    groups[index]?.threads.push(thread);
  }
  return groups.filter((g) => g.threads.length > 0);
}

/** The meeting page reads `?t=` in seconds; a citation without a moment opens the meeting. */
export function chatCitationHref(c: Pick<ChatCitation, "meeting_id" | "start_ms">): string {
  const base = `/meetings/${c.meeting_id}`;
  return c.start_ms == null ? base : `${base}?t=${c.start_ms / 1000}`;
}
