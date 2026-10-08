import type { MeetingListParams } from "./types";

/*
 * Every TanStack Query key in the app comes from here, so invalidation can
 * target a whole family (`qk.meetings.all`) without string-matching.
 * Keys are hierarchical: everything about meeting 7 starts with ['meetings', 7].
 */
export const qk = {
  me: () => ["me"] as const,
  meetings: {
    all: ["meetings"] as const,
    lists: () => ["meetings", "list"] as const,
    list: (filters: MeetingListParams = {}) => ["meetings", "list", filters] as const,
    detail: (id: number) => ["meetings", id] as const,
  },
  transcript: (id: number) => ["meetings", id, "transcript"] as const,
  summary: (id: number) => ["meetings", id, "summary"] as const,
  actionItems: (id: number) => ["meetings", id, "action-items"] as const,
  channels: () => ["channels"] as const,
  users: () => ["users"] as const,
  search: (q: string) => ["search", q] as const,
};
